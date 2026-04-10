package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
)

// GetActivities returns all activities for a destination
func GetActivities(c *gin.Context) {
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

	rows, err := database.DB.Query(`
		SELECT id, destination_id, name, description, category, created_at, updated_at
		FROM activities
		WHERE destination_id = ?
		ORDER BY name ASC
	`, destID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to fetch activities"})
		return
	}
	defer rows.Close()

	activities := []models.ActivityResponse{}
	for rows.Next() {
		var a models.ActivityResponse
		var description, category sql.NullString
		err := rows.Scan(&a.ID, &a.DestinationID, &a.Name, &description, &category, &a.CreatedAt, &a.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Error reading activities"})
			return
		}
		if description.Valid {
			a.Description = description.String
		}
		if category.Valid {
			a.Category = category.String
		}
		activities = append(activities, a)
	}

	c.JSON(http.StatusOK, gin.H{
		"destination_id":   destID,
		"total_activities": len(activities),
		"activities":       activities,
	})
}

// CreateActivity adds a new activity for a destination
func CreateActivity(c *gin.Context) {
	_, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}

	destID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid destination ID"})
		return
	}

	var req models.CreateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	if req.Name == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "Activity name is required"})
		return
	}

	// Check destination exists
	var destExists int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM destinations WHERE id = ?", destID).Scan(&destExists)
	if err != nil || destExists == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Destination not found"})
		return
	}

	now := time.Now()
	result, err := database.DB.Exec(
		"INSERT INTO activities (destination_id, name, description, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		destID, req.Name, req.Description, req.Category, now, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to create activity"})
		return
	}

	activityID, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{
		"message":     "Activity created successfully",
		"activity_id": activityID,
	})
}

// UpdateActivity updates an existing activity
func UpdateActivity(c *gin.Context) {
	_, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}

	activityID, err := strconv.Atoi(c.Param("activityId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid activity ID"})
		return
	}

	var req models.UpdateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	if req.Name == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "Activity name is required"})
		return
	}

	// Check activity exists
	var existingID int
	err = database.DB.QueryRow("SELECT id FROM activities WHERE id = ?", activityID).Scan(&existingID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Activity not found"})
		return
	}

	_, err = database.DB.Exec(
		"UPDATE activities SET name = ?, description = ?, category = ?, updated_at = ? WHERE id = ?",
		req.Name, req.Description, req.Category, time.Now(), activityID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to update activity"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Activity updated successfully"})
}

// DeleteActivity deletes an activity by ID
func DeleteActivity(c *gin.Context) {
	_, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}

	activityID, err := strconv.Atoi(c.Param("activityId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid activity ID"})
		return
	}

	// Check activity exists
	var existingID int
	err = database.DB.QueryRow("SELECT id FROM activities WHERE id = ?", activityID).Scan(&existingID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Activity not found"})
		return
	}

	_, err = database.DB.Exec("DELETE FROM activities WHERE id = ?", activityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to delete activity"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Activity deleted successfully"})
}
