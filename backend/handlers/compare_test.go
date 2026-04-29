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

func setupCompareRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Set("user", &utils.Claims{UserID: 1})
		c.Next()
	})

	r.GET("/api/destinations/compare", CompareDestinations)

	return r
}

func setupCompareDB(t *testing.T) {
	err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}

	_, err = database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS destinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT, country TEXT, budget REAL, description TEXT,
			best_season TEXT NOT NULL DEFAULT '',
			travel_time TEXT NOT NULL DEFAULT ''
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create destinations table: %v", err)
	}

	_, err = database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS activities (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			destination_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			category TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create activities table: %v", err)
	}

	// Seed 3 destinations with best_season and travel_time
	database.DB.Exec(`INSERT INTO destinations (id, name, country, budget, description, best_season, travel_time) VALUES (1, 'Paris', 'France', 2000, 'City of Light', 'Spring', '2h flight')`)
	database.DB.Exec(`INSERT INTO destinations (id, name, country, budget, description, best_season, travel_time) VALUES (2, 'Tokyo', 'Japan', 3000, 'Land of the Rising Sun', 'Autumn', '14h flight')`)
	database.DB.Exec(`INSERT INTO destinations (id, name, country, budget, description, best_season, travel_time) VALUES (3, 'Bali', 'Indonesia', 1500, 'Island of the Gods', 'Summer', '18h flight')`)

	// Seed activities for Paris
	database.DB.Exec(`INSERT INTO activities (destination_id, name) VALUES (1, 'Eiffel Tower')`)
	database.DB.Exec(`INSERT INTO activities (destination_id, name) VALUES (1, 'Louvre Museum')`)

	// Seed activities for Tokyo
	database.DB.Exec(`INSERT INTO activities (destination_id, name) VALUES (2, 'Shibuya Crossing')`)
}

func TestCompareDestinations(t *testing.T) {
	setupCompareDB(t)
	defer database.CloseDB()

	router := setupCompareRouter()

	// -------------------------
	// 1. Compare 2 Destinations - Success
	// -------------------------
	req, _ := http.NewRequest("GET", "/api/destinations/compare?ids=1,2", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var res map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, float64(2), res["total_destinations"])

	destinations := res["destinations"].([]interface{})
	first := destinations[0].(map[string]interface{})
	second := destinations[1].(map[string]interface{})
	assert.Equal(t, "Paris", first["name"])
	assert.Equal(t, "Tokyo", second["name"])

	// -------------------------
	// 2. Compare 3 Destinations - Success
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=1,2,3", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	assert.Equal(t, float64(3), res["total_destinations"])

	// -------------------------
	// 3. Missing ids param
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 4. Only 1 ID provided (minimum is 2)
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=1", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 5. More than 3 IDs (maximum is 3)
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=1,2,3,4", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 6. Invalid ID format (not a number)
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=1,abc", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 7. Duplicate IDs
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=1,1", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 8. One ID does not exist
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=1,999", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 9. Verify budget and country fields
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=1,3", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	dests := res["destinations"].([]interface{})
	paris := dests[0].(map[string]interface{})
	bali := dests[1].(map[string]interface{})
	assert.Equal(t, "France", paris["country"])
	assert.Equal(t, float64(2000), paris["budget"])
	assert.Equal(t, "Indonesia", bali["country"])
	assert.Equal(t, float64(1500), bali["budget"])

	// -------------------------
	// 10. Verify best_season and travel_time fields
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=1,2", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	dests = res["destinations"].([]interface{})
	parisD := dests[0].(map[string]interface{})
	tokyoD := dests[1].(map[string]interface{})
	assert.Equal(t, "Spring", parisD["best_season"])
	assert.Equal(t, "2h flight", parisD["travel_time"])
	assert.Equal(t, "Autumn", tokyoD["best_season"])
	assert.Equal(t, "14h flight", tokyoD["travel_time"])

	// -------------------------
	// 11. Verify activities are returned for destinations that have them
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=1,2", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	dests = res["destinations"].([]interface{})
	parisActivities := dests[0].(map[string]interface{})["activities"].([]interface{})
	tokyoActivities := dests[1].(map[string]interface{})["activities"].([]interface{})
	assert.Equal(t, 2, len(parisActivities))
	assert.Equal(t, "Eiffel Tower", parisActivities[0])
	assert.Equal(t, "Louvre Museum", parisActivities[1])
	assert.Equal(t, 1, len(tokyoActivities))
	assert.Equal(t, "Shibuya Crossing", tokyoActivities[0])

	// -------------------------
	// 12. Verify activities is empty array (not null) for destinations with no activities
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/compare?ids=2,3", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &res)
	dests = res["destinations"].([]interface{})
	baliActivities := dests[1].(map[string]interface{})["activities"].([]interface{})
	assert.Equal(t, 0, len(baliActivities))
}
