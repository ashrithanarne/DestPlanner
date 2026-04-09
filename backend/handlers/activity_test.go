package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/database"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupActivityRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Set("user", &utils.Claims{UserID: 1})
		c.Next()
	})

	r.GET("/api/destinations/:id/activities", GetActivities)
	r.POST("/api/destinations/:id/activities", CreateActivity)
	r.PUT("/api/destinations/:id/activities/:activityId", UpdateActivity)
	r.DELETE("/api/destinations/:id/activities/:activityId", DeleteActivity)

	return r
}

func setupActivityDB(t *testing.T) {
	err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}

	_, err = database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS destinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT, country TEXT, budget REAL, description TEXT
		);
		CREATE TABLE IF NOT EXISTS activities (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			destination_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			category TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			FOREIGN KEY (destination_id) REFERENCES destinations(id)
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	// Seed a destination
	database.DB.Exec(`INSERT INTO destinations (id, name, country, budget, description) VALUES (1, 'Paris', 'France', 2000, 'City of Light')`)
}

func TestActivityFlow(t *testing.T) {
	setupActivityDB(t)
	defer database.CloseDB()

	router := setupActivityRouter()

	// -------------------------
	// 1. Get Activities - Empty List
	// -------------------------
	req, _ := http.NewRequest("GET", "/api/destinations/1/activities", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var getRes map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &getRes)
	assert.Equal(t, float64(0), getRes["total_activities"])

	// -------------------------
	// 2. Get Activities - Non-existent Destination
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/999/activities", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 3. Create Activity - Success
	// -------------------------
	body := `{"name": "Eiffel Tower Visit", "description": "Visit the iconic tower", "category": "Sightseeing"}`
	req, _ = http.NewRequest("POST", "/api/destinations/1/activities", bytes.NewBuffer([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var createRes map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &createRes)
	activityID := int(createRes["activity_id"].(float64))

	// -------------------------
	// 4. Create Activity - Missing Name
	// -------------------------
	noName := `{"name": "", "description": "No name activity"}`
	req, _ = http.NewRequest("POST", "/api/destinations/1/activities", bytes.NewBuffer([]byte(noName)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 5. Create Activity - Non-existent Destination
	// -------------------------
	req, _ = http.NewRequest("POST", "/api/destinations/999/activities", bytes.NewBuffer([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 6. Get Activities - Now has 1
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/1/activities", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &getRes)
	assert.Equal(t, float64(1), getRes["total_activities"])

	activities := getRes["activities"].([]interface{})
	first := activities[0].(map[string]interface{})
	assert.Equal(t, "Eiffel Tower Visit", first["name"])
	assert.Equal(t, "Sightseeing", first["category"])

	// -------------------------
	// 7. Update Activity - Success
	// -------------------------
	updateBody := `{"name": "Eiffel Tower Night Visit", "description": "Visit at night", "category": "Sightseeing"}`
	req, _ = http.NewRequest("PUT", fmt.Sprintf("/api/destinations/1/activities/%d", activityID), bytes.NewBuffer([]byte(updateBody)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 8. Update Activity - Missing Name
	// -------------------------
	badUpdate := `{"name": "", "description": "No name"}`
	req, _ = http.NewRequest("PUT", fmt.Sprintf("/api/destinations/1/activities/%d", activityID), bytes.NewBuffer([]byte(badUpdate)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 9. Update Activity - Non-existent
	// -------------------------
	req, _ = http.NewRequest("PUT", "/api/destinations/1/activities/999", bytes.NewBuffer([]byte(updateBody)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 10. Verify Update - Name changed
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/1/activities", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	json.Unmarshal(w.Body.Bytes(), &getRes)
	updated := getRes["activities"].([]interface{})[0].(map[string]interface{})
	assert.Equal(t, "Eiffel Tower Night Visit", updated["name"])

	// -------------------------
	// 11. Delete Activity - Non-existent
	// -------------------------
	req, _ = http.NewRequest("DELETE", "/api/destinations/1/activities/999", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 12. Delete Activity - Success
	// -------------------------
	req, _ = http.NewRequest("DELETE", fmt.Sprintf("/api/destinations/1/activities/%d", activityID), nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 13. Verify Deletion - Empty list again
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/1/activities", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	json.Unmarshal(w.Body.Bytes(), &getRes)
	assert.Equal(t, float64(0), getRes["total_activities"])
}
