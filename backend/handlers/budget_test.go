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

// TestCreateBudget_Success tests successful budget creation
func TestCreateBudget_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	createReq := models.CreateBudgetRequest{
		TripName:    "Paris Vacation",
		TotalBudget: 3000.0,
		Currency:    "USD",
		StartDate:   "2024-06-01",
		EndDate:     "2024-06-10",
		Notes:       "Summer trip to Paris",
	}

	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}
	c.Set("user", claims)

	CreateBudget(c)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Budget created successfully", response["message"])
	assert.NotNil(t, response["budget_id"])
}

// TestCreateBudget_MissingRequiredFields tests budget creation with missing fields
func TestCreateBudget_MissingRequiredFields(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Missing total_budget
	createReq := models.CreateBudgetRequest{
		TripName: "Paris Vacation",
		// TotalBudget missing
	}

	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}
	c.Set("user", claims)

	CreateBudget(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "bad_request", response.Error)
}

// TestCreateBudget_Unauthorized tests budget creation without authentication
func TestCreateBudget_Unauthorized(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	createReq := models.CreateBudgetRequest{
		TripName:    "Paris Vacation",
		TotalBudget: 3000.0,
	}

	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Don't set user in context

	CreateBudget(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// TestGetBudgets_Success tests retrieving all budgets
func TestGetBudgets_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create a budget first
	createReq := models.CreateBudgetRequest{
		TripName:    "Tokyo Trip",
		TotalBudget: 5000.0,
		Currency:    "USD",
	}

	createBody, _ := json.Marshal(createReq)
	createReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(createBody))
	createReqHTTP.Header.Set("Content-Type", "application/json")

	createW := httptest.NewRecorder()
	createC, _ := gin.CreateTestContext(createW)
	createC.Request = createReqHTTP
	createC.Set("user", claims)

	CreateBudget(createC)

	// Get all budgets
	req := httptest.NewRequest("GET", "/api/budgets", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	GetBudgets(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	budgets := response["budgets"].([]interface{})
	assert.GreaterOrEqual(t, len(budgets), 1)
}

// TestGetBudgetByID_Success tests retrieving a specific budget
func TestGetBudgetByID_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create a budget
	createReq := models.CreateBudgetRequest{
		TripName:    "London Trip",
		TotalBudget: 2500.0,
	}

	createBody, _ := json.Marshal(createReq)
	createReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(createBody))
	createReqHTTP.Header.Set("Content-Type", "application/json")

	createW := httptest.NewRecorder()
	createC, _ := gin.CreateTestContext(createW)
	createC.Request = createReqHTTP
	createC.Set("user", claims)

	CreateBudget(createC)

	var createResponse map[string]interface{}
	json.Unmarshal(createW.Body.Bytes(), &createResponse)
	budgetID := int(createResponse["budget_id"].(float64))

	// Get specific budget
	req := httptest.NewRequest("GET", fmt.Sprintf("/api/budgets/%d", budgetID), nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
	}

	GetBudgetByID(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.BudgetSummary
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "London Trip", response.TripName)
	assert.Equal(t, 2500.0, response.TotalBudget)
	assert.Equal(t, 2500.0, response.RemainingBudget)
	assert.Equal(t, 0.0, response.PercentageUsed)
}

// TestGetBudgetByID_NotFound tests retrieving non-existent budget
func TestGetBudgetByID_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	req := httptest.NewRequest("GET", "/api/budgets/99999", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", &utils.Claims{UserID: 1, Email: "test@example.com"})
	c.Params = gin.Params{
		{Key: "id", Value: "99999"},
	}

	GetBudgetByID(c)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "not_found", response.Error)
}

// TestUpdateBudget_Success tests successful budget update
func TestUpdateBudget_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create a budget
	createReq := models.CreateBudgetRequest{
		TripName:    "Original Trip",
		TotalBudget: 2000.0,
	}

	createBody, _ := json.Marshal(createReq)
	createReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(createBody))
	createReqHTTP.Header.Set("Content-Type", "application/json")

	createW := httptest.NewRecorder()
	createC, _ := gin.CreateTestContext(createW)
	createC.Request = createReqHTTP
	createC.Set("user", claims)

	CreateBudget(createC)

	var createResponse map[string]interface{}
	json.Unmarshal(createW.Body.Bytes(), &createResponse)
	budgetID := int(createResponse["budget_id"].(float64))

	// Update budget
	updateReq := models.UpdateBudgetRequest{
		TripName:    "Updated Trip",
		TotalBudget: 2500.0,
	}

	updateBody, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", fmt.Sprintf("/api/budgets/%d", budgetID), bytes.NewBuffer(updateBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
	}

	UpdateBudget(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Budget updated successfully", response["message"])
}

// TestUpdateBudget_NotFound tests updating non-existent budget
func TestUpdateBudget_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	updateReq := models.UpdateBudgetRequest{
		TripName: "Updated Trip",
	}

	body, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", "/api/budgets/99999", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", &utils.Claims{UserID: 1, Email: "test@example.com"})
	c.Params = gin.Params{
		{Key: "id", Value: "99999"},
	}

	UpdateBudget(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// TestDeleteBudget_Success tests successful budget deletion
func TestDeleteBudget_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create a budget
	createReq := models.CreateBudgetRequest{
		TripName:    "Delete Me",
		TotalBudget: 1000.0,
	}

	createBody, _ := json.Marshal(createReq)
	createReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(createBody))
	createReqHTTP.Header.Set("Content-Type", "application/json")

	createW := httptest.NewRecorder()
	createC, _ := gin.CreateTestContext(createW)
	createC.Request = createReqHTTP
	createC.Set("user", claims)

	CreateBudget(createC)

	var createResponse map[string]interface{}
	json.Unmarshal(createW.Body.Bytes(), &createResponse)
	budgetID := int(createResponse["budget_id"].(float64))

	// Delete budget
	req := httptest.NewRequest("DELETE", fmt.Sprintf("/api/budgets/%d", budgetID), nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
	}

	DeleteBudget(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Budget deleted successfully", response["message"])
}

// TestDeleteBudget_NotFound tests deleting non-existent budget
func TestDeleteBudget_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	req := httptest.NewRequest("DELETE", "/api/budgets/99999", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", &utils.Claims{UserID: 1, Email: "test@example.com"})
	c.Params = gin.Params{
		{Key: "id", Value: "99999"},
	}

	DeleteBudget(c)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "not_found", response.Error)
}