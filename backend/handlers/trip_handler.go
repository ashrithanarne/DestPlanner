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

// packingProgressForTrip returns packing progress for a trip
// Returns nil if no packing list exists, or a pointer to the percentage (0.0-100.0)
func packingProgressForTrip(tripID int) *float64 {
	var packingListID int
	checkPackingQuery := "SELECT id FROM packing_lists WHERE trip_id = ?"
	err := database.DB.QueryRow(checkPackingQuery, tripID).Scan(&packingListID)

	if err != nil {
		// No packing list exists
		return nil
	}

	// Get packing progress
	var totalItems, checkedItems int
	progressQuery := `
		SELECT COUNT(*), SUM(CASE WHEN is_checked = 1 THEN 1 ELSE 0 END)
		FROM packing_items
		WHERE packing_list_id = ?
	`
	database.DB.QueryRow(progressQuery, packingListID).Scan(&totalItems, &checkedItems)

	percentage := 0.0
	if totalItems > 0 {
		percentage = (float64(checkedItems) / float64(totalItems)) * 100
	}

	return &percentage
}

// CreateTrip creates a new trip
func CreateTrip(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Parse request body
	var req models.CreateTripRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Parse dates if provided
	var startDate, endDate interface{}
	startDate, endDate = nil, nil

	if req.StartDate != "" {
		parsedStart, err := time.Parse("2006-01-02", req.StartDate)
		if err == nil {
			startDate = parsedStart
		}
	}

	if req.EndDate != "" {
		parsedEnd, err := time.Parse("2006-01-02", req.EndDate)
		if err == nil {
			endDate = parsedEnd
		}
	}

	// Insert trip
	query := `
		INSERT INTO trips (user_id, trip_name, destination, start_date, end_date, notes, status)
		VALUES (?, ?, ?, ?, ?, ?, 'planning')
	`

	result, err := database.DB.Exec(query,
		claims.UserID,
		req.TripName,
		req.Destination,
		startDate,
		endDate,
		req.Notes,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to create trip",
		})
		return
	}

	tripID, _ := result.LastInsertId()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Trip created successfully",
		"trip_id": tripID,
	})
}

// GetTrips retrieves all trips for the authenticated user
func GetTrips(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Optional status filter
	status := c.Query("status")

	// Build query
	query := `
		SELECT id, user_id, trip_name, destination, start_date, end_date, 
		       notes, status, created_at, updated_at
		FROM trips
		WHERE user_id = ?
	`
	args := []interface{}{claims.UserID}

	if status != "" {
		query += " AND status = ?"
		args = append(args, status)
	}

	query += " ORDER BY start_date DESC, created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to retrieve trips",
		})
		return
	}
	defer rows.Close()

	trips := []models.TripSummary{}

	for rows.Next() {
		var trip models.Trip
		var startDate, endDate sql.NullTime

		err := rows.Scan(
			&trip.ID,
			&trip.UserID,
			&trip.TripName,
			&trip.Destination,
			&startDate,
			&endDate,
			&trip.Notes,
			&trip.Status,
			&trip.CreatedAt,
			&trip.UpdatedAt,
		)

		if err != nil {
			continue
		}

		if startDate.Valid {
			trip.StartDate = startDate.Time
		}
		if endDate.Valid {
			trip.EndDate = endDate.Time
		}

		// Calculate duration
		durationDays := 0
		if startDate.Valid && endDate.Valid {
			duration := endDate.Time.Sub(startDate.Time)
			durationDays = int(duration.Hours() / 24)
		}

		summary := models.TripSummary{
			Trip:            trip,
			DurationDays:    durationDays,
			PackingProgress: packingProgressForTrip(trip.ID),
		}

		trips = append(trips, summary)
	}

	c.JSON(http.StatusOK, gin.H{
		"trips": trips,
	})
}

// GetTripByID retrieves a specific trip
func GetTripByID(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get trip ID from URL
	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid trip ID",
		})
		return
	}

	// Query trip
	query := `
		SELECT id, user_id, trip_name, destination, start_date, end_date, 
		       notes, status, created_at, updated_at
		FROM trips
		WHERE id = ? AND user_id = ?
	`

	var trip models.Trip
	var startDate, endDate sql.NullTime

	err = database.DB.QueryRow(query, tripID, claims.UserID).Scan(
		&trip.ID,
		&trip.UserID,
		&trip.TripName,
		&trip.Destination,
		&startDate,
		&endDate,
		&trip.Notes,
		&trip.Status,
		&trip.CreatedAt,
		&trip.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Trip not found",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to retrieve trip",
		})
		return
	}

	if startDate.Valid {
		trip.StartDate = startDate.Time
	}
	if endDate.Valid {
		trip.EndDate = endDate.Time
	}

	// Calculate duration
	durationDays := 0
	if startDate.Valid && endDate.Valid {
		duration := endDate.Time.Sub(startDate.Time)
		durationDays = int(duration.Hours() / 24)
	}

	summary := models.TripSummary{
		Trip:            trip,
		DurationDays:    durationDays,
		PackingProgress: packingProgressForTrip(trip.ID),
	}

	c.JSON(http.StatusOK, summary)
}

// UpdateTrip updates an existing trip
func UpdateTrip(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get trip ID
	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid trip ID",
		})
		return
	}

	// Parse request body
	var req models.UpdateTripRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Build dynamic update query
	query := "UPDATE trips SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}

	if req.TripName != "" {
		query += ", trip_name = ?"
		args = append(args, req.TripName)
	}
	if req.Destination != "" {
		query += ", destination = ?"
		args = append(args, req.Destination)
	}
	if req.StartDate != "" {
		parsedStart, err := time.Parse("2006-01-02", req.StartDate)
		if err == nil {
			query += ", start_date = ?"
			args = append(args, parsedStart)
		}
	}
	if req.EndDate != "" {
		parsedEnd, err := time.Parse("2006-01-02", req.EndDate)
		if err == nil {
			query += ", end_date = ?"
			args = append(args, parsedEnd)
		}
	}
	if req.Notes != "" {
		query += ", notes = ?"
		args = append(args, req.Notes)
	}
	if req.Status != "" {
		query += ", status = ?"
		args = append(args, req.Status)
	}

	query += " WHERE id = ? AND user_id = ?"
	args = append(args, tripID, claims.UserID)

	result, err := database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to update trip",
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Trip not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Trip updated successfully",
	})
}

// DeleteTrip deletes a trip and all related data
func DeleteTrip(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get trip ID
	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid trip ID",
		})
		return
	}

	// Delete trip (packing lists will cascade delete)
	query := "DELETE FROM trips WHERE id = ? AND user_id = ?"
	result, err := database.DB.Exec(query, tripID, claims.UserID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to delete trip",
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Trip not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Trip deleted successfully",
	})
}
