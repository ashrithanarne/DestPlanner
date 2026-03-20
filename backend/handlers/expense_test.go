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

// TestAddExpense_Success tests successful expense addition
func TestAddExpense_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create a budget first
	budgetReq := models.CreateBudgetRequest{
		TripName:    "Expense Test Trip",
		TotalBudget: 3000.0,
	}

	budgetBody, _ := json.Marshal(budgetReq)
	budgetReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(budgetBody))
	budgetReqHTTP.Header.Set("Content-Type", "application/json")

	budgetW := httptest.NewRecorder()
	budgetC, _ := gin.CreateTestContext(budgetW)
	budgetC.Request = budgetReqHTTP
	budgetC.Set("user", claims)

	CreateBudget(budgetC)

	var budgetResponse map[string]interface{}
	json.Unmarshal(budgetW.Body.Bytes(), &budgetResponse)
	budgetID := int(budgetResponse["budget_id"].(float64))

	// Add expense
	expenseReq := models.CreateExpenseRequest{
		Category:    "Food",
		Amount:      150.0,
		Description: "Dinner at restaurant",
		ExpenseDate: "2024-06-01",
	}

	expenseBody, _ := json.Marshal(expenseReq)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/budgets/%d/expenses", budgetID), bytes.NewBuffer(expenseBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
	}

	AddExpense(c)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Expense added successfully", response["message"])
	assert.NotNil(t, response["expense_id"])
}

// TestAddExpense_BudgetNotFound tests adding expense to non-existent budget
func TestAddExpense_BudgetNotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	expenseReq := models.CreateExpenseRequest{
		Category: "Food",
		Amount:   100.0,
	}

	body, _ := json.Marshal(expenseReq)
	req := httptest.NewRequest("POST", "/api/budgets/99999/expenses", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", &utils.Claims{UserID: 1, Email: "test@example.com"})
	c.Params = gin.Params{
		{Key: "id", Value: "99999"},
	}

	AddExpense(c)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "not_found", response.Error)
}

// TestAddExpense_MissingRequiredFields tests adding expense without required fields
func TestAddExpense_MissingRequiredFields(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create budget
	budgetReq := models.CreateBudgetRequest{
		TripName:    "Test Trip",
		TotalBudget: 1000.0,
	}

	budgetBody, _ := json.Marshal(budgetReq)
	budgetReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(budgetBody))
	budgetReqHTTP.Header.Set("Content-Type", "application/json")

	budgetW := httptest.NewRecorder()
	budgetC, _ := gin.CreateTestContext(budgetW)
	budgetC.Request = budgetReqHTTP
	budgetC.Set("user", claims)

	CreateBudget(budgetC)

	var budgetResponse map[string]interface{}
	json.Unmarshal(budgetW.Body.Bytes(), &budgetResponse)
	budgetID := int(budgetResponse["budget_id"].(float64))

	// Try to add expense without category
	expenseReq := models.CreateExpenseRequest{
		// Category missing
		Amount: 100.0,
	}

	expenseBody, _ := json.Marshal(expenseReq)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/budgets/%d/expenses", budgetID), bytes.NewBuffer(expenseBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
	}

	AddExpense(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestGetExpenses_Success tests retrieving all expenses for a budget
func TestGetExpenses_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create budget
	budgetReq := models.CreateBudgetRequest{
		TripName:    "Expenses Test",
		TotalBudget: 2000.0,
	}

	budgetBody, _ := json.Marshal(budgetReq)
	budgetReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(budgetBody))
	budgetReqHTTP.Header.Set("Content-Type", "application/json")

	budgetW := httptest.NewRecorder()
	budgetC, _ := gin.CreateTestContext(budgetW)
	budgetC.Request = budgetReqHTTP
	budgetC.Set("user", claims)

	CreateBudget(budgetC)

	var budgetResponse map[string]interface{}
	json.Unmarshal(budgetW.Body.Bytes(), &budgetResponse)
	budgetID := int(budgetResponse["budget_id"].(float64))

	// Add two expenses
	expenses := []models.CreateExpenseRequest{
		{Category: "Food", Amount: 100.0, Description: "Lunch"},
		{Category: "Transport", Amount: 50.0, Description: "Taxi"},
	}

	for _, exp := range expenses {
		expBody, _ := json.Marshal(exp)
		expReq := httptest.NewRequest("POST", fmt.Sprintf("/api/budgets/%d/expenses", budgetID), bytes.NewBuffer(expBody))
		expReq.Header.Set("Content-Type", "application/json")

		expW := httptest.NewRecorder()
		expC, _ := gin.CreateTestContext(expW)
		expC.Request = expReq
		expC.Set("user", claims)
		expC.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", budgetID)}}

		AddExpense(expC)
	}

	// Get all expenses
	req := httptest.NewRequest("GET", fmt.Sprintf("/api/budgets/%d/expenses", budgetID), nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
	}

	GetExpenses(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	expensesList := response["expenses"].([]interface{})
	assert.Equal(t, 2, len(expensesList))
}

// TestGetExpenses_BudgetNotFound tests getting expenses for non-existent budget
func TestGetExpenses_BudgetNotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	req := httptest.NewRequest("GET", "/api/budgets/99999/expenses", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", &utils.Claims{UserID: 1, Email: "test@example.com"})
	c.Params = gin.Params{
		{Key: "id", Value: "99999"},
	}

	GetExpenses(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// TestUpdateExpense_Success tests successful expense update
func TestUpdateExpense_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create budget
	budgetReq := models.CreateBudgetRequest{
		TripName:    "Update Test",
		TotalBudget: 2000.0,
	}

	budgetBody, _ := json.Marshal(budgetReq)
	budgetReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(budgetBody))
	budgetReqHTTP.Header.Set("Content-Type", "application/json")

	budgetW := httptest.NewRecorder()
	budgetC, _ := gin.CreateTestContext(budgetW)
	budgetC.Request = budgetReqHTTP
	budgetC.Set("user", claims)

	CreateBudget(budgetC)

	var budgetResponse map[string]interface{}
	json.Unmarshal(budgetW.Body.Bytes(), &budgetResponse)
	budgetID := int(budgetResponse["budget_id"].(float64))

	// Add expense
	expenseReq := models.CreateExpenseRequest{
		Category: "Food",
		Amount:   100.0,
	}

	expenseBody, _ := json.Marshal(expenseReq)
	expReqHTTP := httptest.NewRequest("POST", fmt.Sprintf("/api/budgets/%d/expenses", budgetID), bytes.NewBuffer(expenseBody))
	expReqHTTP.Header.Set("Content-Type", "application/json")

	expW := httptest.NewRecorder()
	expC, _ := gin.CreateTestContext(expW)
	expC.Request = expReqHTTP
	expC.Set("user", claims)
	expC.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", budgetID)}}

	AddExpense(expC)

	var expenseResponse map[string]interface{}
	json.Unmarshal(expW.Body.Bytes(), &expenseResponse)
	expenseID := int(expenseResponse["expense_id"].(float64))

	// Update expense
	updateReq := models.CreateExpenseRequest{
		Category: "Food",
		Amount:   150.0,
		Description: "Updated description",
	}

	updateBody, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", fmt.Sprintf("/api/budgets/%d/expenses/%d", budgetID, expenseID), bytes.NewBuffer(updateBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
		{Key: "expenseId", Value: fmt.Sprintf("%d", expenseID)},
	}

	UpdateExpense(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Expense updated successfully", response["message"])
}

// TestUpdateExpense_NotFound tests updating non-existent expense
func TestUpdateExpense_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create budget
	budgetReq := models.CreateBudgetRequest{
		TripName:    "Test",
		TotalBudget: 1000.0,
	}

	budgetBody, _ := json.Marshal(budgetReq)
	budgetReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(budgetBody))
	budgetReqHTTP.Header.Set("Content-Type", "application/json")

	budgetW := httptest.NewRecorder()
	budgetC, _ := gin.CreateTestContext(budgetW)
	budgetC.Request = budgetReqHTTP
	budgetC.Set("user", claims)

	CreateBudget(budgetC)

	var budgetResponse map[string]interface{}
	json.Unmarshal(budgetW.Body.Bytes(), &budgetResponse)
	budgetID := int(budgetResponse["budget_id"].(float64))

	// Try to update non-existent expense
	updateReq := models.CreateExpenseRequest{
		Category: "Food",
		Amount:   100.0,
	}

	updateBody, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", fmt.Sprintf("/api/budgets/%d/expenses/99999", budgetID), bytes.NewBuffer(updateBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
		{Key: "expenseId", Value: "99999"},
	}

	UpdateExpense(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// TestDeleteExpense_Success tests successful expense deletion
func TestDeleteExpense_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create budget
	budgetReq := models.CreateBudgetRequest{
		TripName:    "Delete Test",
		TotalBudget: 2000.0,
	}

	budgetBody, _ := json.Marshal(budgetReq)
	budgetReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(budgetBody))
	budgetReqHTTP.Header.Set("Content-Type", "application/json")

	budgetW := httptest.NewRecorder()
	budgetC, _ := gin.CreateTestContext(budgetW)
	budgetC.Request = budgetReqHTTP
	budgetC.Set("user", claims)

	CreateBudget(budgetC)

	var budgetResponse map[string]interface{}
	json.Unmarshal(budgetW.Body.Bytes(), &budgetResponse)
	budgetID := int(budgetResponse["budget_id"].(float64))

	// Add expense
	expenseReq := models.CreateExpenseRequest{
		Category: "Food",
		Amount:   100.0,
	}

	expenseBody, _ := json.Marshal(expenseReq)
	expReqHTTP := httptest.NewRequest("POST", fmt.Sprintf("/api/budgets/%d/expenses", budgetID), bytes.NewBuffer(expenseBody))
	expReqHTTP.Header.Set("Content-Type", "application/json")

	expW := httptest.NewRecorder()
	expC, _ := gin.CreateTestContext(expW)
	expC.Request = expReqHTTP
	expC.Set("user", claims)
	expC.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", budgetID)}}

	AddExpense(expC)

	var expenseResponse map[string]interface{}
	json.Unmarshal(expW.Body.Bytes(), &expenseResponse)
	expenseID := int(expenseResponse["expense_id"].(float64))

	// Delete expense
	req := httptest.NewRequest("DELETE", fmt.Sprintf("/api/budgets/%d/expenses/%d", budgetID, expenseID), nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
		{Key: "expenseId", Value: fmt.Sprintf("%d", expenseID)},
	}

	DeleteExpense(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Expense deleted successfully", response["message"])
}

// TestDeleteExpense_NotFound tests deleting non-existent expense
func TestDeleteExpense_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create budget
	budgetReq := models.CreateBudgetRequest{
		TripName:    "Test",
		TotalBudget: 1000.0,
	}

	budgetBody, _ := json.Marshal(budgetReq)
	budgetReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(budgetBody))
	budgetReqHTTP.Header.Set("Content-Type", "application/json")

	budgetW := httptest.NewRecorder()
	budgetC, _ := gin.CreateTestContext(budgetW)
	budgetC.Request = budgetReqHTTP
	budgetC.Set("user", claims)

	CreateBudget(budgetC)

	var budgetResponse map[string]interface{}
	json.Unmarshal(budgetW.Body.Bytes(), &budgetResponse)
	budgetID := int(budgetResponse["budget_id"].(float64))

	// Try to delete non-existent expense
	req := httptest.NewRequest("DELETE", fmt.Sprintf("/api/budgets/%d/expenses/99999", budgetID), nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", budgetID)},
		{Key: "expenseId", Value: "99999"},
	}

	DeleteExpense(c)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "not_found", response.Error)
}

// TestExpense_BudgetCalculations tests that budget spent_amount is correctly updated
func TestExpense_BudgetCalculations(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	claims := &utils.Claims{
		UserID: 1,
		Email:  "test@example.com",
	}

	// Create budget
	budgetReq := models.CreateBudgetRequest{
		TripName:    "Calculation Test",
		TotalBudget: 1000.0,
	}

	budgetBody, _ := json.Marshal(budgetReq)
	budgetReqHTTP := httptest.NewRequest("POST", "/api/budgets", bytes.NewBuffer(budgetBody))
	budgetReqHTTP.Header.Set("Content-Type", "application/json")

	budgetW := httptest.NewRecorder()
	budgetC, _ := gin.CreateTestContext(budgetW)
	budgetC.Request = budgetReqHTTP
	budgetC.Set("user", claims)

	CreateBudget(budgetC)

	var budgetResponse map[string]interface{}
	json.Unmarshal(budgetW.Body.Bytes(), &budgetResponse)
	budgetID := int(budgetResponse["budget_id"].(float64))

	// Add expense of 200
	expenseReq := models.CreateExpenseRequest{
		Category: "Food",
		Amount:   200.0,
	}

	expenseBody, _ := json.Marshal(expenseReq)
	expReqHTTP := httptest.NewRequest("POST", fmt.Sprintf("/api/budgets/%d/expenses", budgetID), bytes.NewBuffer(expenseBody))
	expReqHTTP.Header.Set("Content-Type", "application/json")

	expW := httptest.NewRecorder()
	expC, _ := gin.CreateTestContext(expW)
	expC.Request = expReqHTTP
	expC.Set("user", claims)
	expC.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", budgetID)}}

	AddExpense(expC)

	// Get budget and verify spent_amount = 200, remaining = 800
	req := httptest.NewRequest("GET", fmt.Sprintf("/api/budgets/%d", budgetID), nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", budgetID)}}

	GetBudgetByID(c)

	var summary models.BudgetSummary
	json.Unmarshal(w.Body.Bytes(), &summary)

	assert.Equal(t, 200.0, summary.SpentAmount)
	assert.Equal(t, 800.0, summary.RemainingBudget)
	assert.Equal(t, 20.0, summary.PercentageUsed)
}