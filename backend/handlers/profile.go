package handlers

import (
	"database/sql"
	"net/http"

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
