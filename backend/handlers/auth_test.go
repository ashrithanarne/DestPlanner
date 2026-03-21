package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// setupTestDB initializes a test database
func setupTestDB(t *testing.T) {
	err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to initialize test database: %v", err)
	}
}

// teardownTestDB closes the test database
func teardownTestDB() {
	database.CloseDB()
}

// TestRegister_Success tests successful user registration
func TestRegister_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create test request
	reqBody := models.RegisterRequest{
		Email:     "test@example.com",
		Password:  "TestPass123",
		FirstName: "Test",
		LastName:  "User",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	// Create test recorder
	w := httptest.NewRecorder()

	// Setup Gin context
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Call handler
	Register(c)

	// Assert response
	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "User registered successfully", response["message"])
	assert.NotNil(t, response["user_id"])
}

// TestRegister_MissingFields tests registration with missing required fields
func TestRegister_MissingFields(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Request with missing last_name
	reqBody := models.RegisterRequest{
		Email:     "test@example.com",
		Password:  "TestPass123",
		FirstName: "Test",
		// LastName missing
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	Register(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "validation_error", response.Error)
}

// TestRegister_DuplicateEmail tests registration with duplicate email
func TestRegister_DuplicateEmail(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// First registration
	reqBody := models.RegisterRequest{
		Email:     "duplicate@example.com",
		Password:  "TestPass123",
		FirstName: "Test",
		LastName:  "User",
	}

	body, _ := json.Marshal(reqBody)
	req1 := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	req1.Header.Set("Content-Type", "application/json")

	w1 := httptest.NewRecorder()
	c1, _ := gin.CreateTestContext(w1)
	c1.Request = req1

	Register(c1)
	assert.Equal(t, http.StatusCreated, w1.Code)

	// Second registration with same email
	body2, _ := json.Marshal(reqBody)
	req2 := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body2))
	req2.Header.Set("Content-Type", "application/json")

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2

	Register(c2)

	assert.Equal(t, http.StatusBadRequest, w2.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w2.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "user_exists", response.Error)
}

// TestRegister_InvalidPayload tests registration with malformed JSON
func TestRegister_InvalidPayload(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Invalid JSON payload
	invalidJSON := []byte(`{"email": "test@example.com", "password": }`)
	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(invalidJSON))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	Register(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "bad_request", response.Error)
}

// TestLogin_Success tests successful login
func TestLogin_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// First register a user
	registerReq := models.RegisterRequest{
		Email:     "login@example.com",
		Password:  "TestPass123",
		FirstName: "Login",
		LastName:  "Test",
	}

	regBody, _ := json.Marshal(registerReq)
	regReq := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	regReq.Header.Set("Content-Type", "application/json")

	regW := httptest.NewRecorder()
	regC, _ := gin.CreateTestContext(regW)
	regC.Request = regReq

	Register(regC)
	assert.Equal(t, http.StatusCreated, regW.Code)

	// Now login with same credentials
	loginReq := models.LoginRequest{
		Email:    "login@example.com",
		Password: "TestPass123",
	}

	loginBody, _ := json.Marshal(loginReq)
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(loginBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	Login(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.LoginResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.NotEmpty(t, response.Token)
	assert.Equal(t, "login@example.com", response.User.Email)
	assert.NotZero(t, response.ExpiresAt)
}

// TestLogin_InvalidEmail tests login with non-existent email
func TestLogin_InvalidEmail(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	loginReq := models.LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "TestPass123",
	}

	body, _ := json.Marshal(loginReq)
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "unauthorized", response.Error)
}

// TestLogin_InvalidPassword tests login with wrong password
func TestLogin_InvalidPassword(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Register user
	registerReq := models.RegisterRequest{
		Email:     "wrongpass@example.com",
		Password:  "CorrectPass123",
		FirstName: "Wrong",
		LastName:  "Password",
	}

	regBody, _ := json.Marshal(registerReq)
	regReq := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	regReq.Header.Set("Content-Type", "application/json")

	regW := httptest.NewRecorder()
	regC, _ := gin.CreateTestContext(regW)
	regC.Request = regReq

	Register(regC)

	// Try login with wrong password
	loginReq := models.LoginRequest{
		Email:    "wrongpass@example.com",
		Password: "WrongPass123",
	}

	loginBody, _ := json.Marshal(loginReq)
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(loginBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "unauthorized", response.Error)
}

// TestLogin_MissingFields tests login with missing required fields
func TestLogin_MissingFields(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Missing password
	loginReq := models.LoginRequest{
		Email: "test@example.com",
		// Password missing
	}

	body, _ := json.Marshal(loginReq)
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	Login(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "validation_error", response.Error)
}

// TestLogout_Success tests successful logout
func TestLogout_Success(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	// Register and login first
	registerReq := models.RegisterRequest{
		Email:     "logout@example.com",
		Password:  "TestPass123",
		FirstName: "Logout",
		LastName:  "Test",
	}

	regBody, _ := json.Marshal(registerReq)
	regReq := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	regReq.Header.Set("Content-Type", "application/json")

	regW := httptest.NewRecorder()
	regC, _ := gin.CreateTestContext(regW)
	regC.Request = regReq

	Register(regC)

	// Login to get token
	loginReq := models.LoginRequest{
		Email:    "logout@example.com",
		Password: "TestPass123",
	}

	loginBody, _ := json.Marshal(loginReq)
	loginReqHTTP := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(loginBody))
	loginReqHTTP.Header.Set("Content-Type", "application/json")

	loginW := httptest.NewRecorder()
	loginC, _ := gin.CreateTestContext(loginW)
	loginC.Request = loginReqHTTP

	Login(loginC)

	var loginResponse models.LoginResponse
	json.Unmarshal(loginW.Body.Bytes(), &loginResponse)
	token := loginResponse.Token

	// Validate token to get claims
	claims, err := utils.ValidateToken(token)
	assert.NoError(t, err)

	// Now logout
	logoutReq := httptest.NewRequest("POST", "/api/auth/logout", nil)
	logoutReq.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = logoutReq

	// Set user claims in context (normally done by auth middleware)
	c.Set("user", claims)

	Logout(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Logged out successfully", response["message"])
}

// TestLogout_Unauthorized tests logout without authentication
func TestLogout_Unauthorized(t *testing.T) {
	setupTestDB(t)
	defer teardownTestDB()

	gin.SetMode(gin.TestMode)

	req := httptest.NewRequest("POST", "/api/auth/logout", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Don't set user in context (simulating no auth)

	Logout(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "unauthorized", response.Error)
}