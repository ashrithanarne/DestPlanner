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

// createTestGroup creates a group and returns its ID
func createTestGroup(t *testing.T, claims *utils.Claims, groupName string, tripID int) int {
	reqBody := models.CreateGroupRequest{GroupName: groupName, TripID: tripID}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/groups", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	CreateGroup(c)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	return int(resp["group_id"].(float64))
}

// addTestMember adds a user to a group
func addTestMember(t *testing.T, claims *utils.Claims, groupID, userID int) {
	reqBody := models.AddMemberRequest{UserID: userID}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/members", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}
	AddMember(c)
}

// ── CreateGroup ───────────────────────────────────────────────────────────────

func TestCreateGroup_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "group1@example.com")
	claims := &utils.Claims{UserID: userID, Email: "group1@example.com"}

	reqBody := models.CreateGroupRequest{GroupName: "Hawaii Crew"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/groups", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	CreateGroup(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Group created successfully", resp["message"])
	assert.NotNil(t, resp["group_id"])
}

func TestCreateGroup_MissingGroupName(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "group2@example.com")
	claims := &utils.Claims{UserID: userID, Email: "group2@example.com"}

	reqBody := map[string]string{}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/groups", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	CreateGroup(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateGroup_Unauthorized(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	reqBody := models.CreateGroupRequest{GroupName: "Hawaii Crew"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/groups", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	CreateGroup(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestCreateGroup_CreatorIsAutoMember(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "group3@example.com")
	claims := &utils.Claims{UserID: userID, Email: "group3@example.com"}
	groupID := createTestGroup(t, claims, "Auto Member Test", 0)

	// Verify creator is a member by checking directly via isGroupMember helper
	isMember, err := isGroupMember(groupID, userID)
	assert.NoError(t, err)
	assert.True(t, isMember, "Creator should be auto-added as a group member")
}

// ── GetGroups ─────────────────────────────────────────────────────────────────

func TestGetGroups_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "group4@example.com")
	claims := &utils.Claims{UserID: userID, Email: "group4@example.com"}

	createTestGroup(t, claims, "Group A", 0)
	createTestGroup(t, claims, "Group B", 0)

	req := httptest.NewRequest("GET", "/api/groups", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	GetGroups(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	groups := resp["groups"].([]interface{})
	assert.Equal(t, 2, len(groups))
}

// ── AddMember ─────────────────────────────────────────────────────────────────

func TestAddMember_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group5@example.com")
	userID2, _ := createTestUser(t, "group5b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group5@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)

	reqBody := models.AddMemberRequest{UserID: userID2}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/members", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	AddMember(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Member added successfully", resp["message"])
}

func TestAddMember_AlreadyMember(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group6@example.com")
	userID2, _ := createTestUser(t, "group6b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group6@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)

	addTestMember(t, claims1, groupID, userID2)

	// Try adding the same user again
	reqBody := models.AddMemberRequest{UserID: userID2}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/members", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	AddMember(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "already_exists", resp.Error)
}

func TestAddMember_NotCreator(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group7@example.com")
	userID2, _ := createTestUser(t, "group7b@example.com")
	userID3, _ := createTestUser(t, "group7c@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group7@example.com"}
	claims2 := &utils.Claims{UserID: userID2, Email: "group7b@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	// user2 tries to add user3 — should be forbidden
	reqBody := models.AddMemberRequest{UserID: userID3}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/members", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims2)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	AddMember(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

// ── RemoveMember ──────────────────────────────────────────────────────────────

func TestRemoveMember_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group8@example.com")
	userID2, _ := createTestUser(t, "group8b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group8@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	req := httptest.NewRequest("DELETE", fmt.Sprintf("/api/groups/%d/members/%d", groupID, userID2), nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", groupID)},
		{Key: "userId", Value: fmt.Sprintf("%d", userID2)},
	}

	RemoveMember(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRemoveMember_CannotRemoveSelf(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group9@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group9@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)

	req := httptest.NewRequest("DELETE", fmt.Sprintf("/api/groups/%d/members/%d", groupID, userID1), nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", groupID)},
		{Key: "userId", Value: fmt.Sprintf("%d", userID1)},
	}

	RemoveMember(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ── AddGroupExpense ───────────────────────────────────────────────────────────

func TestAddGroupExpense_EqualSplit(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group10@example.com")
	userID2, _ := createTestUser(t, "group10b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group10@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	reqBody := models.CreateGroupExpenseRequest{
		Amount:      100.00,
		Category:    "Food & Dining",
		Description: "Dinner",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	AddGroupExpense(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Expense added successfully", resp["message"])
}

func TestAddGroupExpense_CustomSplit(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group11@example.com")
	userID2, _ := createTestUser(t, "group11b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group11@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	reqBody := models.CreateGroupExpenseRequest{
		Amount:   150.00,
		Category: "Hotel",
		Splits: []models.SplitInput{
			{UserID: userID1, AmountOwed: 50.00},
			{UserID: userID2, AmountOwed: 100.00},
		},
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	AddGroupExpense(c)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAddGroupExpense_SplitAmountMismatch(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group12@example.com")
	userID2, _ := createTestUser(t, "group12b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group12@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	reqBody := models.CreateGroupExpenseRequest{
		Amount:   150.00,
		Category: "Hotel",
		Splits: []models.SplitInput{
			{UserID: userID1, AmountOwed: 50.00},
			{UserID: userID2, AmountOwed: 50.00}, // only 100, not 150
		},
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	AddGroupExpense(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "validation_error", resp.Error)
}

func TestAddGroupExpense_NonMemberInSplit(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group13@example.com")
	userID2, _ := createTestUser(t, "group13b@example.com") // not a member
	claims1 := &utils.Claims{UserID: userID1, Email: "group13@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)

	reqBody := models.CreateGroupExpenseRequest{
		Amount:   100.00,
		Category: "Food",
		Splits: []models.SplitInput{
			{UserID: userID1, AmountOwed: 50.00},
			{UserID: userID2, AmountOwed: 50.00}, // userID2 is not in the group
		},
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	AddGroupExpense(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "validation_error", resp.Error)
}

func TestAddGroupExpense_NotMember(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group14@example.com")
	userID2, _ := createTestUser(t, "group14b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group14@example.com"}
	claims2 := &utils.Claims{UserID: userID2, Email: "group14b@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	// userID2 is NOT added as a member

	reqBody := models.CreateGroupExpenseRequest{Amount: 100.00, Category: "Food"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims2)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	AddGroupExpense(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

// ── GetGroupExpenses ──────────────────────────────────────────────────────────

func TestGetGroupExpenses_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group15@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group15@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)

	// Add two expenses
	for _, category := range []string{"Food", "Transport"} {
		expReq := models.CreateGroupExpenseRequest{Amount: 50.00, Category: category}
		body, _ := json.Marshal(expReq)
		req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user", claims1)
		c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}
		AddGroupExpense(c)
	}

	req := httptest.NewRequest("GET", fmt.Sprintf("/api/groups/%d/expenses", groupID), nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	GetGroupExpenses(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	expenses := resp["expenses"].([]interface{})
	assert.Equal(t, 2, len(expenses))
}

// ── GetGroupBalances ──────────────────────────────────────────────────────────

func TestGetGroupBalances_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group16@example.com")
	userID2, _ := createTestUser(t, "group16b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group16@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	// user1 pays $100 split equally → user2 owes $50
	expReq := models.CreateGroupExpenseRequest{Amount: 100.00, Category: "Food"}
	body, _ := json.Marshal(expReq)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}
	AddGroupExpense(c)

	// Get balances
	req2 := httptest.NewRequest("GET", fmt.Sprintf("/api/groups/%d/balances", groupID), nil)
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user", claims1)
	c2.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	GetGroupBalances(c2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var resp map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp)
	balances := resp["balances"].([]interface{})
	assert.Equal(t, 1, len(balances))

	// user2 owes user1 $50
	balance := balances[0].(map[string]interface{})
	assert.Equal(t, float64(userID2), balance["from_user_id"])
	assert.Equal(t, float64(userID1), balance["to_user_id"])
	assert.Equal(t, 50.0, balance["amount"])
}

// ── SettleExpense ─────────────────────────────────────────────────────────────

func TestSettleExpense_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group17@example.com")
	userID2, _ := createTestUser(t, "group17b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group17@example.com"}
	claims2 := &utils.Claims{UserID: userID2, Email: "group17b@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	// Add expense
	expReq := models.CreateGroupExpenseRequest{Amount: 100.00, Category: "Food"}
	body, _ := json.Marshal(expReq)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}
	AddGroupExpense(c)

	var expResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &expResp)
	expenseID := int(expResp["expense_id"].(float64))

	// user2 settles their split
	req2 := httptest.NewRequest("PUT", fmt.Sprintf("/api/groups/%d/expenses/%d/settle", groupID, expenseID), nil)
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user", claims2)
	c2.Params = gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", groupID)},
		{Key: "expenseId", Value: fmt.Sprintf("%d", expenseID)},
	}

	SettleExpense(c2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var resp map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp)
	assert.Equal(t, "Expense settled successfully", resp["message"])
}

func TestSettleExpense_AlreadySettled(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group18@example.com")
	userID2, _ := createTestUser(t, "group18b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group18@example.com"}
	claims2 := &utils.Claims{UserID: userID2, Email: "group18b@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	// Add expense
	expReq := models.CreateGroupExpenseRequest{Amount: 100.00, Category: "Food"}
	body, _ := json.Marshal(expReq)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}
	AddGroupExpense(c)

	var expResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &expResp)
	expenseID := int(expResp["expense_id"].(float64))

	// Settle once
	settleParams := gin.Params{
		{Key: "id", Value: fmt.Sprintf("%d", groupID)},
		{Key: "expenseId", Value: fmt.Sprintf("%d", expenseID)},
	}
	req2 := httptest.NewRequest("PUT", "/settle", nil)
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user", claims2)
	c2.Params = settleParams
	SettleExpense(c2)
	assert.Equal(t, http.StatusOK, w2.Code)

	// Try to settle again
	req3 := httptest.NewRequest("PUT", "/settle", nil)
	w3 := httptest.NewRecorder()
	c3, _ := gin.CreateTestContext(w3)
	c3.Request = req3
	c3.Set("user", claims2)
	c3.Params = settleParams
	SettleExpense(c3)

	assert.Equal(t, http.StatusBadRequest, w3.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w3.Body.Bytes(), &resp)
	assert.Equal(t, "bad_request", resp.Error)
}

func TestSettleExpense_BalancesAfterSettle(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "group19@example.com")
	userID2, _ := createTestUser(t, "group19b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "group19@example.com"}
	claims2 := &utils.Claims{UserID: userID2, Email: "group19b@example.com"}
	groupID := createTestGroup(t, claims1, "My Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	// Add expense
	expReq := models.CreateGroupExpenseRequest{Amount: 100.00, Category: "Food"}
	body, _ := json.Marshal(expReq)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}
	AddGroupExpense(c)

	var expResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &expResp)
	expenseID := int(expResp["expense_id"].(float64))

	// Both users settle
	for _, claims := range []*utils.Claims{claims1, claims2} {
		req := httptest.NewRequest("PUT", "/settle", nil)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user", claims)
		c.Params = gin.Params{
			{Key: "id", Value: fmt.Sprintf("%d", groupID)},
			{Key: "expenseId", Value: fmt.Sprintf("%d", expenseID)},
		}
		SettleExpense(c)
	}

	// Balances should now be empty
	req2 := httptest.NewRequest("GET", fmt.Sprintf("/api/groups/%d/balances", groupID), nil)
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user", claims1)
	c2.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	GetGroupBalances(c2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var resp map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp)
	balances := resp["balances"]
	assert.Nil(t, balances)
}
