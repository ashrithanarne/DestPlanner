package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"backend/database"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// ── setup helpers ─────────────────────────────────────────────────────────────

func setupInviteDB(t *testing.T) {
	t.Helper()
	if err := database.InitDB(":memory:"); err != nil {
		t.Fatalf("Failed to init test DB: %v", err)
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
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id)
		);
		CREATE TABLE IF NOT EXISTS groups (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			trip_id INTEGER,
			created_by INTEGER NOT NULL,
			group_name TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS group_members (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			group_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(group_id, user_id)
		);
		CREATE TABLE IF NOT EXISTS itineraries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			created_by INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS itinerary_collaborators (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			itinerary_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			UNIQUE(itinerary_id, user_id)
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
		CREATE TABLE IF NOT EXISTS trip_invites (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			trip_id INTEGER NOT NULL,
			email TEXT NOT NULL,
			token TEXT NOT NULL UNIQUE,
			status TEXT NOT NULL DEFAULT 'pending',
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(trip_id, email, status)
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	// Seed: user 1 = owner, user 2 = invited (registered), user 3 = already collaborator
	database.DB.Exec(`INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES
		(1, 'owner@test.com',  'h', 'Owner', 'One'),
		(2, 'invited@test.com','h', 'Invited', 'Two'),
		(3, 'collab@test.com', 'h', 'Collab', 'Three')`)

	// Trip 1 belongs to user 1; trip 2 belongs to user 2 (for ownership tests)
	database.DB.Exec(`INSERT INTO trips (id, user_id, trip_name) VALUES
		(1, 1, 'Paris Trip'),
		(2, 2, 'Tokyo Trip')`)

	// Link a group to trip 1 and add user 3 as member (already collaborator)
	database.DB.Exec(`INSERT INTO groups (id, trip_id, created_by, group_name) VALUES (1, 1, 1, 'Paris Group')`)
	database.DB.Exec(`INSERT INTO group_members (group_id, user_id) VALUES (1, 3)`)
}

func setupInviteRouter(userID int) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Set("user", &utils.Claims{UserID: userID})
		c.Next()
	})
	r.POST("/api/trips/:id/invite", SendTripInvites)
	r.GET("/api/trips/:id/invites", GetTripInvites)
	r.POST("/api/invites/:token/accept", AcceptInvite)
	return r
}

func jsonBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	return bytes.NewBuffer(b)
}

// ── SendTripInvites ───────────────────────────────────────────────────────────

func TestSendTripInvites_Success(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)
	body := jsonBody(t, map[string]any{"emails": []string{"invited@test.com"}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	results := resp["results"].([]any)
	assert.Equal(t, "invited", results[0].(map[string]any)["status"])
}

func TestSendTripInvites_MultipleEmails(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)
	body := jsonBody(t, map[string]any{"emails": []string{"a@test.com", "b@test.com"}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	results := resp["results"].([]any)
	assert.Equal(t, 2, len(results))
	for _, r := range results {
		assert.Equal(t, "invited", r.(map[string]any)["status"])
	}
}

func TestSendTripInvites_TripNotFound(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)
	body := jsonBody(t, map[string]any{"emails": []string{"someone@test.com"}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/9999/invite", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestSendTripInvites_NotOwner(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	// User 2 tries to invite on trip 1 (owned by user 1)
	r := setupInviteRouter(2)
	body := jsonBody(t, map[string]any{"emails": []string{"someone@test.com"}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestSendTripInvites_EmptyEmailsArray(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)
	body := jsonBody(t, map[string]any{"emails": []string{}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSendTripInvites_MissingBody(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", bytes.NewBufferString("{}"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSendTripInvites_InvalidEmailFormat(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)
	body := jsonBody(t, map[string]any{"emails": []string{"not-an-email"}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	results := resp["results"].([]any)
	assert.Equal(t, "invalid_email", results[0].(map[string]any)["status"])
}

func TestSendTripInvites_DuplicatePrevented(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)

	// First invite
	body := jsonBody(t, map[string]any{"emails": []string{"invited@test.com"}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Second invite for same email
	body = jsonBody(t, map[string]any{"emails": []string{"invited@test.com"}})
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", body)
	req2.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var resp map[string]any
	json.Unmarshal(w2.Body.Bytes(), &resp)
	results := resp["results"].([]any)
	assert.Equal(t, "already_invited", results[0].(map[string]any)["status"])
}

func TestSendTripInvites_AlreadyCollaborator(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	// user 3 (collab@test.com) is already in the group for trip 1
	r := setupInviteRouter(1)
	body := jsonBody(t, map[string]any{"emails": []string{"collab@test.com"}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	results := resp["results"].([]any)
	assert.Equal(t, "already_collaborator", results[0].(map[string]any)["status"])
}

func TestSendTripInvites_MixedResults(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)
	body := jsonBody(t, map[string]any{"emails": []string{
		"new@test.com",
		"not-an-email",
		"collab@test.com",
	}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/trips/1/invite", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	results := resp["results"].([]any)
	assert.Equal(t, 3, len(results))

	statuses := map[string]string{}
	for _, r := range results {
		rm := r.(map[string]any)
		statuses[rm["email"].(string)] = rm["status"].(string)
	}
	assert.Equal(t, "invited", statuses["new@test.com"])
	assert.Equal(t, "invalid_email", statuses["not-an-email"])
	assert.Equal(t, "already_collaborator", statuses["collab@test.com"])
}

// ── AcceptInvite ──────────────────────────────────────────────────────────────

// seedInviteToken inserts a token directly and returns it.
func seedInviteToken(t *testing.T, tripID int, email, status string, expiresAt time.Time) string {
	t.Helper()
	token := fmt.Sprintf("test-token-%d-%s", tripID, email)
	_, err := database.DB.Exec(`
		INSERT INTO trip_invites (trip_id, email, token, status, expires_at)
		VALUES (?, ?, ?, ?, ?)`,
		tripID, email, token, status, expiresAt.Format("2006-01-02 15:04:05"),
	)
	if err != nil {
		t.Fatalf("seedInviteToken: %v", err)
	}
	return token
}

func TestAcceptInvite_Success(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	token := seedInviteToken(t, 1, "invited@test.com", "pending", time.Now().Add(7*24*time.Hour))

	r := setupInviteRouter(2) // user 2 = invited@test.com
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/invites/"+token+"/accept", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Invite accepted successfully", resp["message"])
	assert.Equal(t, float64(1), resp["trip_id"])
}

func TestAcceptInvite_StatusUpdatedToAccepted(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	token := seedInviteToken(t, 1, "invited@test.com", "pending", time.Now().Add(7*24*time.Hour))

	r := setupInviteRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/invites/"+token+"/accept", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var status string
	database.DB.QueryRow("SELECT status FROM trip_invites WHERE token = ?", token).Scan(&status)
	assert.Equal(t, "accepted", status)
}

func TestAcceptInvite_TokenNotFound(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/invites/does-not-exist/accept", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestAcceptInvite_ExpiredToken(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	// Insert already-expired invite
	token := seedInviteToken(t, 1, "invited@test.com", "expired", time.Now().Add(-1*time.Hour))

	r := setupInviteRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/invites/"+token+"/accept", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusGone, w.Code)
}

func TestAcceptInvite_ExpiredByTime(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	// pending but past expiry — handler should auto-expire it
	token := seedInviteToken(t, 1, "invited@test.com", "pending", time.Now().Add(-1*time.Hour))

	r := setupInviteRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/invites/"+token+"/accept", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusGone, w.Code)
}

func TestAcceptInvite_AlreadyAccepted(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	token := seedInviteToken(t, 1, "invited@test.com", "accepted", time.Now().Add(7*24*time.Hour))

	r := setupInviteRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/invites/"+token+"/accept", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestAcceptInvite_AlreadyCollaborator(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	// user 3 is already in the group for trip 1
	token := seedInviteToken(t, 1, "collab@test.com", "pending", time.Now().Add(7*24*time.Hour))

	r := setupInviteRouter(3) // user 3 = collab@test.com
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/invites/"+token+"/accept", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestAcceptInvite_NotificationFiredToOwner(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	token := seedInviteToken(t, 1, "invited@test.com", "pending", time.Now().Add(7*24*time.Hour))

	r := setupInviteRouter(2)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/invites/"+token+"/accept", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var count int
	database.DB.QueryRow(
		"SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = 'collaborator_added'", 1,
	).Scan(&count)
	assert.Equal(t, 1, count)
}

// ── GetTripInvites ────────────────────────────────────────────────────────────

func TestGetTripInvites_Success(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	seedInviteToken(t, 1, "a@test.com", "pending", time.Now().Add(7*24*time.Hour))
	seedInviteToken(t, 1, "b@test.com", "accepted", time.Now().Add(7*24*time.Hour))

	r := setupInviteRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/trips/1/invites", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	invites := resp["invites"].([]any)
	assert.Equal(t, 2, len(invites))
}

func TestGetTripInvites_EmptyList(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/trips/1/invites", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	invites := resp["invites"].([]any)
	assert.Equal(t, 0, len(invites))
}

func TestGetTripInvites_TripNotFound(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/trips/9999/invites", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetTripInvites_NotOwner(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	r := setupInviteRouter(2) // user 2 does not own trip 1
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/trips/1/invites", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetTripInvites_ExpiredAutoMarked(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	// Insert a pending invite that is already past its expiry
	seedInviteToken(t, 1, "old@test.com", "pending", time.Now().Add(-1*time.Hour))

	r := setupInviteRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/trips/1/invites", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	invites := resp["invites"].([]any)
	assert.Equal(t, 1, len(invites))
	assert.Equal(t, "expired", invites[0].(map[string]any)["status"])
}

func TestGetTripInvites_TokenNotExposedInResponse(t *testing.T) {
	setupInviteDB(t)
	defer database.CloseDB()

	seedInviteToken(t, 1, "a@test.com", "pending", time.Now().Add(7*24*time.Hour))

	r := setupInviteRouter(1)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/trips/1/invites", nil)
	r.ServeHTTP(w, req)

	// Raw body must not contain the token value
	assert.NotContains(t, w.Body.String(), "test-token-1-a@test.com")
}
