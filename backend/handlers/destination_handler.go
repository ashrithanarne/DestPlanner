package handlers

import (
	"backend/database"
	"backend/models"
	"backend/utils"
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type DestinationRequest struct {
	Name        string  `json:"name"`
	Country     string  `json:"country"`
	Budget      float64 `json:"budget"`
	Description string  `json:"description"`
}

// CreateDestination handles the creation of a new destination
func CreateDestination(c *gin.Context) {

	var req DestinationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	query := `
	INSERT INTO destinations (name, country, budget, description)
	VALUES (?, ?, ?, ?)
	`

	_, err := database.DB.Exec(
		query,
		req.Name,
		req.Country,
		req.Budget,
		req.Description,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create destination"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Destination created"})
}

// GetDestinations retrieves all destinations, optionally filtered by budget
func GetDestinations(c *gin.Context) {
	budget := c.Query("budget")
	country := c.Query("country")

	db := database.DB
	var rows *sql.Rows
	var err error

	// Check if user is logged in
	var userID int
	userClaims, exists := c.Get("user")
	if exists {
		claims := userClaims.(*utils.Claims)
		userID = claims.UserID
	}

	// Base query and args
	query := "SELECT id, name, country, budget, description"
	args := []interface{}{}

	if exists {
		// Logged-in user: include bookmark info
		query += ", CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked " +
			"FROM destinations t " +
			"LEFT JOIN bookmarks b ON b.destination_id = t.id AND b.user_id = ? "
		args = append(args, userID)
	} else {
		// Public user: no bookmark info
		query += " FROM destinations t "
	}

	// Add WHERE conditions
	where := []string{}
	if budget != "" {
		where = append(where, "t.budget <= ?")
		args = append(args, budget)
	}
	if country != "" {
		where = append(where, "t.country = ?")
		args = append(args, country)
	}

	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}

	// Execute query
	rows, err = db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch destinations"})
		return
	}
	defer rows.Close()

	// Scan results
	destinations := []models.DestinationResponse{}
	for rows.Next() {
		var d models.DestinationResponse
		if exists {
			// Include is_bookmarked
			var isBookmarked int
			if err := rows.Scan(&d.ID, &d.Name, &d.Country, &d.Budget, &d.Description, &isBookmarked); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading destinations"})
				return
			}
			d.IsBookmarked = isBookmarked == 1
		} else {
			// No bookmark info
			if err := rows.Scan(&d.ID, &d.Name, &d.Country, &d.Budget, &d.Description); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading destinations"})
				return
			}
			d.IsBookmarked = false
		}
		destinations = append(destinations, d)
	}

	c.JSON(http.StatusOK, destinations)
}

// GetDestinationByID retrieves a single destination by its ID
func GetDestinationByID(c *gin.Context) {
	idParam := c.Param("id")
	destID, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid destination ID"})
		return
	}

	db := database.DB

	// Check if user is logged in
	var userID int
	userClaims, exists := c.Get("user")
	if exists {
		claims := userClaims.(*utils.Claims)
		userID = claims.UserID
	}

	// Base query
	query := "SELECT id, name, country, budget, description"
	args := []interface{}{destID}

	if exists {
		// Logged-in user: include bookmark info
		query += ", CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked " +
			"FROM destinations t " +
			"LEFT JOIN bookmarks b ON b.destination_id = t.id AND b.user_id = ? " +
			"WHERE t.id = ?"
		args = append([]interface{}{userID}, args...) // first userID, then destID
	} else {
		// Public user: no bookmark info
		query += " FROM destinations t WHERE t.id = ?"
	}

	row := db.QueryRow(query, args...)

	var d models.DestinationResponse

	if exists {
		// Logged-in: scan is_bookmarked
		var isBookmarked int
		err = row.Scan(&d.ID, &d.Name, &d.Country, &d.Budget, &d.Description, &isBookmarked)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Destination not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching destination"})
			}
			return
		}
		d.IsBookmarked = isBookmarked == 1
	} else {
		// Public user: no bookmark info
		err = row.Scan(&d.ID, &d.Name, &d.Country, &d.Budget, &d.Description)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Destination not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching destination"})
			}
			return
		}
		d.IsBookmarked = false
	}

	c.JSON(http.StatusOK, d)
}

// UpdateDestination updates an existing destination by its ID
func UpdateDestination(c *gin.Context) {

	id := c.Param("id")

	var req DestinationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	query := `
	UPDATE destinations
	SET name = ?, country = ?, budget = ?, description = ?
	WHERE id = ?
	`

	result, err := database.DB.Exec(
		query,
		req.Name,
		req.Country,
		req.Budget,
		req.Description,
		id,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update destination"})
		return
	}

	rowsAffected, _ := result.RowsAffected()

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Destination not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Destination updated successfully",
	})
}

// DeleteDestination deletes a destination by its ID
func DeleteDestination(c *gin.Context) {

	id := c.Param("id")

	result, err := database.DB.Exec(
		"DELETE FROM destinations WHERE id = ?",
		id,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete destination"})
		return
	}

	rowsAffected, _ := result.RowsAffected()

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Destination not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Destination deleted"})
}

// SuggestDestinations provides autocomplete suggestions based on a query string
// Debouncing and rate limiting should be handled on the frontend to avoid excessive requests to this endpoint
func SuggestDestinations(c *gin.Context) {

	query := c.Query("q")

	// If nothing typed, return empty list
	if query == "" {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}

	// To avoid too many results and reduce load, only search if query is at least 2 characters
	if len(query) < 2 {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}

	rows, err := database.DB.Query(
		`SELECT id, name
		 FROM destinations
		 WHERE LOWER(name) LIKE LOWER(?)
		 LIMIT 10`,
		query+"%",
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch suggestions",
		})
		return
	}

	defer rows.Close()

	type Suggestion struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	}

	var suggestions []Suggestion

	for rows.Next() {
		var s Suggestion

		err := rows.Scan(&s.ID, &s.Name)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Error reading suggestions",
			})
			return
		}

		suggestions = append(suggestions, s)
	}

	c.JSON(http.StatusOK, suggestions)
}
