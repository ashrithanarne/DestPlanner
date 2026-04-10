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

// validActivityTypes is the set of allowed activity_type values.
var validActivityTypes = map[string]bool{
	"travel":        true,
	"accommodation": true,
	"activity":      true,
	"dining":        true,
	"other":         true,
}

// ──────────────────────────────────────────────────────────
// GET /api/trips/:id/timeline
// Returns all itinerary items for a trip grouped by day,
// in chronological order (date ASC, start_time ASC, sort_order ASC).
// ──────────────────────────────────────────────────────────
func GetTimeline(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid trip ID"})
		return
	}

	// Verify trip ownership and get trip meta
	var tripName string
	var startDateNull, endDateNull sql.NullString
	tripQuery := `SELECT trip_name, date(start_date), date(end_date) FROM trips WHERE id = ? AND user_id = ?`
	err = database.DB.QueryRow(tripQuery, tripID, claims.UserID).Scan(&tripName, &startDateNull, &endDateNull)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Trip not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve trip"})
		return
	}

	startDate := ""
	endDate := ""
	if startDateNull.Valid {
		startDate = startDateNull.String
	}
	if endDateNull.Valid {
		endDate = endDateNull.String
	}

	// Fetch items in chronological order
	itemsQuery := `
		SELECT id, trip_id, user_id, title, activity_type, date, start_time, end_time,
		       location, notes, sort_order, created_at, updated_at
		FROM itinerary_items
		WHERE trip_id = ?
		ORDER BY date ASC, start_time ASC, sort_order ASC, id ASC
	`
	rows, err := database.DB.Query(itemsQuery, tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve timeline items"})
		return
	}
	defer rows.Close()

	// Group items by date
	dayMap := make(map[string][]models.ItineraryItem)
	dateOrder := []string{} // preserve insertion order

	for rows.Next() {
		var item models.ItineraryItem
		var activityType string
		err := rows.Scan(
			&item.ID, &item.TripID, &item.UserID, &item.Title, &activityType,
			&item.Date, &item.StartTime, &item.EndTime,
			&item.Location, &item.Notes, &item.SortOrder,
			&item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			continue
		}
		item.ActivityType = models.ActivityType(activityType)

		if _, seen := dayMap[item.Date]; !seen {
			dateOrder = append(dateOrder, item.Date)
			dayMap[item.Date] = []models.ItineraryItem{}
		}
		dayMap[item.Date] = append(dayMap[item.Date], item)
	}

	// Build TimelineDay slice with day numbers
	days := []models.TimelineDay{}
	for _, date := range dateOrder {
		dayNumber := 1
		if startDate != "" {
			tripStart, err := time.Parse("2006-01-02", startDate)
			itemDate, err2 := time.Parse("2006-01-02", date)
			if err == nil && err2 == nil {
				diff := int(itemDate.Sub(tripStart).Hours()/24) + 1
				if diff > 0 {
					dayNumber = diff
				}
			}
		}
		days = append(days, models.TimelineDay{
			Date:      date,
			DayNumber: dayNumber,
			Items:     dayMap[date],
		})
	}

	c.JSON(http.StatusOK, models.TimelineResponse{
		TripID:    tripID,
		TripName:  tripName,
		StartDate: startDate,
		EndDate:   endDate,
		Days:      days,
	})
}

// ──────────────────────────────────────────────────────────
// POST /api/trips/:id/timeline/items
// Create a new itinerary item for the trip.
// ──────────────────────────────────────────────────────────
func CreateTimelineItem(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid trip ID"})
		return
	}

	// Verify trip belongs to user
	var exists2 int
	database.DB.QueryRow("SELECT COUNT(*) FROM trips WHERE id = ? AND user_id = ?", tripID, claims.UserID).Scan(&exists2)
	if exists2 == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Trip not found"})
		return
	}

	var req models.CreateItineraryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	// Validate activity_type
	if !validActivityTypes[req.ActivityType] {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "activity_type must be one of: travel, accommodation, activity, dining, other",
		})
		return
	}

	// Validate date format
	if _, err := time.Parse("2006-01-02", req.Date); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "date must be in YYYY-MM-DD format"})
		return
	}

	// Determine next sort_order for this date
	var maxOrder int
	database.DB.QueryRow(
		"SELECT COALESCE(MAX(sort_order), 0) FROM itinerary_items WHERE trip_id = ? AND date = ?",
		tripID, req.Date,
	).Scan(&maxOrder)
	sortOrder := maxOrder + 1

	insertQuery := `
		INSERT INTO itinerary_items
		  (trip_id, user_id, title, activity_type, date, start_time, end_time, location, notes, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	result, err := database.DB.Exec(insertQuery,
		tripID, claims.UserID,
		req.Title, req.ActivityType, req.Date,
		req.StartTime, req.EndTime,
		req.Location, req.Notes, sortOrder,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to create timeline item"})
		return
	}

	itemID, _ := result.LastInsertId()
	// Notify all itinerary collaborators about the new item
	go notifyItineraryChange(tripID, claims.UserID, req.Title+" added to itinerary")

	c.JSON(http.StatusCreated, gin.H{
		"message": "Timeline item created successfully",
		"item_id": itemID,
	})
}

// ──────────────────────────────────────────────────────────
// PUT /api/trips/:id/timeline/items/:itemId
// Update an existing itinerary item.
// ──────────────────────────────────────────────────────────
func UpdateTimelineItem(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid trip ID"})
		return
	}
	itemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid item ID"})
		return
	}

	var req models.UpdateItineraryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	if req.ActivityType != "" && !validActivityTypes[req.ActivityType] {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "activity_type must be one of: travel, accommodation, activity, dining, other",
		})
		return
	}

	if req.Date != "" {
		if _, err := time.Parse("2006-01-02", req.Date); err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "date must be in YYYY-MM-DD format"})
			return
		}
	}

	// Build dynamic update (only touch fields that were sent)
	query := "UPDATE itinerary_items SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}

	if req.Title != "" {
		query += ", title = ?"
		args = append(args, req.Title)
	}
	if req.ActivityType != "" {
		query += ", activity_type = ?"
		args = append(args, req.ActivityType)
	}
	if req.Date != "" {
		query += ", date = ?"
		args = append(args, req.Date)
	}
	if req.StartTime != "" {
		query += ", start_time = ?"
		args = append(args, req.StartTime)
	}
	if req.EndTime != "" {
		query += ", end_time = ?"
		args = append(args, req.EndTime)
	}
	if req.Location != "" {
		query += ", location = ?"
		args = append(args, req.Location)
	}
	if req.Notes != "" {
		query += ", notes = ?"
		args = append(args, req.Notes)
	}

	query += " WHERE id = ? AND trip_id = ? AND user_id = ?"
	args = append(args, itemID, tripID, claims.UserID)

	result, err := database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to update timeline item"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Timeline item not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Timeline item updated successfully"})
}

// ──────────────────────────────────────────────────────────
// DELETE /api/trips/:id/timeline/items/:itemId
// Delete an itinerary item.
// ──────────────────────────────────────────────────────────
func DeleteTimelineItem(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid trip ID"})
		return
	}
	itemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid item ID"})
		return
	}

	result, err := database.DB.Exec(
		"DELETE FROM itinerary_items WHERE id = ? AND trip_id = ? AND user_id = ?",
		itemID, tripID, claims.UserID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to delete timeline item"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Timeline item not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Timeline item deleted successfully"})
}

// ──────────────────────────────────────────────────────────
// PUT /api/trips/:id/timeline/items/:itemId/reorder
// Move an item to a new date and/or sort position (drag-and-drop support).
// Shifts other items on the target date to make room.
// ──────────────────────────────────────────────────────────
func ReorderTimelineItem(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid trip ID"})
		return
	}
	itemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid item ID"})
		return
	}

	var req models.ReorderItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "date and sort_order are required"})
		return
	}

	if _, err := time.Parse("2006-01-02", req.Date); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "date must be in YYYY-MM-DD format"})
		return
	}

	// Verify the item exists and belongs to this user/trip
	var currentDate string
	err = database.DB.QueryRow(
		"SELECT date FROM itinerary_items WHERE id = ? AND trip_id = ? AND user_id = ?",
		itemID, tripID, claims.UserID,
	).Scan(&currentDate)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Timeline item not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to reorder item"})
		return
	}

	// Shift items at the target position on the target date to make room
	_, err = database.DB.Exec(`
		UPDATE itinerary_items
		SET sort_order = sort_order + 1, updated_at = CURRENT_TIMESTAMP
		WHERE trip_id = ? AND date = ? AND sort_order >= ? AND id != ?
	`, tripID, req.Date, req.SortOrder, itemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to shift items"})
		return
	}

	// Move the item to its new position
	_, err = database.DB.Exec(`
		UPDATE itinerary_items
		SET date = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND trip_id = ? AND user_id = ?
	`, req.Date, req.SortOrder, itemID, tripID, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to move item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Timeline item reordered successfully"})
}

// notifyItineraryChange fires an itinerary_changed notification to all group
// members whose group is linked to tripID, excluding the actor who made the change.
// Called in a goroutine so it never blocks the HTTP response.
func notifyItineraryChange(tripID, actorUserID int, changeMsg string) {
	if database.DB == nil {
		return
	}

	// Find all users who are members of any group linked to this trip,
	// excluding the person who made the change.
	rows, err := database.DB.Query(`
		SELECT DISTINCT gm.user_id
		FROM group_members gm
		JOIN groups g ON g.id = gm.group_id
		WHERE g.trip_id = ? AND gm.user_id != ?
	`, tripID, actorUserID)
	if err != nil {
		return
	}
	defer rows.Close()

	// Also get the trip name for the message
	var tripName string
	database.DB.QueryRow("SELECT trip_name FROM trips WHERE id = ?", tripID).Scan(&tripName)
	if tripName == "" {
		tripName = "your trip"
	}

	tripIDCopy := tripID
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		prefs := getNotifPrefs(userID)
		if !prefs.ItineraryChanges {
			continue
		}
		CreateNotification(models.CreateNotificationRequest{
			UserID:  userID,
			Type:    models.NotificationItineraryChanged,
			Title:   "Itinerary updated",
			Message: "A collaborator updated the itinerary for \"" + tripName + "\": " + changeMsg,
			TripID:  &tripIDCopy,
		})
	}
}
