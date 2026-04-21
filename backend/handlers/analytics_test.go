package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/database"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupAnalyticsRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Set("user", &utils.Claims{UserID: 1})
		c.Next()
	})

	r.GET("/api/analytics/summary", GetAnalyticsSummary)
	r.GET("/api/analytics/trips", GetAnalyticsTrips)
	r.GET("/api/analytics/expenses", GetAnalyticsExpenses)

	return r
}

func setupAnalyticsDB(t *testing.T) {
	err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}

	_, err = database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS trips (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			trip_name TEXT NOT NULL,
			destination TEXT,
			start_date DATETIME,
			end_date DATETIME,
			status TEXT DEFAULT 'planning',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS budgets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			trip_id INTEGER,
			trip_name TEXT NOT NULL,
			total_budget REAL NOT NULL,
			spent_amount REAL DEFAULT 0,
			currency TEXT DEFAULT 'USD',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS expenses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			budget_id INTEGER NOT NULL,
			category TEXT NOT NULL,
			amount REAL NOT NULL,
			description TEXT,
			expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	// Seed trips
	database.DB.Exec(`INSERT INTO trips (id, user_id, trip_name, destination, status) VALUES (1, 1, 'Paris Trip', 'Paris', 'completed')`)
	database.DB.Exec(`INSERT INTO trips (id, user_id, trip_name, destination, status) VALUES (2, 1, 'Tokyo Trip', 'Tokyo', 'planning')`)

	// Seed budgets linked to trips
	database.DB.Exec(`INSERT INTO budgets (id, user_id, trip_id, trip_name, total_budget, spent_amount) VALUES (1, 1, 1, 'Paris Budget', 3000, 1500)`)
	database.DB.Exec(`INSERT INTO budgets (id, user_id, trip_id, trip_name, total_budget, spent_amount) VALUES (2, 1, 2, 'Tokyo Budget', 4000, 800)`)

	// Seed expenses
	database.DB.Exec(`INSERT INTO expenses (budget_id, category, amount, description) VALUES (1, 'Accommodation', 800, 'Hotel')`)
	database.DB.Exec(`INSERT INTO expenses (budget_id, category, amount, description) VALUES (1, 'Food', 400, 'Restaurants')`)
	database.DB.Exec(`INSERT INTO expenses (budget_id, category, amount, description) VALUES (1, 'Transport', 300, 'Metro')`)
	database.DB.Exec(`INSERT INTO expenses (budget_id, category, amount, description) VALUES (2, 'Accommodation', 500, 'Airbnb')`)
	database.DB.Exec(`INSERT INTO expenses (budget_id, category, amount, description) VALUES (2, 'Food', 300, 'Restaurants')`)
}

func TestAnalyticsFlow(t *testing.T) {
	setupAnalyticsDB(t)
	defer database.CloseDB()

	router := setupAnalyticsRouter()

	// -------------------------
	// 1. Get Summary - Success
	// -------------------------
	req, _ := http.NewRequest("GET", "/api/analytics/summary", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var res map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, float64(1), res["user_id"])

	summary := res["summary"].(map[string]interface{})
	assert.Equal(t, float64(2), summary["total_trips"])
	assert.Equal(t, float64(2), summary["total_budgets"])
	assert.Equal(t, float64(2300), summary["total_spent"])
	assert.Equal(t, float64(1150), summary["average_spent_per_trip"])

	// -------------------------
	// 2. Get Summary - Empty (user 2 has no data)
	// -------------------------
	// AFTER:
	emptyRouter := gin.Default()
	emptyRouter.Use(func(c *gin.Context) {
		c.Set("user", &utils.Claims{UserID: 99})
		c.Next()
	})
	emptyRouter.GET("/api/analytics/summary", GetAnalyticsSummary)
	emptyRouter.GET("/api/analytics/trips", GetAnalyticsTrips)
	emptyRouter.GET("/api/analytics/expenses", GetAnalyticsExpenses)

	req, _ = http.NewRequest("GET", "/api/analytics/summary", nil)
	w = httptest.NewRecorder()
	emptyRouter.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	summary = res["summary"].(map[string]interface{})
	assert.Equal(t, float64(0), summary["total_trips"])
	assert.Equal(t, float64(0), summary["total_spent"])

	// -------------------------
	// 3. Get Trips - Success
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/analytics/trips", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, float64(2), res["total_trips"])

	trips := res["trips"].([]interface{})
	assert.Equal(t, 2, len(trips))

	// -------------------------
	// 4. Verify Trip Fields
	// -------------------------
	firstTrip := trips[0].(map[string]interface{})
	assert.NotEmpty(t, firstTrip["trip_name"])
	assert.NotEmpty(t, firstTrip["status"])
	assert.NotEmpty(t, firstTrip["destination"])

	// -------------------------
	// 5. Get Trips - Empty for unknown user
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/analytics/trips", nil)
	w = httptest.NewRecorder()
	emptyRouter.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, float64(0), res["total_trips"])

	// -------------------------
	// 6. Get Expenses - Success
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/analytics/expenses", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, float64(1), res["user_id"])
	assert.Equal(t, float64(2300), res["total_spent"])

	// -------------------------
	// 7. Verify Expense Categories
	// -------------------------
	categories := res["categories"].([]interface{})
	assert.Equal(t, 3, len(categories))

	firstCat := categories[0].(map[string]interface{})
	assert.NotEmpty(t, firstCat["category"])
	assert.NotEmpty(t, firstCat["total_amount"])
	assert.NotEmpty(t, firstCat["count"])

	// -------------------------
	// 8. Verify Categories Ordered by Amount Descending
	// -------------------------
	firstAmount := categories[0].(map[string]interface{})["total_amount"].(float64)
	secondAmount := categories[1].(map[string]interface{})["total_amount"].(float64)
	assert.GreaterOrEqual(t, firstAmount, secondAmount)

	// -------------------------
	// 9. Verify Accommodation is Highest Category
	// -------------------------
	topCategory := categories[0].(map[string]interface{})["category"].(string)
	assert.Equal(t, "Accommodation", topCategory)

	// -------------------------
	// 10. Get Expenses - Empty for unknown user
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/analytics/expenses", nil)
	w = httptest.NewRecorder()
	emptyRouter.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, float64(0), res["total_spent"])
}
