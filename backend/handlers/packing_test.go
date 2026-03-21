package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// createTestPackingList creates a packing list for a trip and returns its ID
func createTestPackingList(t *testing.T, claims *utils.Claims, tripID int, climate string, autoPopulate bool) int {
	reqBody := models.CreatePackingListRequest{
		TripID:       tripID,
		Destination:  "Hawaii",
		Climate:      climate,
		DurationDays: 7,
		AutoPopulate: autoPopulate,
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/trips/%d/packing-list", tripID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}
	CreatePackingList(c)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	return int(resp["packing_list_id"].(float64))
}

// ── CreatePackingList ─────────────────────────────────────────────────────────

func TestCreatePackingList_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack1@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack1@example.com"}
	tripID := createTestTrip(t, claims, "Hawaii Trip")

	reqBody := models.CreatePackingListRequest{
		TripID:       tripID,
		Destination:  "Hawaii",
		Climate:      "tropical",
		DurationDays: 7,
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/trips/1/packing-list", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	CreatePackingList(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Packing list created successfully", resp["message"])
	assert.NotNil(t, resp["packing_list_id"])
}

func TestCreatePackingList_AutoPopulate(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack2@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack2@example.com"}
	tripID := createTestTrip(t, claims, "Tropical Trip")

	// Create with auto_populate = true
	packingListID := createTestPackingList(t, claims, tripID, "tropical", true)
	assert.Greater(t, packingListID, 0)

	// Now GET the list and verify items were auto-populated
	req := httptest.NewRequest("GET", fmt.Sprintf("/api/trips/%d/packing-list", tripID), nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	GetPackingList(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.PackingListWithItems
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Greater(t, resp.TotalItems, 0)
}

func TestCreatePackingList_DuplicateTripID(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack3@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack3@example.com"}
	tripID := createTestTrip(t, claims, "Trip")

	createTestPackingList(t, claims, tripID, "tropical", false)

	// Try creating again for the same trip
	reqBody := models.CreatePackingListRequest{TripID: tripID, Climate: "tropical", DurationDays: 5}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/trips/1/packing-list", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	CreatePackingList(c)

	assert.Equal(t, http.StatusConflict, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "conflict", resp.Error)
}

func TestCreatePackingList_TripNotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack4@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack4@example.com"}

	reqBody := models.CreatePackingListRequest{TripID: 999, Climate: "tropical", DurationDays: 5}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/trips/999/packing-list", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	CreatePackingList(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ── GetPackingList ────────────────────────────────────────────────────────────

func TestGetPackingList_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack5@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack5@example.com"}
	tripID := createTestTrip(t, claims, "Trip")
	createTestPackingList(t, claims, tripID, "cold", false)

	req := httptest.NewRequest("GET", fmt.Sprintf("/api/trips/%d/packing-list", tripID), nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	GetPackingList(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.PackingListWithItems
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, tripID, resp.TripID)
}

func TestGetPackingList_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack6@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack6@example.com"}

	req := httptest.NewRequest("GET", "/api/trips/999/packing-list", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	GetPackingList(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ── AddPackingItem ────────────────────────────────────────────────────────────

func TestAddPackingItem_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack7@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack7@example.com"}
	tripID := createTestTrip(t, claims, "Trip")
	createTestPackingList(t, claims, tripID, "tropical", false)

	reqBody := models.AddPackingItemRequest{
		ItemName: "Laptop",
		Category: "Electronics",
		Quantity: 1,
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/trips/%d/packing-list/items", tripID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	AddPackingItem(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Item added successfully", resp["message"])
}

func TestAddPackingItem_MissingItemName(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack8@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack8@example.com"}
	tripID := createTestTrip(t, claims, "Trip")
	createTestPackingList(t, claims, tripID, "tropical", false)

	// item_name is required but missing
	reqBody := map[string]interface{}{"category": "Electronics", "quantity": 1}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/trips/1/packing-list/items", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	AddPackingItem(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ── UpdatePackingItem ─────────────────────────────────────────────────────────

func TestUpdatePackingItem_CheckItem(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack9@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack9@example.com"}
	tripID := createTestTrip(t, claims, "Trip")
	createTestPackingList(t, claims, tripID, "tropical", false)

	// Add an item first
	addReq := models.AddPackingItemRequest{ItemName: "Sunscreen", Category: "Personal Care", Quantity: 1}
	body, _ := json.Marshal(addReq)
	req := httptest.NewRequest("POST", "/api/trips/1/packing-list/items", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}
	AddPackingItem(c)

	var addResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &addResp)
	itemID := int(addResp["item_id"].(float64))

	// Now check the item
	isChecked := true
	updateReq := models.UpdatePackingItemRequest{IsChecked: &isChecked}
	body, _ = json.Marshal(updateReq)
	req2 := httptest.NewRequest("PUT", fmt.Sprintf("/api/packing-items/%d", itemID), bytes.NewBuffer(body))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user", claims)
	c2.Params = gin.Params{{Key: "itemId", Value: fmt.Sprintf("%d", itemID)}}

	UpdatePackingItem(c2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var resp map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp)
	assert.Equal(t, "Item updated successfully", resp["message"])
}

func TestUpdatePackingItem_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack10@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack10@example.com"}

	isChecked := true
	updateReq := models.UpdatePackingItemRequest{IsChecked: &isChecked}
	body, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", "/api/packing-items/999", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "itemId", Value: "999"}}

	UpdatePackingItem(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ── DeletePackingItem ─────────────────────────────────────────────────────────

func TestDeletePackingItem_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack11@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack11@example.com"}
	tripID := createTestTrip(t, claims, "Trip")
	createTestPackingList(t, claims, tripID, "tropical", false)

	// Add an item
	addReq := models.AddPackingItemRequest{ItemName: "Hat", Category: "Accessories", Quantity: 1}
	body, _ := json.Marshal(addReq)
	req := httptest.NewRequest("POST", "/api/trips/1/packing-list/items", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}
	AddPackingItem(c)

	var addResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &addResp)
	itemID := int(addResp["item_id"].(float64))

	// Delete it
	req2 := httptest.NewRequest("DELETE", fmt.Sprintf("/api/packing-items/%d", itemID), nil)
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user", claims)
	c2.Params = gin.Params{{Key: "itemId", Value: fmt.Sprintf("%d", itemID)}}

	DeletePackingItem(c2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var resp map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp)
	assert.Equal(t, "Item deleted successfully", resp["message"])
}

// ── DeletePackingList ─────────────────────────────────────────────────────────

func TestDeletePackingList_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack12@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack12@example.com"}
	tripID := createTestTrip(t, claims, "Trip")
	createTestPackingList(t, claims, tripID, "tropical", true)

	req := httptest.NewRequest("DELETE", fmt.Sprintf("/api/trips/%d/packing-list", tripID), nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	DeletePackingList(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Packing list deleted successfully", resp["message"])
}

func TestDeletePackingList_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "pack13@example.com")
	claims := &utils.Claims{UserID: userID, Email: "pack13@example.com"}

	req := httptest.NewRequest("DELETE", "/api/trips/999/packing-list", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	DeletePackingList(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
