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

func setupTravelRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Set("user", &utils.Claims{UserID: 1})
		c.Next()
	})

	r.GET("/api/destinations/:id/travel", GetTravelOptions)
	r.GET("/api/destinations/:id/accommodations", GetAccommodationOptions)

	return r
}

func setupTravelDB(t *testing.T) {
	err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}

	_, err = database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS destinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT, country TEXT, budget REAL, description TEXT
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	// Seed destinations
	database.DB.Exec(`INSERT INTO destinations (id, name, country, budget, description) VALUES (1, 'Paris', 'France', 2000, 'City of Light')`)
	database.DB.Exec(`INSERT INTO destinations (id, name, country, budget, description) VALUES (2, 'Tokyo', 'Japan', 3000, 'Land of the Rising Sun')`)
}

func TestTravelFlow(t *testing.T) {
	setupTravelDB(t)
	defer database.CloseDB()

	router := setupTravelRouter()

	// -------------------------
	// 1. Get Travel Options - Success
	// -------------------------
	req, _ := http.NewRequest("GET", "/api/destinations/1/travel", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var res map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, float64(1), res["destination_id"])
	assert.Equal(t, "Paris", res["destination_name"])
	assert.Equal(t, float64(4), res["total_options"])

	// -------------------------
	// 2. Verify Travel Options Content
	// -------------------------
	options := res["travel_options"].([]interface{})
	assert.Equal(t, 4, len(options))

	first := options[0].(map[string]interface{})
	assert.Equal(t, "Flight", first["type"])
	assert.NotEmpty(t, first["booking_link"])
	assert.NotEmpty(t, first["estimated_cost"])

	// -------------------------
	// 3. Get Travel Options - Different Destination
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/2/travel", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, "Tokyo", res["destination_name"])

	// -------------------------
	// 4. Get Travel Options - Non-existent Destination
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/999/travel", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 5. Get Travel Options - Invalid ID
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/abc/travel", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 6. Get Accommodation Options - Success
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/1/accommodations", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, float64(1), res["destination_id"])
	assert.Equal(t, "Paris", res["destination_name"])
	assert.Equal(t, float64(4), res["total_options"])

	// -------------------------
	// 7. Verify Accommodation Options Content
	// -------------------------
	accommodations := res["accommodation_options"].([]interface{})
	assert.Equal(t, 4, len(accommodations))

	firstAccom := accommodations[0].(map[string]interface{})
	assert.Equal(t, "Hotel", firstAccom["type"])
	assert.NotEmpty(t, firstAccom["booking_link"])
	assert.NotEmpty(t, firstAccom["estimated_cost"])

	// -------------------------
	// 8. Get Accommodation Options - Different Destination
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/2/accommodations", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, "Tokyo", res["destination_name"])

	// -------------------------
	// 9. Get Accommodation Options - Non-existent Destination
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/999/accommodations", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 10. Get Accommodation Options - Invalid ID
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/abc/accommodations", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 11. Verify Travel Options Have All Required Fields
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/1/travel", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	json.Unmarshal(w.Body.Bytes(), &res)
	travelOptions := res["travel_options"].([]interface{})
	for _, opt := range travelOptions {
		option := opt.(map[string]interface{})
		assert.NotEmpty(t, option["name"])
		assert.NotEmpty(t, option["type"])
		assert.NotEmpty(t, option["estimated_cost"])
		assert.NotEmpty(t, option["booking_link"])
	}

	// -------------------------
	// 12. Verify Accommodation Options Have All Required Fields
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/1/accommodations", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	json.Unmarshal(w.Body.Bytes(), &res)
	accomOptions := res["accommodation_options"].([]interface{})
	for _, opt := range accomOptions {
		option := opt.(map[string]interface{})
		assert.NotEmpty(t, option["name"])
		assert.NotEmpty(t, option["type"])
		assert.NotEmpty(t, option["estimated_cost"])
		assert.NotEmpty(t, option["booking_link"])
	}
}
