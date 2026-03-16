package handlers

import (
	"backend/database"
	"backend/models"
	"database/sql"
	"net/http"

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

	var rows *sql.Rows
	var err error

	if budget != "" {

		rows, err = database.DB.Query(
			"SELECT id, name, country, budget, description FROM destinations WHERE budget <= ?",
			budget,
		)

	} else {

		rows, err = database.DB.Query(
			"SELECT id, name, country, budget, description FROM destinations",
		)

	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch destinations"})
		return
	}

	defer rows.Close()

	var destinations []models.Destination

	for rows.Next() {

		var d models.Destination

		err := rows.Scan(
			&d.ID,
			&d.Name,
			&d.Country,
			&d.Budget,
			&d.Description,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading destinations"})
			return
		}

		destinations = append(destinations, d)

	}

	c.JSON(http.StatusOK, destinations)

}

// GetDestinationByID retrieves a single destination by its ID
func GetDestinationByID(c *gin.Context) {

	id := c.Param("id")

	row := database.DB.QueryRow(
		"SELECT id, name, country, budget, description FROM destinations WHERE id = ?",
		id,
	)

	var d models.Destination

	err := row.Scan(
		&d.ID,
		&d.Name,
		&d.Country,
		&d.Budget,
		&d.Description,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Destination not found"})
		return
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
