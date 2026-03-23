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

// ── SearchUsers ───────────────────────────────────────────────────────────────

func TestSearchUsers_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "search1@example.com")
	createTestUser(t, "john.doe@example.com")
	claims := &utils.Claims{UserID: userID, Email: "search1@example.com"}

	req := httptest.NewRequest("GET", "/api/users/search?q=john", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	SearchUsers(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	users := resp["users"].([]interface{})
	assert.GreaterOrEqual(t, len(users), 1)
}

func TestSearchUsers_SearchByEmail(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "search2@example.com")
	createTestUser(t, "findme@example.com")
	claims := &utils.Claims{UserID: userID, Email: "search2@example.com"}

	req := httptest.NewRequest("GET", "/api/users/search?q=findme", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	SearchUsers(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	users := resp["users"].([]interface{})
	assert.Equal(t, 1, len(users))
	user := users[0].(map[string]interface{})
	assert.Equal(t, "findme@example.com", user["email"])
}

func TestSearchUsers_EmptyQuery(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "search3@example.com")
	claims := &utils.Claims{UserID: userID, Email: "search3@example.com"}

	req := httptest.NewRequest("GET", "/api/users/search", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	SearchUsers(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "bad_request", resp.Error)
}

func TestSearchUsers_QueryTooShort(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "search4@example.com")
	claims := &utils.Claims{UserID: userID, Email: "search4@example.com"}

	req := httptest.NewRequest("GET", "/api/users/search?q=a", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	SearchUsers(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "bad_request", resp.Error)
}

func TestSearchUsers_Unauthorized(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	req := httptest.NewRequest("GET", "/api/users/search?q=john", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// No user in context

	SearchUsers(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestSearchUsers_NoResults(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "search5@example.com")
	claims := &utils.Claims{UserID: userID, Email: "search5@example.com"}

	req := httptest.NewRequest("GET", "/api/users/search?q=zzznomatch", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)

	SearchUsers(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	users := resp["users"].([]interface{})
	assert.Equal(t, 0, len(users))
}

// ── GetUserByID ───────────────────────────────────────────────────────────────

func TestGetUserByID_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "getuser1@example.com")
	userID2, _ := createTestUser(t, "getuser2@example.com")
	claims := &utils.Claims{UserID: userID1, Email: "getuser1@example.com"}

	req := httptest.NewRequest("GET", fmt.Sprintf("/api/users/%d", userID2), nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", userID2)}}

	GetUserByID(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, float64(userID2), resp["user_id"])
	assert.Equal(t, "getuser2@example.com", resp["email"])
	assert.NotNil(t, resp["first_name"])
	assert.NotNil(t, resp["last_name"])
}

func TestGetUserByID_NotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "getuser3@example.com")
	claims := &utils.Claims{UserID: userID, Email: "getuser3@example.com"}

	req := httptest.NewRequest("GET", "/api/users/999", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	GetUserByID(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "not_found", resp.Error)
}

func TestGetUserByID_Unauthorized(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	req := httptest.NewRequest("GET", "/api/users/1", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	// No user in context

	GetUserByID(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetUserByID_InvalidID(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "getuser4@example.com")
	claims := &utils.Claims{UserID: userID, Email: "getuser4@example.com"}

	req := httptest.NewRequest("GET", "/api/users/abc", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	GetUserByID(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "bad_request", resp.Error)
}

// ── GetGroupByID ──────────────────────────────────────────────────────────────

func TestGetGroupByID_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "getgroup1@example.com")
	userID2, _ := createTestUser(t, "getgroup1b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "getgroup1@example.com"}
	groupID := createTestGroup(t, claims1, "Test Group", 0)
	addTestMember(t, claims1, groupID, userID2)

	// Add an expense
	expReq := models.CreateGroupExpenseRequest{Amount: 60.00, Category: "Food"}
	body, _ := json.Marshal(expReq)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/groups/%d/expenses", groupID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims1)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}
	AddGroupExpense(c)

	// Now get group by ID
	req2 := httptest.NewRequest("GET", fmt.Sprintf("/api/groups/%d", groupID), nil)
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user", claims1)
	c2.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	GetGroupByID(c2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var resp map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp)

	group := resp["group"].(map[string]interface{})
	assert.Equal(t, "Test Group", group["group_name"])
	assert.NotNil(t, group["created_by_name"])
	assert.NotNil(t, group["members"])

	expenses := resp["expenses"].([]interface{})
	assert.Equal(t, 1, len(expenses))
}

func TestGetGroupByID_NotMember(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID1, _ := createTestUser(t, "getgroup2@example.com")
	userID2, _ := createTestUser(t, "getgroup2b@example.com")
	claims1 := &utils.Claims{UserID: userID1, Email: "getgroup2@example.com"}
	claims2 := &utils.Claims{UserID: userID2, Email: "getgroup2b@example.com"}
	groupID := createTestGroup(t, claims1, "Private Group", 0)
	// userID2 is NOT added as a member

	req := httptest.NewRequest("GET", fmt.Sprintf("/api/groups/%d", groupID), nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims2)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", groupID)}}

	GetGroupByID(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
	var resp models.ErrorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "forbidden", resp.Error)
}

func TestGetGroupByID_InvalidID(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()
	gin.SetMode(gin.TestMode)

	userID, _ := createTestUser(t, "getgroup3@example.com")
	claims := &utils.Claims{UserID: userID, Email: "getgroup3@example.com"}

	req := httptest.NewRequest("GET", "/api/groups/abc", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user", claims)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	GetGroupByID(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
