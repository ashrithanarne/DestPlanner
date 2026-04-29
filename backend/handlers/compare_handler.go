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

	idsParam := c.Query("ids")
	if idsParam == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "ids query parameter is required e.g. ?ids=1,2,3",
		})
		return
	}

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

	destinations := []models.DestinationComparison{}
	for _, id := range ids {
		var dest models.DestinationComparison
		var bestSeason, travelTime string
		err := database.DB.QueryRow(
			"SELECT id, name, country, budget, description, COALESCE(best_season,''), COALESCE(travel_time,'') FROM destinations WHERE id = ?",
			id,
		).Scan(&dest.ID, &dest.Name, &dest.Country, &dest.Budget, &dest.Description, &bestSeason, &travelTime)

		if err != nil {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Destination with ID " + strconv.Itoa(id) + " not found",
			})
			return
		}

		dest.BestSeason = bestSeason
		dest.TravelTime = travelTime

		// Fetch top activities for this destination
		rows, err := database.DB.Query(
			"SELECT name FROM activities WHERE destination_id = ? LIMIT 5",
			id,
		)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var name string
				if rows.Scan(&name) == nil {
					dest.Activities = append(dest.Activities, name)
				}
			}
		}
		if dest.Activities == nil {
			dest.Activities = []string{}
		}

		destinations = append(destinations, dest)
	}

	c.JSON(http.StatusOK, models.CompareResponse{
		TotalDestinations: len(destinations),
		Destinations:      destinations,
	})
}
