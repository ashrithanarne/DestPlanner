package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestGetProfile_Success tests successful profile retrieval
func TestGetProfile_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Register a user first
	registerReq := models.RegisterRequest{
		Email:     "profile@example.com",
		Password:  "TestPass123",
		FirstName: "Profile",
		LastName:  "User",
	}

	regBody, _ := json.Marshal(registerReq)
	regReq := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	regReq.Header.Set("Content-Type", "application/json")

	regW := httptest.NewRecorder()
	regC, _ := gin.CreateTestContext(regW)
	regC.Request = regReq

	Register(regC)

	var regResponse map[string]interface{}
	json.Unmarshal(regW.Body.Bytes(), &regResponse)
	userID := int(regResponse["user_id"].(float64))

	// Get profile
	req := httptest.NewRequest("GET", "/api/profile", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Set user claims in context (normally done by auth middleware)
	claims := &utils.Claims{
		UserID: userID,
		Email:  "profile@example.com",
	}
	c.Set("user", claims)

	GetProfile(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.User
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "profile@example.com", response.Email)
	assert.Equal(t, "Profile", response.FirstName)
	assert.Equal(t, "User", response.LastName)
}

// TestGetProfile_Unauthorized tests profile retrieval without authentication
func TestGetProfile_Unauthorized(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	req := httptest.NewRequest("GET", "/api/profile", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Don't set user in context (simulating no auth)

	GetProfile(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "unauthorized", response.Error)
}

// TestGetProfile_UserNotFound tests profile retrieval for deleted user
func TestGetProfile_UserNotFound(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	req := httptest.NewRequest("GET", "/api/profile", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Set claims for non-existent user
	claims := &utils.Claims{
		UserID: 99999,
		Email:  "nonexistent@example.com",
	}
	c.Set("user", claims)

	GetProfile(c)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "not_found", response.Error)
}

// TestUpdateProfile_Success tests successful profile update
func TestUpdateProfile_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Register a user
	registerReq := models.RegisterRequest{
		Email:     "update@example.com",
		Password:  "TestPass123",
		FirstName: "Old",
		LastName:  "Name",
	}

	regBody, _ := json.Marshal(registerReq)
	regReq := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	regReq.Header.Set("Content-Type", "application/json")

	regW := httptest.NewRecorder()
	regC, _ := gin.CreateTestContext(regW)
	regC.Request = regReq

	Register(regC)

	var regResponse map[string]interface{}
	json.Unmarshal(regW.Body.Bytes(), &regResponse)
	userID := int(regResponse["user_id"].(float64))

	// Update profile
	updateReq := models.UpdateProfileRequest{
		FirstName: "New",
		LastName:  "Name",
		Email:     "newemail@example.com",
	}

	updateBody, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", "/api/profile", bytes.NewBuffer(updateBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Set user claims in context
	claims := &utils.Claims{
		UserID: userID,
		Email:  "update@example.com",
	}
	c.Set("user", claims)

	UpdateProfile(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var user models.User
	err := json.Unmarshal(w.Body.Bytes(), &user)
	assert.NoError(t, err)
	
	// Verify update
	assert.Equal(t, "New", user.FirstName)
	assert.Equal(t, "Name", user.LastName)
	assert.Equal(t, "newemail@example.com", user.Email)
}

// TestUpdateProfile_PartialUpdate tests updating only some fields
func TestUpdateProfile_PartialUpdate(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Register a user
	registerReq := models.RegisterRequest{
		Email:     "partial@example.com",
		Password:  "TestPass123",
		FirstName: "Original",
		LastName:  "User",
	}

	regBody, _ := json.Marshal(registerReq)
	regReq := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	regReq.Header.Set("Content-Type", "application/json")

	regW := httptest.NewRecorder()
	regC, _ := gin.CreateTestContext(regW)
	regC.Request = regReq

	Register(regC)

	var regResponse map[string]interface{}
	json.Unmarshal(regW.Body.Bytes(), &regResponse)
	userID := int(regResponse["user_id"].(float64))

	// Update only first name
	updateReq := models.UpdateProfileRequest{
		FirstName: "Updated",
		// LastName and Email not provided
	}

	updateBody, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", "/api/profile", bytes.NewBuffer(updateBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	claims := &utils.Claims{
		UserID: userID,
		Email:  "partial@example.com",
	}
	c.Set("user", claims)

	UpdateProfile(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var user models.User
	err := json.Unmarshal(w.Body.Bytes(), &user)
	assert.NoError(t, err)

	assert.Equal(t, "Updated", user.FirstName)
	assert.Equal(t, "User", user.LastName) // Should remain unchanged
}

// TestUpdateProfile_Unauthorized tests profile update without authentication
func TestUpdateProfile_Unauthorized(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	updateReq := models.UpdateProfileRequest{
		FirstName: "New",
		LastName:  "Name",
	}

	body, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", "/api/profile", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Don't set user in context

	UpdateProfile(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "unauthorized", response.Error)
}

// TestUpdateProfile_InvalidPayload tests profile update with invalid JSON
func TestUpdateProfile_InvalidPayload(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Register a user
	registerReq := models.RegisterRequest{
		Email:     "invalid@example.com",
		Password:  "TestPass123",
		FirstName: "Test",
		LastName:  "User",
	}

	regBody, _ := json.Marshal(registerReq)
	regReq := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	regReq.Header.Set("Content-Type", "application/json")

	regW := httptest.NewRecorder()
	regC, _ := gin.CreateTestContext(regW)
	regC.Request = regReq

	Register(regC)

	var regResponse map[string]interface{}
	json.Unmarshal(regW.Body.Bytes(), &regResponse)
	userID := int(regResponse["user_id"].(float64))

	// Invalid JSON
	invalidJSON := []byte(`{"first_name": "Test", }`)
	req := httptest.NewRequest("PUT", "/api/profile", bytes.NewBuffer(invalidJSON))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	claims := &utils.Claims{
		UserID: userID,
		Email:  "invalid@example.com",
	}
	c.Set("user", claims)

	UpdateProfile(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "bad_request", response.Error)
}