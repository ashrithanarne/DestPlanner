package handlers

import (
	"backend/database"
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

	userID := c.GetInt("user_id")

	db := database.DB

	query := `INSERT INTO bookmarks (user_id, destination) VALUES (?, ?)`

	_, err := db.Exec(query, userID, req.Destination)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save bookmark"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bookmark saved successfully",
	})
}
