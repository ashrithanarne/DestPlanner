package handlers

import (
	"database/sql"
	"net/http"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

// GetAnalyticsSummary returns a summary of the user's trip and budget stats
func GetAnalyticsSummary(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}
	claims := userInterface.(*utils.Claims)

	// Get total trips
	var totalTrips int
	err := database.DB.QueryRow(
		"SELECT COUNT(*) FROM trips WHERE user_id = ?", claims.UserID,
	).Scan(&totalTrips)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to fetch trip count",
		})
		return
	}

	// Get total budgets and total spent
	var totalBudgets int
	var totalSpent sql.NullFloat64
	err = database.DB.QueryRow(
		"SELECT COUNT(*), SUM(spent_amount) FROM budgets WHERE user_id = ?",
		claims.UserID,
	).Scan(&totalBudgets, &totalSpent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to fetch budget stats",
		})
		return
	}

	spent := 0.0
	if totalSpent.Valid {
		spent = totalSpent.Float64
	}

	avgSpent := 0.0
	if totalTrips > 0 {
		avgSpent = spent / float64(totalTrips)
	}

	c.JSON(http.StatusOK, models.AnalyticsSummaryResponse{
		UserID: claims.UserID,
		Summary: models.AnalyticsSummary{
			TotalTrips:          totalTrips,
			TotalSpent:          spent,
			TotalBudgets:        totalBudgets,
			AverageSpentPerTrip: avgSpent,
		},
	})
}

// GetAnalyticsTrips returns a list of the user's trips with cost details
func GetAnalyticsTrips(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}
	claims := userInterface.(*utils.Claims)

	rows, err := database.DB.Query(`
		SELECT 
			t.id, 
			t.trip_name, 
			COALESCE(t.destination, '') as destination,
			COALESCE(date(t.start_date), '') as start_date,
			COALESCE(date(t.end_date), '') as end_date,
			t.status,
			COALESCE(b.spent_amount, 0) as total_cost
		FROM trips t
		LEFT JOIN budgets b ON b.trip_id = t.id
		WHERE t.user_id = ?
		ORDER BY t.created_at DESC
	`, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to fetch trips",
		})
		return
	}
	defer rows.Close()

	trips := []models.AnalyticsTrip{}
	for rows.Next() {
		var trip models.AnalyticsTrip
		err := rows.Scan(
			&trip.ID,
			&trip.TripName,
			&trip.Destination,
			&trip.StartDate,
			&trip.EndDate,
			&trip.Status,
			&trip.TotalCost,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "server_error",
				Message: "Error reading trips",
			})
			return
		}
		trips = append(trips, trip)
	}

	c.JSON(http.StatusOK, models.AnalyticsTripsResponse{
		UserID:     claims.UserID,
		TotalTrips: len(trips),
		Trips:      trips,
	})
}

// GetAnalyticsExpenses returns expense breakdown by category for the user
func GetAnalyticsExpenses(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}
	claims := userInterface.(*utils.Claims)

	rows, err := database.DB.Query(`
		SELECT 
			e.category,
			SUM(e.amount) as total_amount,
			COUNT(*) as count
		FROM expenses e
		JOIN budgets b ON e.budget_id = b.id
		WHERE b.user_id = ?
		GROUP BY e.category
		ORDER BY total_amount DESC
	`, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to fetch expense analytics",
		})
		return
	}
	defer rows.Close()

	categories := []models.AnalyticsExpenseCategory{}
	totalSpent := 0.0

	for rows.Next() {
		var cat models.AnalyticsExpenseCategory
		err := rows.Scan(&cat.Category, &cat.TotalAmount, &cat.Count)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "server_error",
				Message: "Error reading expense data",
			})
			return
		}
		totalSpent += cat.TotalAmount
		categories = append(categories, cat)
	}

	c.JSON(http.StatusOK, models.AnalyticsExpensesResponse{
		UserID:     claims.UserID,
		TotalSpent: totalSpent,
		Categories: categories,
	})
}
