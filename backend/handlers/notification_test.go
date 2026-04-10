package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// ── test router + seed helpers ─────────────────────────────────────────────

func setupNotifRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	api := r.Group("/api")
	api.Use(func(c *gin.Context) {
		claims := &utils.Claims{UserID: 1, Email: "notif@example.com"}
		c.Set("user", claims)
		c.Next()
	})
	{
		api.GET("/notifications", GetNotifications)
		api.GET("/notifications/unread-count", GetUnreadCount)
		api.PUT("/notifications/read-all", MarkAllNotificationsRead)
		api.PUT("/notifications/:id/read", MarkNotificationRead)
		api.DELETE("/notifications/:id", DeleteNotification)
		api.GET("/notifications/preferences", GetNotificationPreferences)
		api.PUT("/notifications/preferences", UpdateNotificationPreferences)
		api.POST("/notifications/reminders/check", CheckTripReminders)
	}
	return r
}

// initNotifDB initialises an in-memory DB, seeds user 1, and returns the router.
func initNotifDB(t *testing.T) *gin.Engine {
	t.Helper()
	err := database.InitDB(":memory:")
	assert.Nil(t, err)
	database.DB.Exec(
		`INSERT INTO users (id, email, password_hash, first_name, last_name)
		 VALUES (1, 'notif@example.com', 'hash', 'Notif', 'User')`,
	)
	return setupNotifRouter()
}

// seedNotification directly inserts a notification row for user 1.
func seedNotification(t *testing.T, notifType models.NotificationType, title, message string, isRead bool) int {
	t.Helper()
	readVal := 0
	if isRead {
		readVal = 1
	}
	result, err := database.DB.Exec(
		`INSERT INTO notifications (user_id, type, title, message, is_read)
		 VALUES (1, ?, ?, ?, ?)`,
		string(notifType), title, message, readVal,
	)
	assert.Nil(t, err)
	id, _ := result.LastInsertId()
	return int(id)
}

// seedTrip directly inserts a trip for user 1 and returns its id.
func seedTripForUser1(t *testing.T, name, startDate string) int {
	t.Helper()
	result, _ := database.DB.Exec(
		`INSERT INTO trips (user_id, trip_name, destination, start_date, end_date, status)
		 VALUES (1, ?, 'Paris', ?, '2026-09-10', 'planning')`,
		name, startDate,
	)
	id, _ := result.LastInsertId()
	return int(id)
}

// ── GET /notifications ─────────────────────────────────────────────────────

func TestGetNotifications_Empty(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("GET", "/api/notifications", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.NotificationsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Empty(t, resp.Notifications)
	assert.Equal(t, 0, resp.UnreadCount)
}

func TestGetNotifications_ReturnsList(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	seedNotification(t, models.NotificationTripUpdated, "Trip created", "msg1", false)
	seedNotification(t, models.NotificationTripUpdated, "Trip updated", "msg2", false)

	req, _ := http.NewRequest("GET", "/api/notifications", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.NotificationsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Len(t, resp.Notifications, 2)
	assert.Equal(t, 2, resp.UnreadCount)
}

func TestGetNotifications_UnreadCountCorrect(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	seedNotification(t, models.NotificationTripUpdated, "A", "m", false) // unread
	seedNotification(t, models.NotificationTripUpdated, "B", "m", true)  // read
	seedNotification(t, models.NotificationTripUpdated, "C", "m", false) // unread

	req, _ := http.NewRequest("GET", "/api/notifications", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp models.NotificationsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Len(t, resp.Notifications, 3)
	assert.Equal(t, 2, resp.UnreadCount)
}

func TestGetNotifications_UnreadOnlyFilter(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	seedNotification(t, models.NotificationTripUpdated, "Unread", "m", false)
	seedNotification(t, models.NotificationTripUpdated, "Read", "m", true)

	req, _ := http.NewRequest("GET", "/api/notifications?unread_only=true", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp models.NotificationsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Len(t, resp.Notifications, 1)
	assert.Equal(t, "Unread", resp.Notifications[0].Title)
}

func TestGetNotifications_NewestFirst(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	// Use explicit timestamps — SQLite in-memory CURRENT_TIMESTAMP has 1-second
	// resolution so back-to-back inserts can get identical values.
	database.DB.Exec(`INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
		 VALUES (1, 'trip_updated', 'First', 'm', 0, '2026-06-01 10:00:00')`)
	database.DB.Exec(`INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
		 VALUES (1, 'trip_updated', 'Second', 'm', 0, '2026-06-01 11:00:00')`)
	database.DB.Exec(`INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
		 VALUES (1, 'trip_updated', 'Third', 'm', 0, '2026-06-01 12:00:00')`)

	req, _ := http.NewRequest("GET", "/api/notifications", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp models.NotificationsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Len(t, resp.Notifications, 3)
	assert.Equal(t, "Third", resp.Notifications[0].Title)
	assert.Equal(t, "Second", resp.Notifications[1].Title)
	assert.Equal(t, "First", resp.Notifications[2].Title)
}

func TestGetNotifications_TypeFieldMapped(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	seedNotification(t, models.NotificationExpenseAdded, "Expense", "m", false)

	req, _ := http.NewRequest("GET", "/api/notifications", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp models.NotificationsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, models.NotificationExpenseAdded, resp.Notifications[0].Type)
}

func TestGetNotifications_TripIDIncluded(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	tripID := seedTripForUser1(t, "Paris Trip", "2026-09-01")
	database.DB.Exec(
		`INSERT INTO notifications (user_id, type, title, message, trip_id, is_read)
		 VALUES (1, 'trip_updated', 'T', 'm', ?, 0)`, tripID,
	)

	req, _ := http.NewRequest("GET", "/api/notifications", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp models.NotificationsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NotNil(t, resp.Notifications[0].TripID)
	assert.Equal(t, tripID, *resp.Notifications[0].TripID)
}

// ── GET /notifications/unread-count ───────────────────────────────────────

func TestGetUnreadCount_Zero(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("GET", "/api/notifications/unread-count", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]int
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 0, resp["unread_count"])
}

func TestGetUnreadCount_NonZero(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	seedNotification(t, models.NotificationTripUpdated, "A", "m", false)
	seedNotification(t, models.NotificationTripUpdated, "B", "m", false)
	seedNotification(t, models.NotificationTripUpdated, "C", "m", true) // read — excluded

	req, _ := http.NewRequest("GET", "/api/notifications/unread-count", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp map[string]int
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 2, resp["unread_count"])
}

// ── PUT /notifications/:id/read ────────────────────────────────────────────

func TestMarkNotificationRead_Success(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	id := seedNotification(t, models.NotificationTripUpdated, "T", "m", false)

	req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/notifications/%d/read", id), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Notification marked as read", resp["message"])

	// Verify in DB
	var isRead int
	database.DB.QueryRow("SELECT is_read FROM notifications WHERE id = ?", id).Scan(&isRead)
	assert.Equal(t, 1, isRead)
}

func TestMarkNotificationRead_NotFound(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("PUT", "/api/notifications/9999/read", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestMarkNotificationRead_InvalidID(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("PUT", "/api/notifications/abc/read", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestMarkNotificationRead_AlreadyRead(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	id := seedNotification(t, models.NotificationTripUpdated, "T", "m", true)

	// Marking an already-read notification should still return 200
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/notifications/%d/read", id), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

// ── PUT /notifications/read-all ────────────────────────────────────────────

func TestMarkAllNotificationsRead_Success(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	seedNotification(t, models.NotificationTripUpdated, "A", "m", false)
	seedNotification(t, models.NotificationTripUpdated, "B", "m", false)
	seedNotification(t, models.NotificationTripUpdated, "C", "m", false)

	req, _ := http.NewRequest("PUT", "/api/notifications/read-all", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "All notifications marked as read", resp["message"])
	assert.Equal(t, float64(3), resp["updated"])

	// Verify in DB
	var unread int
	database.DB.QueryRow("SELECT COUNT(*) FROM notifications WHERE is_read = 0 AND user_id = 1").Scan(&unread)
	assert.Equal(t, 0, unread)
}

func TestMarkAllNotificationsRead_NoneUnread(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	seedNotification(t, models.NotificationTripUpdated, "A", "m", true)

	req, _ := http.NewRequest("PUT", "/api/notifications/read-all", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, float64(0), resp["updated"])
}

// ── DELETE /notifications/:id ──────────────────────────────────────────────

func TestDeleteNotification_Success(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	id := seedNotification(t, models.NotificationTripUpdated, "Del", "m", false)

	req, _ := http.NewRequest("DELETE", fmt.Sprintf("/api/notifications/%d", id), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var count int
	database.DB.QueryRow("SELECT COUNT(*) FROM notifications WHERE id = ?", id).Scan(&count)
	assert.Equal(t, 0, count)
}

func TestDeleteNotification_NotFound(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("DELETE", "/api/notifications/9999", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteNotification_InvalidID(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("DELETE", "/api/notifications/xyz", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ── GET /notifications/preferences ────────────────────────────────────────

func TestGetNotificationPreferences_DefaultsWhenNoneSet(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("GET", "/api/notifications/preferences", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var prefs models.NotificationPreferences
	json.Unmarshal(w.Body.Bytes(), &prefs)
	assert.Equal(t, 1, prefs.UserID)
	assert.False(t, prefs.EmailEnabled)       // default off
	assert.True(t, prefs.TripReminders)       // default on
	assert.True(t, prefs.ItineraryChanges)    // default on
	assert.True(t, prefs.ExpenseUpdates)      // default on
	assert.True(t, prefs.CollaboratorUpdates) // default on
}

func TestGetNotificationPreferences_ReturnsStoredValues(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	database.DB.Exec(
		`INSERT INTO notification_preferences
		 (user_id, email_enabled, trip_reminders, itinerary_changes, expense_updates, collaborator_updates)
		 VALUES (1, 1, 0, 1, 0, 1)`,
	)

	req, _ := http.NewRequest("GET", "/api/notifications/preferences", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var prefs models.NotificationPreferences
	json.Unmarshal(w.Body.Bytes(), &prefs)
	assert.True(t, prefs.EmailEnabled)
	assert.False(t, prefs.TripReminders)
	assert.True(t, prefs.ItineraryChanges)
	assert.False(t, prefs.ExpenseUpdates)
	assert.True(t, prefs.CollaboratorUpdates)
}

// ── PUT /notifications/preferences ────────────────────────────────────────

func TestUpdateNotificationPreferences_EnableEmail(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]interface{}{
		"email_enabled": true,
	})
	req, _ := http.NewRequest("PUT", "/api/notifications/preferences", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Preferences updated successfully", resp["message"])

	// Verify stored
	prefs := getNotifPrefs(1)
	assert.True(t, prefs.EmailEnabled)
}

func TestUpdateNotificationPreferences_DisableTripReminders(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]interface{}{
		"trip_reminders": false,
	})
	req, _ := http.NewRequest("PUT", "/api/notifications/preferences", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	prefs := getNotifPrefs(1)
	assert.False(t, prefs.TripReminders)
	assert.True(t, prefs.ItineraryChanges) // others unchanged
}

func TestUpdateNotificationPreferences_MultipleFields(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]interface{}{
		"email_enabled":        true,
		"expense_updates":      false,
		"collaborator_updates": false,
	})
	req, _ := http.NewRequest("PUT", "/api/notifications/preferences", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	prefs := getNotifPrefs(1)
	assert.True(t, prefs.EmailEnabled)
	assert.False(t, prefs.ExpenseUpdates)
	assert.False(t, prefs.CollaboratorUpdates)
	assert.True(t, prefs.TripReminders) // unchanged
}

func TestUpdateNotificationPreferences_Idempotent(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]interface{}{"email_enabled": true})

	for i := 0; i < 3; i++ {
		req, _ := http.NewRequest("PUT", "/api/notifications/preferences", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	}

	prefs := getNotifPrefs(1)
	assert.True(t, prefs.EmailEnabled)
}

func TestUpdateNotificationPreferences_InvalidPayload(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("PUT", "/api/notifications/preferences",
		bytes.NewBuffer([]byte("{bad json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ── internal CreateNotification helper ────────────────────────────────────

func TestCreateNotification_InsertsRow(t *testing.T) {
	err := database.InitDB(":memory:")
	assert.Nil(t, err)
	defer database.CloseDB()

	database.DB.Exec(
		`INSERT INTO users (id, email, password_hash, first_name, last_name)
		 VALUES (1, 'x@x.com', 'h', 'A', 'B')`,
	)

	CreateNotification(models.CreateNotificationRequest{
		UserID:  1,
		Type:    models.NotificationTripReminder7Day,
		Title:   "Trip reminder",
		Message: "7 days to go!",
	})

	var count int
	database.DB.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = 1").Scan(&count)
	assert.Equal(t, 1, count)
}

func TestCreateNotification_WithTripID(t *testing.T) {
	err := database.InitDB(":memory:")
	assert.Nil(t, err)
	defer database.CloseDB()

	database.DB.Exec(
		`INSERT INTO users (id, email, password_hash, first_name, last_name)
		 VALUES (1, 'x@x.com', 'h', 'A', 'B')`,
	)
	res, _ := database.DB.Exec(
		`INSERT INTO trips (user_id, trip_name, destination, start_date, end_date, status)
		 VALUES (1, 'Rome', 'Italy', '2026-08-01', '2026-08-10', 'planning')`,
	)
	tripID64, _ := res.LastInsertId()
	tripIDInt := int(tripID64)

	CreateNotification(models.CreateNotificationRequest{
		UserID:  1,
		Type:    models.NotificationTripReminder1Day,
		Title:   "Tomorrow!",
		Message: "Your trip is tomorrow.",
		TripID:  &tripIDInt,
	})

	var storedTripID int
	database.DB.QueryRow(
		"SELECT trip_id FROM notifications WHERE user_id = 1",
	).Scan(&storedTripID)
	assert.Equal(t, tripIDInt, storedTripID)
}

func TestCreateNotification_NilDBDoesNotPanic(t *testing.T) {
	// Should silently return without panicking when DB is nil
	original := database.DB
	database.DB = nil
	defer func() { database.DB = original }()

	assert.NotPanics(t, func() {
		CreateNotification(models.CreateNotificationRequest{
			UserID:  1,
			Type:    models.NotificationTripUpdated,
			Title:   "T",
			Message: "M",
		})
	})
}

// ── trip reminder check ────────────────────────────────────────────────────

func TestCheckTripReminders_NoTrips(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("POST", "/api/notifications/reminders/check", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, float64(0), resp["reminders_7day"])
	assert.Equal(t, float64(0), resp["reminders_1day"])
}

func TestCheckTripReminders_RespectsPreferenceOff(t *testing.T) {
	r := initNotifDB(t)
	defer database.CloseDB()

	// Turn off trip reminders for user 1
	database.DB.Exec(
		`INSERT INTO notification_preferences
		 (user_id, email_enabled, trip_reminders, itinerary_changes, expense_updates, collaborator_updates)
		 VALUES (1, 0, 0, 1, 1, 1)`,
	)

	// Seed a trip starting in 7 days
	database.DB.Exec(
		`INSERT INTO trips (user_id, trip_name, destination, start_date, end_date, status)
		 VALUES (1, 'Blocked Trip', 'Rome', date('now', '+7 days'), date('now', '+14 days'), 'planning')`,
	)

	req, _ := http.NewRequest("POST", "/api/notifications/reminders/check", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	// Should be 0 because trip_reminders is disabled
	assert.Equal(t, float64(0), resp["reminders_7day"])
}

// ── notification preferences respect disabled flags ────────────────────────

func TestNotifPrefs_ExpenseUpdateDisabled_NoNotifCreated(t *testing.T) {
	err := database.InitDB(":memory:")
	assert.Nil(t, err)
	defer database.CloseDB()

	database.DB.Exec(
		`INSERT INTO users (id, email, password_hash, first_name, last_name)
		 VALUES (1, 'x@x.com', 'h', 'A', 'B')`,
	)
	// Disable expense_updates
	database.DB.Exec(
		`INSERT INTO notification_preferences
		 (user_id, email_enabled, trip_reminders, itinerary_changes, expense_updates, collaborator_updates)
		 VALUES (1, 0, 1, 1, 0, 1)`,
	)

	prefs := getNotifPrefs(1)
	if prefs.ExpenseUpdates {
		CreateNotification(models.CreateNotificationRequest{
			UserID:  1,
			Type:    models.NotificationExpenseAdded,
			Title:   "Expense",
			Message: "msg",
		})
	}

	var count int
	database.DB.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = 1").Scan(&count)
	assert.Equal(t, 0, count)
}

func TestNotifPrefs_AllTypesStored(t *testing.T) {
	err := database.InitDB(":memory:")
	assert.Nil(t, err)
	defer database.CloseDB()

	database.DB.Exec(
		`INSERT INTO users (id, email, password_hash, first_name, last_name)
		 VALUES (1, 'x@x.com', 'h', 'A', 'B')`,
	)

	prefs := models.NotificationPreferences{
		UserID:              1,
		EmailEnabled:        true,
		TripReminders:       false,
		ItineraryChanges:    true,
		ExpenseUpdates:      false,
		CollaboratorUpdates: true,
	}
	err = upsertNotifPrefs(prefs)
	assert.Nil(t, err)

	stored := getNotifPrefs(1)
	assert.Equal(t, prefs.EmailEnabled, stored.EmailEnabled)
	assert.Equal(t, prefs.TripReminders, stored.TripReminders)
	assert.Equal(t, prefs.ItineraryChanges, stored.ItineraryChanges)
	assert.Equal(t, prefs.ExpenseUpdates, stored.ExpenseUpdates)
	assert.Equal(t, prefs.CollaboratorUpdates, stored.CollaboratorUpdates)
}
