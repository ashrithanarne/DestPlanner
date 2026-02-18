package handlers

import (
	"database/sql"
	"net/http"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

// Login handles user login
func Login(c *gin.Context) {
	// Parse request body
	var loginReq models.LoginRequest
	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Validate input
	if loginReq.Email == "" || loginReq.Password == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "Email and password are required",
		})
		return
	}

	// Find user by email
	var user models.User
	query := "SELECT id, email, password_hash, first_name, last_name, created_at, updated_at FROM users WHERE email = ?"
	err := database.DB.QueryRow(query, loginReq.Email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid email or password",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "An error occurred while processing your request",
		})
		return
	}

	// Verify password
	if !utils.CheckPassword(loginReq.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid email or password",
		})
		return
	}

	// Generate JWT token
	token, expiresAt, err := utils.GenerateToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to generate authentication token",
		})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, models.LoginResponse{
		Token:     token,
		User:      user,
		ExpiresAt: expiresAt,
	})
}

// Register handles user registration
func Register(c *gin.Context) {
	var registerReq models.RegisterRequest

	// Parse request body
	if err := c.ShouldBindJSON(&registerReq); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Validate input
	if registerReq.Email == "" || registerReq.Password == "" ||
		registerReq.FirstName == "" || registerReq.LastName == "" {

		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "All fields are required",
		})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(registerReq.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to hash password",
		})
		return
	}

	// Insert user into database
	query := `
	INSERT INTO users (email, password_hash, first_name, last_name)
	VALUES (?, ?, ?, ?)
	`

	result, err := database.DB.Exec(query,
		registerReq.Email,
		hashedPassword,
		registerReq.FirstName,
		registerReq.LastName,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "user_exists",
			Message: "User with this email already exists",
		})
		return
	}

	// Get inserted user ID
	userID, _ := result.LastInsertId()

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user_id": userID,
	})
}
