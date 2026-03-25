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

func setupBookmarkRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Inject a fake user into context (bypasses AuthMiddleware)
	r.Use(func(c *gin.Context) {
		c.Set("user", &utils.Claims{UserID: 1})
		c.Next()
	})

	r.POST("/api/bookmarks", SaveBookmark)
	r.GET("/api/bookmarks", GetBookmarks)
	r.DELETE("/api/bookmarks/:id", DeleteBookmark)

	return r
}

func setupBookmarkDB(t *testing.T) {
	err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}

	// Create required tables
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

	// Seed a destination
	_, err = database.DB.Exec(`INSERT INTO destinations (id, name, country, budget, description) VALUES (1, 'Paris', 'France', 2000, 'City of Light')`)
	if err != nil {
		t.Fatalf("Failed to seed destination: %v", err)
	}
}

func TestBookmarkFlow(t *testing.T) {
	setupBookmarkDB(t)
	defer database.CloseDB()

	router := setupBookmarkRouter()

	// -------------------------
	// 1. Save Bookmark
	// -------------------------
	body := `{"destination_id": 1}`
	req, _ := http.NewRequest("POST", "/api/bookmarks", bytes.NewBuffer([]byte(body)))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 2. Save Duplicate Bookmark (should fail)
	// -------------------------
	req, _ = http.NewRequest("POST", "/api/bookmarks", bytes.NewBuffer([]byte(body)))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 3. Save Bookmark for non-existent destination (should fail)
	// -------------------------
	badBody := `{"destination_id": 999}`
	req, _ = http.NewRequest("POST", "/api/bookmarks", bytes.NewBuffer([]byte(badBody)))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 4. Get Bookmarks
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/bookmarks", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var bookmarks []map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &bookmarks)
	assert.Nil(t, err)
	assert.Equal(t, 1, len(bookmarks))

	bookmarkID := int(bookmarks[0]["id"].(float64))

	// -------------------------
	// 5. Delete Bookmark
	// -------------------------
	req, _ = http.NewRequest("DELETE", fmt.Sprintf("/api/bookmarks/%d", bookmarkID), nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 6. Delete Non-existent Bookmark (should 404)
	// -------------------------
	req, _ = http.NewRequest("DELETE", "/api/bookmarks/999", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 7. Verify bookmarks list is empty
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/bookmarks", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}
