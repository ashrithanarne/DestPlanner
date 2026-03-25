package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/database"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupDestinationRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Public routes (no auth needed)
	r.GET("/api/auth/destinations", GetDestinations)
	r.GET("/api/auth/destinations/:id", GetDestinationByID)
	r.GET("/api/auth/destinations/suggest", SuggestDestinations)

	// Protected routes (no auth middleware needed in tests)
	r.POST("/api/destinations", CreateDestination)
	r.PUT("/api/destinations/:id", UpdateDestination)
	r.DELETE("/api/destinations/:id", DeleteDestination)

	return r
}

func setupDestinationDB(t *testing.T) {
	err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}

	_, err = database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS destinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			country TEXT,
			budget REAL,
			description TEXT
		);
		CREATE TABLE IF NOT EXISTS bookmarks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER,
			destination_id INTEGER
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}
}

func TestDestinationFlow(t *testing.T) {
	setupDestinationDB(t)
	defer database.CloseDB()

	router := setupDestinationRouter()

	// -------------------------
	// 1. Create Destination
	// -------------------------
	createBody := `{"name":"Tokyo","country":"Japan","budget":3000,"description":"Land of the rising sun"}`
	req, _ := http.NewRequest("POST", "/api/destinations", bytes.NewBuffer([]byte(createBody)))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 2. Get All Destinations
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/auth/destinations", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var destinations []map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &destinations)
	assert.Nil(t, err)
	assert.Equal(t, 1, len(destinations))

	destID := int(destinations[0]["id"].(float64))

	// -------------------------
	// 3. Get Destination By ID
	// -------------------------
	req, _ = http.NewRequest("GET", fmt.Sprintf("/api/auth/destinations/%d", destID), nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var dest map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &dest)
	assert.Nil(t, err)
	assert.Equal(t, "Tokyo", dest["name"])

	// -------------------------
	// 4. Get Non-existent Destination (should 404)
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/auth/destinations/999", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 5. Filter by Country
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/auth/destinations?country=Japan", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var filtered []map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &filtered)
	assert.Equal(t, 1, len(filtered))

	// -------------------------
	// 6. Filter by Budget
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/auth/destinations?budget=5000", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 7. Suggest Destinations
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/auth/destinations/suggest?q=To", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 8. Update Destination
	// -------------------------
	updateBody := `{"name":"Tokyo Updated","country":"Japan","budget":3500,"description":"Updated description"}`
	req, _ = http.NewRequest("PUT", fmt.Sprintf("/api/destinations/%d", destID), bytes.NewBuffer([]byte(updateBody)))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 9. Update Non-existent Destination (should 404)
	// -------------------------
	req, _ = http.NewRequest("PUT", "/api/destinations/999", bytes.NewBuffer([]byte(updateBody)))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 10. Delete Destination
	// -------------------------
	req, _ = http.NewRequest("DELETE", fmt.Sprintf("/api/destinations/%d", destID), nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 11. Delete Non-existent Destination (should 404)
	// -------------------------
	req, _ = http.NewRequest("DELETE", "/api/destinations/999", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
