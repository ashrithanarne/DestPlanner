package handlers

import (
	"backend/database"
	"backend/models"
	"backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type BookmarkRequest struct {
	Destination string `json:"destination"`
}

func SaveBookmark(c *gin.Context) {

	var req BookmarkRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Get user from JWT claims
	userClaims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	claims := userClaims.(*utils.Claims)
	userID := claims.UserID

	db := database.DB

	// Check if bookmark already exists
	var existingID int
	err := db.QueryRow(
		"SELECT id FROM bookmarks WHERE user_id = ? AND destination = ?",
		userID,
		req.Destination,
	).Scan(&existingID)

	if err == nil {
		// Bookmark already exists
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Bookmark already exists for this destination",
		})
		return
	}

	query := `INSERT INTO bookmarks (user_id, destination) VALUES (?, ?)`

	_, err = db.Exec(query, userID, req.Destination)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save bookmark"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bookmark saved successfully",
	})
}

// GetBookmarks retrieves all bookmarks for the authenticated user
func GetBookmarks(c *gin.Context) {

	// Get user from JWT claims
	userClaims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	claims := userClaims.(*utils.Claims)
	userID := claims.UserID

	rows, err := database.DB.Query(
		"SELECT id, user_id, destination FROM bookmarks WHERE user_id = ?",
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookmarks"})
		return
	}

	defer rows.Close()

	var bookmarks []models.Bookmark

	for rows.Next() {
		var bookmark models.Bookmark

		err := rows.Scan(
			&bookmark.ID,
			&bookmark.UserID,
			&bookmark.Destination,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading bookmarks"})
			return
		}

		bookmarks = append(bookmarks, bookmark)
	}

	c.JSON(http.StatusOK, bookmarks)
}

// DeleteBookmark deletes a bookmark for the authenticated user
func DeleteBookmark(c *gin.Context) {

	// Get bookmark ID from URL
	bookmarkID := c.Param("id")

	// Get user from JWT claims
	userClaims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	claims := userClaims.(*utils.Claims)
	userID := claims.UserID

	// Delete only if bookmark belongs to this user
	result, err := database.DB.Exec(
		"DELETE FROM bookmarks WHERE id = ? AND user_id = ?",
		bookmarkID,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bookmark"})
		return
	}

	rowsAffected, _ := result.RowsAffected()

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Bookmark not found or does not belong to the user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bookmark deleted successfully",
	})
}
