package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/database"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// ── setup ─────────────────────────────────────────────────────────────────────

func setupSocialDB(t *testing.T) {
	t.Helper()
	if err := database.InitDB(":memory:"); err != nil {
		t.Fatalf("Failed to init DB: %v", err)
	}

	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS trips (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			trip_name TEXT NOT NULL,
			destination TEXT,
			start_date DATETIME,
			end_date DATETIME,
			notes TEXT,
			status TEXT DEFAULT 'planning',
			visibility TEXT NOT NULL DEFAULT 'private',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS user_follows (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			follower_id INTEGER NOT NULL,
			following_id INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(follower_id, following_id)
		);
		CREATE TABLE IF NOT EXISTS notifications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			type TEXT NOT NULL,
			title TEXT NOT NULL,
			message TEXT NOT NULL,
			trip_id INTEGER,
			is_read INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS notification_preferences (
			user_id INTEGER PRIMARY KEY,
			email_enabled INTEGER NOT NULL DEFAULT 0,
			trip_reminders INTEGER NOT NULL DEFAULT 1,
			itinerary_changes INTEGER NOT NULL DEFAULT 1,
			expense_updates INTEGER NOT NULL DEFAULT 1,
			collaborator_updates INTEGER NOT NULL DEFAULT 1
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	// Seed 3 users
	database.DB.Exec(`INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES
		(1, 'alice@test.com', 'h', 'Alice', 'A'),
		(2, 'bob@test.com',   'h', 'Bob',   'B'),
		(3, 'carol@test.com', 'h', 'Carol', 'C')`)

	// Seed trips: trip 1 = Alice public, trip 2 = Alice private, trip 3 = Bob public
	database.DB.Exec(`INSERT INTO trips (id, user_id, trip_name, destination, visibility) VALUES
		(1, 1, 'Alice Public Trip',  'Paris',  'public'),
		(2, 1, 'Alice Private Trip', 'Rome',   'private'),
		(3, 2, 'Bob Public Trip',    'Tokyo',  'public')`)
}

func socialRouter(userID int) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Set("user", &utils.Claims{UserID: userID})
		c.Next()
	})
	r.POST("/api/users/:id/follow", FollowUser)
	r.DELETE("/api/users/:id/follow", UnfollowUser)
	r.GET("/api/users/:id/profile", GetPublicProfile)
	r.GET("/api/users/:id/followers", GetFollowers)
	r.GET("/api/users/:id/following", GetFollowing)
	r.GET("/api/users/:id/trips", GetPublicTripsForUser)
	r.PUT("/api/trips/:id/visibility", UpdateTripVisibility)
	r.GET("/api/feed", GetFeed)
	return r
}

func jsonBuf(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, _ := json.Marshal(v)
	return bytes.NewBuffer(b)
}

// ── FollowUser ────────────────────────────────────────────────────────────────

func TestFollowUser_Success(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/users/2/follow", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestFollowUser_RowInserted(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	req, _ := http.NewRequest(http.MethodPost, "/api/users/2/follow", nil)
	r.ServeHTTP(httptest.NewRecorder(), req)

	var count int
	database.DB.QueryRow("SELECT COUNT(*) FROM user_follows WHERE follower_id=1 AND following_id=2").Scan(&count)
	assert.Equal(t, 1, count)
}

func TestFollowUser_CannotFollowSelf(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/users/1/follow", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestFollowUser_UserNotFound(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/users/9999/follow", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestFollowUser_AlreadyFollowing(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (1, 2)")

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/users/2/follow", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
}

// ── UnfollowUser ──────────────────────────────────────────────────────────────

func TestUnfollowUser_Success(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (1, 2)")

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/api/users/2/follow", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUnfollowUser_RowRemoved(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (1, 2)")

	r := socialRouter(1)
	req, _ := http.NewRequest(http.MethodDelete, "/api/users/2/follow", nil)
	r.ServeHTTP(httptest.NewRecorder(), req)

	var count int
	database.DB.QueryRow("SELECT COUNT(*) FROM user_follows WHERE follower_id=1 AND following_id=2").Scan(&count)
	assert.Equal(t, 0, count)
}

func TestUnfollowUser_NotFollowing(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/api/users/2/follow", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ── GetPublicProfile ──────────────────────────────────────────────────────────

func TestGetPublicProfile_Success(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	// Alice (1) follows Bob (2); Carol (3) also follows Bob
	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (1,2),(3,2)")
	// Bob follows Carol
	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (2,3)")

	r := socialRouter(1) // caller = Alice
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/2/profile", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Bob", resp["first_name"])
	assert.Equal(t, float64(2), resp["follower_count"])  // Alice + Carol follow Bob
	assert.Equal(t, float64(1), resp["following_count"]) // Bob follows Carol
	assert.Equal(t, true, resp["is_following"])          // Alice follows Bob
}

func TestGetPublicProfile_IsFollowingFalse(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/2/profile", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, false, resp["is_following"])
}

func TestGetPublicProfile_NotFound(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/9999/profile", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetPublicProfile_ZeroCounts(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/2/profile", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, float64(0), resp["follower_count"])
	assert.Equal(t, float64(0), resp["following_count"])
}

// ── GetFollowers / GetFollowing ───────────────────────────────────────────────

func TestGetFollowers_Success(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	// Alice and Carol follow Bob
	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (1,2),(3,2)")

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/2/followers", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	followers := resp["followers"].([]any)
	assert.Equal(t, 2, len(followers))
}

func TestGetFollowers_Empty(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/2/followers", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 0, len(resp["followers"].([]any)))
}

func TestGetFollowing_Success(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	// Alice follows Bob and Carol
	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (1,2),(1,3)")

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/1/following", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 2, len(resp["following"].([]any)))
}

func TestGetFollowing_Empty(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/2/following", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 0, len(resp["following"].([]any)))
}

// ── UpdateTripVisibility ──────────────────────────────────────────────────────

func TestUpdateTripVisibility_SetPublic(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	body := jsonBuf(t, map[string]any{"visibility": "public"})
	req, _ := http.NewRequest(http.MethodPut, "/api/trips/2/visibility", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var vis string
	database.DB.QueryRow("SELECT visibility FROM trips WHERE id=2").Scan(&vis)
	assert.Equal(t, "public", vis)
}

func TestUpdateTripVisibility_SetPrivate(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	body := jsonBuf(t, map[string]any{"visibility": "private"})
	req, _ := http.NewRequest(http.MethodPut, "/api/trips/1/visibility", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var vis string
	database.DB.QueryRow("SELECT visibility FROM trips WHERE id=1").Scan(&vis)
	assert.Equal(t, "private", vis)
}

func TestUpdateTripVisibility_InvalidValue(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	body := jsonBuf(t, map[string]any{"visibility": "friends_only"})
	req, _ := http.NewRequest(http.MethodPut, "/api/trips/1/visibility", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateTripVisibility_MissingBody(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPut, "/api/trips/1/visibility", bytes.NewBufferString("{}"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateTripVisibility_NotOwner(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(2) // Bob tries to update Alice's trip
	w := httptest.NewRecorder()
	body := jsonBuf(t, map[string]any{"visibility": "public"})
	req, _ := http.NewRequest(http.MethodPut, "/api/trips/1/visibility", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUpdateTripVisibility_TripNotFound(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	body := jsonBuf(t, map[string]any{"visibility": "public"})
	req, _ := http.NewRequest(http.MethodPut, "/api/trips/9999/visibility", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ── GetPublicTripsForUser ─────────────────────────────────────────────────────

func TestGetPublicTripsForUser_OnlyPublic(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	// Alice has trip 1 (public) and trip 2 (private)
	r := socialRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/1/trips", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	trips := resp["trips"].([]any)
	assert.Equal(t, 1, len(trips))
	assert.Equal(t, "Alice Public Trip", trips[0].(map[string]any)["trip_name"])
}

func TestGetPublicTripsForUser_PrivateTripHidden(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/1/trips", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	trips := resp["trips"].([]any)
	for _, tr := range trips {
		assert.NotEqual(t, "Alice Private Trip", tr.(map[string]any)["trip_name"])
	}
}

func TestGetPublicTripsForUser_EmptyWhenAllPrivate(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	// Make Alice's public trip private
	database.DB.Exec("UPDATE trips SET visibility='private' WHERE id=1")

	r := socialRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/1/trips", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 0, len(resp["trips"].([]any)))
}

func TestGetPublicTripsForUser_NotFound(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/users/9999/trips", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ── GetFeed ───────────────────────────────────────────────────────────────────

func TestGetFeed_ShowsPublicTripsFromFollowed(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	// Alice follows Bob; Bob has trip 3 (public)
	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (1,2)")

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/feed", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	feed := resp["feed"].([]any)
	assert.Equal(t, 1, len(feed))
	assert.Equal(t, "Bob Public Trip", feed[0].(map[string]any)["trip_name"])
}

func TestGetFeed_EmptyWhenNotFollowingAnyone(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/feed", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 0, len(resp["feed"].([]any)))
}

func TestGetFeed_PrivateTripNotInFeed(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	// Alice follows herself via insert (edge case) — or follows Bob whose trip is private
	database.DB.Exec("UPDATE trips SET visibility='private' WHERE id=3")
	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (1,2)")

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/feed", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 0, len(resp["feed"].([]any)))
}

func TestGetFeed_MultipleFollowed(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	// Alice follows Bob and Carol; add a public trip for Carol
	database.DB.Exec("INSERT INTO trips (id, user_id, trip_name, visibility) VALUES (4, 3, 'Carol Public Trip', 'public')")
	database.DB.Exec("INSERT INTO user_follows (follower_id, following_id) VALUES (1,2),(1,3)")

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/feed", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 2, len(resp["feed"].([]any)))
}

func TestGetFeed_PaginationDefaultValues(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/feed", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, float64(1), resp["page"])
	assert.Equal(t, float64(20), resp["limit"])
}

func TestGetFeed_OwnPublicTripNotInFeed(t *testing.T) {
	setupSocialDB(t)
	defer database.CloseDB()

	// Alice's own public trip should NOT appear in her feed
	r := socialRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/feed", nil)
	r.ServeHTTP(w, req)

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	feed := resp["feed"].([]any)
	for _, f := range feed {
		assert.NotEqual(t, "Alice Public Trip", f.(map[string]any)["trip_name"])
	}
}
