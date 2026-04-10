package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

type ReviewRequest struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

// CreateReview adds a review for a destination
func CreateReview(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	destID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid destination ID"})
		return
	}

	var req ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	// Validate rating
	if req.Rating < 1 || req.Rating > 5 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "Rating must be between 1 and 5"})
		return
	}

	if req.Comment == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "Comment is required"})
		return
	}

	// Check destination exists
	var destExists int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM destinations WHERE id = ?", destID).Scan(&destExists)
	if err != nil || destExists == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Destination not found"})
		return
	}

	// Check if user already reviewed this destination
	var existingReview int
	err = database.DB.QueryRow(
		"SELECT COUNT(*) FROM reviews WHERE destination_id = ? AND user_id = ?",
		destID, claims.UserID,
	).Scan(&existingReview)
	if err == nil && existingReview > 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "already_exists", Message: "You have already reviewed this destination"})
		return
	}

	now := time.Now()
	result, err := database.DB.Exec(
		"INSERT INTO reviews (destination_id, user_id, rating, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		destID, claims.UserID, req.Rating, req.Comment, now, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to create review"})
		return
	}

	reviewID, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{
		"message":   "Review created successfully",
		"review_id": reviewID,
	})
}

// GetReviews returns all reviews for a destination with average rating
func GetReviews(c *gin.Context) {
	destID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid destination ID"})
		return
	}

	// Check destination exists
	var destExists int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM destinations WHERE id = ?", destID).Scan(&destExists)
	if err != nil || destExists == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Destination not found"})
		return
	}

	// Get average rating
	var avgRating sql.NullFloat64
	var totalReviews int
	database.DB.QueryRow(
		"SELECT AVG(rating), COUNT(*) FROM reviews WHERE destination_id = ?", destID,
	).Scan(&avgRating, &totalReviews)

	// Get all reviews with reviewer name
	rows, err := database.DB.Query(`
		SELECT r.id, r.destination_id, r.user_id, u.first_name, u.last_name,
		       r.rating, r.comment, r.created_at, r.updated_at
		FROM reviews r
		JOIN users u ON r.user_id = u.id
		WHERE r.destination_id = ?
		ORDER BY r.created_at DESC
	`, destID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to fetch reviews"})
		return
	}
	defer rows.Close()

	reviews := []models.ReviewResponse{}
	for rows.Next() {
		var rev models.ReviewResponse
		var firstName, lastName string
		err := rows.Scan(
			&rev.ID, &rev.DestinationID, &rev.UserID,
			&firstName, &lastName,
			&rev.Rating, &rev.Comment, &rev.CreatedAt, &rev.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Error reading reviews"})
			return
		}
		rev.ReviewerName = firstName + " " + lastName
		reviews = append(reviews, rev)
	}
	avg := 0.0
	if avgRating.Valid {
		avg = avgRating.Float64
	}

	c.JSON(http.StatusOK, gin.H{
		"destination_id": destID,
		"average_rating": avg,
		"total_reviews":  totalReviews,
		"reviews":        reviews,
	})
}

// UpdateReview updates the authenticated user's review
func UpdateReview(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	reviewID, err := strconv.Atoi(c.Param("reviewId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid review ID"})
		return
	}

	var req ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	if req.Rating < 1 || req.Rating > 5 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "Rating must be between 1 and 5"})
		return
	}

	if req.Comment == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "Comment is required"})
		return
	}

	// Check review exists and belongs to user
	var ownerID int
	err = database.DB.QueryRow("SELECT user_id FROM reviews WHERE id = ?", reviewID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Review not found"})
		return
	}
	if ownerID != claims.UserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "You can only edit your own reviews"})
		return
	}

	_, err = database.DB.Exec(
		"UPDATE reviews SET rating = ?, comment = ?, updated_at = ? WHERE id = ?",
		req.Rating, req.Comment, time.Now(), reviewID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to update review"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Review updated successfully"})
}

// DeleteReview deletes the authenticated user's review
func DeleteReview(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	reviewID, err := strconv.Atoi(c.Param("reviewId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid review ID"})
		return
	}

	// Check review exists and belongs to user
	var ownerID int
	err = database.DB.QueryRow("SELECT user_id FROM reviews WHERE id = ?", reviewID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Review not found"})
		return
	}
	if ownerID != claims.UserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "You can only delete your own reviews"})
		return
	}

	_, err = database.DB.Exec("DELETE FROM reviews WHERE id = ?", reviewID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to delete review"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Review deleted successfully"})
}
