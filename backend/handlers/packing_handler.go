package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

// CreatePackingList creates a new packing list for a trip
func CreatePackingList(c *gin.Context) {
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
	var req models.CreatePackingListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Verify trip exists and belongs to user
	var tripID int
	checkTripQuery := "SELECT id FROM trips WHERE id = ? AND user_id = ?"
	err := database.DB.QueryRow(checkTripQuery, req.TripID, claims.UserID).Scan(&tripID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Trip not found",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to verify trip",
		})
		return
	}

	// Check if packing list already exists for this trip
	var existingID int
	checkQuery := "SELECT id FROM packing_lists WHERE trip_id = ? AND user_id = ?"
	err = database.DB.QueryRow(checkQuery, req.TripID, claims.UserID).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{
			Error:   "conflict",
			Message: "Packing list already exists for this trip",
		})
		return
	} else if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to check existing packing list",
		})
		return
	}

	// Create packing list
	query := `
		INSERT INTO packing_lists (trip_id, user_id, destination, climate, duration_days)
		VALUES (?, ?, ?, ?, ?)
	`

	result, err := database.DB.Exec(query,
		req.TripID,
		claims.UserID,
		req.Destination,
		req.Climate,
		req.DurationDays,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to create packing list",
		})
		return
	}

	packingListID, _ := result.LastInsertId()

	c.JSON(http.StatusCreated, gin.H{
		"message":         "Packing list created successfully",
		"packing_list_id": packingListID,
	})
}

// GetPackingList retrieves a packing list with all items
func GetPackingList(c *gin.Context) {
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

	// Get packing list
	var packingList models.PackingList
	query := `
		SELECT id, trip_id, user_id, destination, climate, duration_days, created_at, updated_at
		FROM packing_lists
		WHERE trip_id = ? AND user_id = ?
	`

	err = database.DB.QueryRow(query, tripID, claims.UserID).Scan(
		&packingList.ID,
		&packingList.TripID,
		&packingList.UserID,
		&packingList.Destination,
		&packingList.Climate,
		&packingList.DurationDays,
		&packingList.CreatedAt,
		&packingList.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Packing list not found for this trip",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to retrieve packing list",
		})
		return
	}

	// Get all items for this packing list
	itemsQuery := `
		SELECT id, packing_list_id, item_name, category, quantity, is_checked, is_suggested, notes, created_at
		FROM packing_items
		WHERE packing_list_id = ?
		ORDER BY category, item_name
	`

	rows, err := database.DB.Query(itemsQuery, packingList.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to retrieve packing items",
		})
		return
	}
	defer rows.Close()

	items := []models.PackingItem{}
	checkedCount := 0

	for rows.Next() {
		var item models.PackingItem
		err := rows.Scan(
			&item.ID,
			&item.PackingListID,
			&item.ItemName,
			&item.Category,
			&item.Quantity,
			&item.IsChecked,
			&item.IsSuggested,
			&item.Notes,
			&item.CreatedAt,
		)

		if err != nil {
			continue
		}

		if item.IsChecked {
			checkedCount++
		}

		items = append(items, item)
	}

	// Calculate completion percentage
	totalItems := len(items)
	percentComplete := 0.0
	if totalItems > 0 {
		percentComplete = (float64(checkedCount) / float64(totalItems)) * 100
	}

	response := models.PackingListWithItems{
		PackingList:     packingList,
		Items:           items,
		TotalItems:      totalItems,
		CheckedItems:    checkedCount,
		PercentComplete: percentComplete,
	}

	c.JSON(http.StatusOK, response)
}

// AddPackingItem adds a custom item to a packing list
func AddPackingItem(c *gin.Context) {
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

	// Parse request body
	var req models.AddPackingItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Get packing list ID
	var packingListID int
	checkQuery := "SELECT id FROM packing_lists WHERE trip_id = ? AND user_id = ?"
	err = database.DB.QueryRow(checkQuery, tripID, claims.UserID).Scan(&packingListID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Packing list not found for this trip",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to find packing list",
		})
		return
	}

	// Set default quantity if not provided
	quantity := req.Quantity
	if quantity <= 0 {
		quantity = 1
	}

	// Add item
	query := `
		INSERT INTO packing_items (packing_list_id, item_name, category, quantity, notes, is_suggested)
		VALUES (?, ?, ?, ?, ?, 0)
	`

	result, err := database.DB.Exec(query,
		packingListID,
		req.ItemName,
		req.Category,
		quantity,
		req.Notes,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to add item",
		})
		return
	}

	itemID, _ := result.LastInsertId()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Item added successfully",
		"item_id": itemID,
	})
}

// UpdatePackingItem updates a packing item (check/uncheck, edit details)
func UpdatePackingItem(c *gin.Context) {
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

	// Get item ID
	itemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid item ID",
		})
		return
	}

	// Verify item belongs to user's packing list
	var userID int
	checkQuery := `
		SELECT pl.user_id 
		FROM packing_items pi
		JOIN packing_lists pl ON pi.packing_list_id = pl.id
		WHERE pi.id = ?
	`
	err = database.DB.QueryRow(checkQuery, itemID).Scan(&userID)
	if err == sql.ErrNoRows || userID != claims.UserID {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Item not found",
		})
		return
	}

	// Parse request body
	var req models.UpdatePackingItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}

	if req.ItemName != "" {
		updates = append(updates, "item_name = ?")
		args = append(args, req.ItemName)
	}

	if req.Category != "" {
		updates = append(updates, "category = ?")
		args = append(args, req.Category)
	}

	if req.Quantity > 0 {
		updates = append(updates, "quantity = ?")
		args = append(args, req.Quantity)
	}

	if req.IsChecked != nil {
		updates = append(updates, "is_checked = ?")
		args = append(args, *req.IsChecked)
	}

	if req.Notes != "" {
		updates = append(updates, "notes = ?")
		args = append(args, req.Notes)
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "No fields to update",
		})
		return
	}

	// Execute update
	query := "UPDATE packing_items SET "
	for i, update := range updates {
		if i > 0 {
			query += ", "
		}
		query += update
	}
	query += " WHERE id = ?"
	args = append(args, itemID)

	_, err = database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to update item",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Item updated successfully",
	})
}

// DeletePackingItem deletes an item from a packing list
func DeletePackingItem(c *gin.Context) {
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

	// Get item ID
	itemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid item ID",
		})
		return
	}

	// Verify item belongs to user's packing list
	var userID int
	checkQuery := `
		SELECT pl.user_id 
		FROM packing_items pi
		JOIN packing_lists pl ON pi.packing_list_id = pl.id
		WHERE pi.id = ?
	`
	err = database.DB.QueryRow(checkQuery, itemID).Scan(&userID)
	if err == sql.ErrNoRows || userID != claims.UserID {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Item not found",
		})
		return
	}

	// Delete item
	query := "DELETE FROM packing_items WHERE id = ?"
	_, err = database.DB.Exec(query, itemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to delete item",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Item deleted successfully",
	})
}

// GetSuggestedItems returns suggested packing items based on climate and duration
func GetSuggestedItems(c *gin.Context) {
	// Get user from context
	_, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	// Get parameters
	climate := c.Query("climate")
	durationStr := c.Query("duration_days")
	
	duration := 0
	if durationStr != "" {
		duration, _ = strconv.Atoi(durationStr)
	}

	// Base items for all trips
	suggestions := []models.PackingItem{
		{ItemName: "Passport/ID", Category: "Documents", Quantity: 1, IsSuggested: true},
		{ItemName: "Phone charger", Category: "Electronics", Quantity: 1, IsSuggested: true},
		{ItemName: "Toiletries", Category: "Personal Care", Quantity: 1, IsSuggested: true},
		{ItemName: "Medications", Category: "Health", Quantity: 1, IsSuggested: true},
		{ItemName: "Underwear", Category: "Clothing", Quantity: duration, IsSuggested: true},
		{ItemName: "Socks", Category: "Clothing", Quantity: duration, IsSuggested: true},
	}

	// Climate-specific items
	switch climate {
	case "tropical", "hot", "summer":
		suggestions = append(suggestions,
			models.PackingItem{ItemName: "Sunscreen", Category: "Personal Care", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Sunglasses", Category: "Accessories", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Hat", Category: "Accessories", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Light clothing", Category: "Clothing", Quantity: 3, IsSuggested: true},
			models.PackingItem{ItemName: "Sandals", Category: "Footwear", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Swimsuit", Category: "Clothing", Quantity: 1, IsSuggested: true},
		)
	case "cold", "winter", "snow":
		suggestions = append(suggestions,
			models.PackingItem{ItemName: "Winter coat", Category: "Clothing", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Gloves", Category: "Accessories", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Scarf", Category: "Accessories", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Warm hat", Category: "Accessories", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Thermal underwear", Category: "Clothing", Quantity: 2, IsSuggested: true},
			models.PackingItem{ItemName: "Winter boots", Category: "Footwear", Quantity: 1, IsSuggested: true},
		)
	case "rainy", "monsoon":
		suggestions = append(suggestions,
			models.PackingItem{ItemName: "Rain jacket", Category: "Clothing", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Umbrella", Category: "Accessories", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Waterproof bag", Category: "Accessories", Quantity: 1, IsSuggested: true},
		)
	default:
		suggestions = append(suggestions,
			models.PackingItem{ItemName: "Light jacket", Category: "Clothing", Quantity: 1, IsSuggested: true},
			models.PackingItem{ItemName: "Comfortable shoes", Category: "Footwear", Quantity: 1, IsSuggested: true},
		)
	}

	// Duration-based items
	if duration > 7 {
		suggestions = append(suggestions,
			models.PackingItem{ItemName: "Laundry detergent", Category: "Personal Care", Quantity: 1, IsSuggested: true},
		)
	}

	c.JSON(http.StatusOK, gin.H{
		"suggestions": suggestions,
	})
}

// DeletePackingList deletes an entire packing list
func DeletePackingList(c *gin.Context) {
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

	// Delete packing list (items will cascade delete)
	query := "DELETE FROM packing_lists WHERE trip_id = ? AND user_id = ?"
	result, err := database.DB.Exec(query, tripID, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to delete packing list",
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Packing list not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Packing list deleted successfully",
	})
}