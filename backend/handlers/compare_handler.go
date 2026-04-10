package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
)

// CompareDestinations compares 2-3 destinations side by side
func CompareDestinations(c *gin.Context) {

	// Get ids query param e.g. ?ids=1,2,3
	idsParam := c.Query("ids")
	if idsParam == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "ids query parameter is required e.g. ?ids=1,2,3",
		})
		return
	}

	// Split and parse the IDs
	idStrings := strings.Split(idsParam, ",")

	if len(idStrings) < 2 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "At least 2 destination IDs are required for comparison",
		})
		return
	}

	if len(idStrings) > 3 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "You can compare a maximum of 3 destinations at a time",
		})
		return
	}

	// Validate all IDs are valid integers and no duplicates
	seen := make(map[int]bool)
	var ids []int
	for _, idStr := range idStrings {
		idStr = strings.TrimSpace(idStr)
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "validation_error",
				Message: "All IDs must be valid integers",
			})
			return
		}
		if seen[id] {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "validation_error",
				Message: "Duplicate destination IDs are not allowed",
			})
			return
		}
		seen[id] = true
		ids = append(ids, id)
	}

	// Fetch each destination
	destinations := []models.DestinationComparison{}
	for _, id := range ids {
		var dest models.DestinationComparison
		err := database.DB.QueryRow(
			"SELECT id, name, country, budget, description FROM destinations WHERE id = ?",
			id,
		).Scan(&dest.ID, &dest.Name, &dest.Country, &dest.Budget, &dest.Description)

		if err != nil {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Destination with ID " + strconv.Itoa(id) + " not found",
			})
			return
		}

		destinations = append(destinations, dest)
	}

	c.JSON(http.StatusOK, models.CompareResponse{
		TotalDestinations: len(destinations),
		Destinations:      destinations,
	})
}
