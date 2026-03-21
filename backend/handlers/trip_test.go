package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"fmt"

	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// createTestUser registers a user and returns their ID and JWT token
func createTestUser(t *testing.T, email string) (int, string) {
	reqBody := models.RegisterRequest{
		Email:     email,
		Password:  "TestPass123",
		FirstName: "Test",
		LastName:  "User",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	Register(c)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	userID := int(resp["user_id"].(float64))

	token, _, _ := utils.GenerateToken(userID, email)
	return userID, token
}

// createTestTrip creates a trip for a user and returns the trip ID
func createTestTrip(t *testing.T, claims *utils.Claims, tripName string) int {
	reqBody := models.CreateTripRequest{
		TripName:    tripName,
		Destination: "Paris",
		StartDate:   "2026-06-01",
		EndDate:     "2026-06-10",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/trips", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	CreateTrip(c)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	return int(resp["trip_id"].(float64))
}

// ── CreateTrip ────────────────────────────────────────────────────────────────

func TestCreateTrip_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip1@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip1@example.com"}

	reqBody := models.CreateTripRequest{
		TripName:    "Summer Vacation",
		Destination: "Paris",
		StartDate:   "2026-06-01",
		EndDate:     "2026-06-10",
		Notes:       "Exciting trip!",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/trips", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	CreateTrip(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Trip created successfully", resp["message"])
	assert.NotNil(t, resp["trip_id"])
}

func TestCreateTrip_MissingTripName(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip2@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip2@example.com"}

	// trip_name is required but missing
	reqBody := map[string]string{"destination": "Tokyo"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/trips", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	CreateTrip(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "bad_request", resp.Error)
}

func TestCreateTrip_Unauthorized(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	reqBody := models.CreateTripRequest{TripName: "My Trip"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/trips", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// No user set in context

	CreateTrip(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// ── GetTrips ──────────────────────────────────────────────────────────────────

func TestGetTrips_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip3@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip3@example.com"}

	createTestTrip(t, claims, "Trip A")
	createTestTrip(t, claims, "Trip B")

	req := httptest.NewRequest("GET", "/api/trips", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	GetTrips(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	trips := resp["trips"].([]interface{})
	assert.Equal(t, 2, len(trips))
}

func TestGetTrips_EmptyList(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip4@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip4@example.com"}

	req := httptest.NewRequest("GET", "/api/trips", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	GetTrips(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	trips := resp["trips"].([]interface{})
	assert.Equal(t, 0, len(trips))
}

// ── GetTripByID ───────────────────────────────────────────────────────────────

func TestGetTripByID_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip5@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip5@example.com"}
	tripID := createTestTrip(t, claims, "Beach Holiday")

	req := httptest.NewRequest("GET", "/api/trips/1", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	GetTripByID(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.TripSummary
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Beach Holiday", resp.TripName)
}

func TestGetTripByID_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip6@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip6@example.com"}

	req := httptest.NewRequest("GET", "/api/trips/999", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	GetTripByID(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "not_found", resp.Error)
}

// ── UpdateTrip ────────────────────────────────────────────────────────────────

func TestUpdateTrip_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip7@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip7@example.com"}
	tripID := createTestTrip(t, claims, "Old Name")

	reqBody := models.UpdateTripRequest{
		TripName: "New Name",
		Status:   "ongoing",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("PUT", "/api/trips/1", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	UpdateTrip(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Trip updated successfully", resp["message"])
}

func TestUpdateTrip_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip8@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip8@example.com"}

	reqBody := models.UpdateTripRequest{TripName: "New Name"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("PUT", "/api/trips/999", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	UpdateTrip(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ── DeleteTrip ────────────────────────────────────────────────────────────────

func TestDeleteTrip_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip9@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip9@example.com"}
	tripID := createTestTrip(t, claims, "Trip to Delete")

	req := httptest.NewRequest("DELETE", "/api/trips/1", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", tripID)}}

	DeleteTrip(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Trip deleted successfully", resp["message"])
}

func TestDeleteTrip_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "trip10@example.com")
	claims := &utils.Claims{UserID: userID, Email: "trip10@example.com"}

	req := httptest.NewRequest("DELETE", "/api/trips/999", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	DeleteTrip(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteTrip_Unauthorized(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	req := httptest.NewRequest("DELETE", "/api/trips/1", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// No user in context

	DeleteTrip(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
