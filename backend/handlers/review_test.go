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

func setupReviewRouter(userID int) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Set("user", &utils.Claims{UserID: userID})
		c.Next()
	})

	r.POST("/api/destinations/:id/reviews", CreateReview)
	r.GET("/api/destinations/:id/reviews", GetReviews)
	r.PUT("/api/destinations/:id/reviews/:reviewId", UpdateReview)
	r.DELETE("/api/destinations/:id/reviews/:reviewId", DeleteReview)

	return r
}

func setupReviewDB(t *testing.T) {
	err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
	}

	_, err = database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS destinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT, country TEXT, budget REAL, description TEXT
		);
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT, password_hash TEXT,
			first_name TEXT, last_name TEXT,
			created_at DATETIME, updated_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS reviews (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			destination_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			rating INTEGER NOT NULL,
			comment TEXT NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			FOREIGN KEY (destination_id) REFERENCES destinations(id),
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	// Seed destination and two users
	database.DB.Exec(`INSERT INTO destinations (id, name, country, budget, description) VALUES (1, 'Paris', 'France', 2000, 'City of Light')`)
	database.DB.Exec(`INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at) VALUES (1, 'alice@test.com', 'hash', 'Alice', 'Smith', datetime('now'), datetime('now'))`)
	database.DB.Exec(`INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at) VALUES (2, 'bob@test.com', 'hash', 'Bob', 'Jones', datetime('now'), datetime('now'))`)
}

func TestReviewFlow(t *testing.T) {
	setupReviewDB(t)
	defer database.CloseDB()

	// User 1 router
	router := setupReviewRouter(1)

	// -------------------------
	// 1. Create Review - Success
	// -------------------------
	body := `{"rating": 5, "comment": "Amazing place!"}`
	req, _ := http.NewRequest("POST", "/api/destinations/1/reviews", bytes.NewBuffer([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var createRes map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &createRes)
	reviewID := int(createRes["review_id"].(float64))

	// -------------------------
	// 2. Create Duplicate Review (should fail)
	// -------------------------
	req, _ = http.NewRequest("POST", "/api/destinations/1/reviews", bytes.NewBuffer([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 3. Create Review - Invalid Rating
	// -------------------------
	badRating := `{"rating": 6, "comment": "Too good"}`
	req, _ = http.NewRequest("POST", "/api/destinations/1/reviews", bytes.NewBuffer([]byte(badRating)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 4. Create Review - Missing Comment
	// -------------------------
	noComment := `{"rating": 4, "comment": ""}`
	req, _ = http.NewRequest("POST", "/api/destinations/1/reviews", bytes.NewBuffer([]byte(noComment)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 5. Create Review - Non-existent Destination
	// -------------------------
	req, _ = http.NewRequest("POST", "/api/destinations/999/reviews", bytes.NewBuffer([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 6. Get Reviews - Success
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/1/reviews", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var getRes map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &getRes)
	assert.Equal(t, float64(1), getRes["total_reviews"])
	assert.Equal(t, float64(5), getRes["average_rating"])

	// -------------------------
	// 7. Get Reviews - Non-existent Destination
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/999/reviews", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 8. Update Review - Success
	// -------------------------
	updateBody := `{"rating": 4, "comment": "Great place, updated thoughts"}`
	req, _ = http.NewRequest("PUT", fmt.Sprintf("/api/destinations/1/reviews/%d", reviewID), bytes.NewBuffer([]byte(updateBody)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 9. Update Review - Invalid Rating
	// -------------------------
	badUpdate := `{"rating": 0, "comment": "Bad rating"}`
	req, _ = http.NewRequest("PUT", fmt.Sprintf("/api/destinations/1/reviews/%d", reviewID), bytes.NewBuffer([]byte(badUpdate)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// -------------------------
	// 10. Update Review - Wrong User (user 2 tries to edit user 1's review)
	// -------------------------
	router2 := setupReviewRouter(2)
	req, _ = http.NewRequest("PUT", fmt.Sprintf("/api/destinations/1/reviews/%d", reviewID), bytes.NewBuffer([]byte(updateBody)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router2.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)

	// -------------------------
	// 11. Delete Review - Wrong User (user 2 tries to delete user 1's review)
	// -------------------------
	req, _ = http.NewRequest("DELETE", fmt.Sprintf("/api/destinations/1/reviews/%d", reviewID), nil)
	w = httptest.NewRecorder()
	router2.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)

	// -------------------------
	// 12. Delete Review - Non-existent
	// -------------------------
	req, _ = http.NewRequest("DELETE", "/api/destinations/1/reviews/999", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// -------------------------
	// 13. Delete Review - Success
	// -------------------------
	req, _ = http.NewRequest("DELETE", fmt.Sprintf("/api/destinations/1/reviews/%d", reviewID), nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 14. Verify Deleted - Get Reviews shows 0
	// -------------------------
	req, _ = http.NewRequest("GET", "/api/destinations/1/reviews", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	json.Unmarshal(w.Body.Bytes(), &getRes)
	assert.Equal(t, float64(0), getRes["total_reviews"])
}
