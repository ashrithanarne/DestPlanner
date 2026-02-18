package handlers

import (
	"database/sql"
	"net/http"
	"strings"
	"time"  

	"github.com/gin-gonic/gin"
	"backend/database"
	"backend/models"
	"backend/utils"
)

// GetProfile returns the authenticated user's profile
func GetProfile(c *gin.Context) {
	// Get user claims from context (set by auth middleware)
	claimsInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not found in context",
		})
		return
	}

	claims, ok := claimsInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Fetch user from database
	var user models.User
	query := "SELECT id, email, first_name, last_name, created_at, updated_at FROM users WHERE id = ?"
	err := database.DB.QueryRow(query, claims.UserID).Scan(
		&user.ID,
		&user.Email,
		&user.FirstName,
		&user.LastName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "User not found",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to fetch user profile",
		})
		return
	}

	// Return user profile
	c.JSON(http.StatusOK, user)
}

// UpdateProfile updates the authenticated user's profile
func UpdateProfile(c *gin.Context) {
	// Get user claims from context (set by auth middleware)
	claimsInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not found in context",
		})
		return
	}

	claims, ok := claimsInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Parse request body
	var updateReq models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&updateReq); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Validate input - at least one field must be provided
	if updateReq.FirstName == "" && updateReq.LastName == "" && updateReq.Email == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "At least one field (first_name, last_name, or email) must be provided",
		})
		return
	}

	// Build dynamic UPDATE query based on provided fields
	updates := []string{}
	args := []interface{}{}

	if updateReq.FirstName != "" {
		updates = append(updates, "first_name = ?")
		args = append(args, updateReq.FirstName)
	}

	if updateReq.LastName != "" {
		updates = append(updates, "last_name = ?")
		args = append(args, updateReq.LastName)
	}

	if updateReq.Email != "" {
		// Validate email format
		if !strings.Contains(updateReq.Email, "@") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "validation_error",
				Message: "Invalid email format",
			})
			return
		}

		// Check if email is already taken by another user
		var existingUserID int
		checkQuery := "SELECT id FROM users WHERE email = ? AND id != ?"
		err := database.DB.QueryRow(checkQuery, updateReq.Email, claims.UserID).Scan(&existingUserID)
		if err == nil {
			// Email exists for another user
			c.JSON(http.StatusConflict, models.ErrorResponse{
				Error:   "conflict",
				Message: "Email already taken by another user",
			})
			return
		} else if err != sql.ErrNoRows {
			// Database error
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "server_error",
				Message: "Failed to check email availability",
			})
			return
		}

		updates = append(updates, "email = ?")
		args = append(args, updateReq.Email)
	}

	// Add updated_at timestamp
	updates = append(updates, "updated_at = ?")
	args = append(args, time.Now())

	// Add user ID to args (for WHERE clause)
	args = append(args, claims.UserID)

	// Execute update
	query := "UPDATE users SET " + strings.Join(updates, ", ") + " WHERE id = ?"
	result, err := database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to update profile",
		})
		return
	}

	// Check if user was actually updated
	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "User not found",
		})
		return
	}

	// Fetch updated user profile
	var user models.User
	selectQuery := "SELECT id, email, first_name, last_name, created_at, updated_at FROM users WHERE id = ?"
	err = database.DB.QueryRow(selectQuery, claims.UserID).Scan(
		&user.ID,
		&user.Email,
		&user.FirstName,
		&user.LastName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Profile updated but failed to fetch updated data",
		})
		return
	}

	// Return updated profile
	c.JSON(http.StatusOK, user)
}