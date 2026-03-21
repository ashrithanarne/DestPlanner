package handlers

import (
	"backend/database"
	"backend/models"
	"backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type BookmarkRequest struct {
	DestinationID int `json:"destination_id"`
}

func SaveBookmark(c *gin.Context) {
	var req BookmarkRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Get user from JWT claims
	userClaims, exist := c.Get("user")
	if !exist {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	claims := userClaims.(*utils.Claims)
	userID := claims.UserID
	db := database.DB

	// Check if destination exists
	var destExists int
	err := db.QueryRow("SELECT COUNT(*) FROM destinations WHERE id = ?", req.DestinationID).Scan(&destExists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking destination"})
		return
	}

	if destExists == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Destination ID does not exist"})
		return
	}

	// Check if bookmark already exists
	var exists int
	err = db.QueryRow(
		"SELECT COUNT(*) FROM bookmarks WHERE user_id = ? AND destination_id = ?",
		userID,
		req.DestinationID,
	).Scan(&exists)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking bookmark"})
		return
	}

	if exists > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bookmark already exists"})
		return
	}

	// Insert bookmark
	_, err = db.Exec(
		"INSERT INTO bookmarks (user_id, destination_id) VALUES (?, ?)",
		userID,
		req.DestinationID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save bookmark"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bookmark saved successfully"})
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

	query := `
	SELECT b.id, d.name
	FROM bookmarks b
	JOIN destinations d 
		ON b.destination_id = d.id
	WHERE b.user_id = ?
	`

	rows, err := database.DB.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookmarks"})
		return
	}
	defer rows.Close()

	var bookmarks []models.BookmarkResponse

	for rows.Next() {
		var bm models.BookmarkResponse

		err := rows.Scan(&bm.ID, &bm.Destination)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading bookmarks"})
			return
		}

		bookmarks = append(bookmarks, bm)
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
