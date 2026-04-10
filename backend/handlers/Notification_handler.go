package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/notifications
// Returns all notifications for the authenticated user, newest first.
// Optional query param: ?unread_only=true
// ──────────────────────────────────────────────────────────────────────────────
func GetNotifications(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	unreadOnly := c.Query("unread_only") == "true"

	query := `
		SELECT id, user_id, type, title, message, trip_id, is_read, created_at
		FROM notifications
		WHERE user_id = ?
	`
	args := []interface{}{claims.UserID}

	if unreadOnly {
		query += " AND is_read = 0"
	}
	query += " ORDER BY created_at DESC, id DESC LIMIT 100"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve notifications"})
		return
	}
	defer rows.Close()

	notifications := []models.Notification{}
	unreadCount := 0

	for rows.Next() {
		var n models.Notification
		var tripID sql.NullInt64
		var notifType string

		if err := rows.Scan(
			&n.ID, &n.UserID, &notifType, &n.Title, &n.Message,
			&tripID, &n.IsRead, &n.CreatedAt,
		); err != nil {
			continue
		}
		n.Type = models.NotificationType(notifType)
		if tripID.Valid {
			v := int(tripID.Int64)
			n.TripID = &v
		}
		notifications = append(notifications, n)
		if !n.IsRead {
			unreadCount++
		}
	}

	// If unread_only, still return the real total unread count
	if unreadOnly {
		database.DB.QueryRow(
			"SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
			claims.UserID,
		).Scan(&unreadCount)
	}

	c.JSON(http.StatusOK, models.NotificationsResponse{
		Notifications: notifications,
		UnreadCount:   unreadCount,
	})
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// Returns just the unread badge count — lightweight for polling.
// ──────────────────────────────────────────────────────────────────────────────
func GetUnreadCount(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	var count int
	database.DB.QueryRow(
		"SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
		claims.UserID,
	).Scan(&count)

	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/notifications/:id/read
// Mark a single notification as read.
// ──────────────────────────────────────────────────────────────────────────────
func MarkNotificationRead(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	notifID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid notification ID"})
		return
	}

	result, err := database.DB.Exec(
		"UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
		notifID, claims.UserID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to mark notification as read"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/notifications/read-all
// Mark every unread notification for the user as read.
// ──────────────────────────────────────────────────────────────────────────────
func MarkAllNotificationsRead(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	result, err := database.DB.Exec(
		"UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
		claims.UserID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to mark notifications as read"})
		return
	}

	updated, _ := result.RowsAffected()
	c.JSON(http.StatusOK, gin.H{
		"message": "All notifications marked as read",
		"updated": updated,
	})
}

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications/:id
// Delete a single notification (clear from history).
// ──────────────────────────────────────────────────────────────────────────────
func DeleteNotification(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	notifID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid notification ID"})
		return
	}

	result, err := database.DB.Exec(
		"DELETE FROM notifications WHERE id = ? AND user_id = ?",
		notifID, claims.UserID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to delete notification"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted"})
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/preferences
// Return the user's current notification preferences.
// ──────────────────────────────────────────────────────────────────────────────
func GetNotificationPreferences(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	prefs := getNotifPrefs(claims.UserID)
	c.JSON(http.StatusOK, prefs)
}

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/notifications/preferences
// Update notification preferences. Only fields present in the body are changed.
// ──────────────────────────────────────────────────────────────────────────────
func UpdateNotificationPreferences(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return
	}

	var req models.UpdatePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	// Load current prefs, apply only the fields that were sent
	prefs := getNotifPrefs(claims.UserID)
	if req.EmailEnabled != nil {
		prefs.EmailEnabled = *req.EmailEnabled
	}
	if req.TripReminders != nil {
		prefs.TripReminders = *req.TripReminders
	}
	if req.ItineraryChanges != nil {
		prefs.ItineraryChanges = *req.ItineraryChanges
	}
	if req.ExpenseUpdates != nil {
		prefs.ExpenseUpdates = *req.ExpenseUpdates
	}
	if req.CollaboratorUpdates != nil {
		prefs.CollaboratorUpdates = *req.CollaboratorUpdates
	}

	if err := upsertNotifPrefs(prefs); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to update preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Preferences updated successfully",
		"preferences": prefs,
	})
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/reminders/check
// Called by a scheduler (or manually for demo) to create trip-reminder
// notifications for trips departing in exactly 7 or 1 days.
// In production this would be called by a cron job, not exposed publicly.
// ──────────────────────────────────────────────────────────────────────────────
func CheckTripReminders(c *gin.Context) {
	// Only allow internal/admin calls — in production add an API-key check here
	today := time.Now().UTC().Format("2006-01-02")
	in7 := time.Now().UTC().AddDate(0, 0, 7).Format("2006-01-02")
	in1 := time.Now().UTC().AddDate(0, 0, 1).Format("2006-01-02")

	created7, _ := createReminderNotifs(today, in7, models.NotificationTripReminder7Day, "Trip in 7 days", "Your trip")
	created1, _ := createReminderNotifs(today, in1, models.NotificationTripReminder1Day, "Trip tomorrow!", "Your trip")

	c.JSON(http.StatusOK, gin.H{
		"reminders_7day": created7,
		"reminders_1day": created1,
	})
}

// createReminderNotifs finds trips departing on targetDate whose owners have
// trip_reminders enabled, and inserts a notification for each. Returns the
// count of notifications created.
func createReminderNotifs(today, targetDate string, notifType models.NotificationType, title, msgPrefix string) (int, error) {
	// Find trips starting on targetDate where the owner wants reminders
	// and a reminder of this type hasn't already been sent today
	rows, err := database.DB.Query(`
		SELECT t.id, t.user_id, t.trip_name, t.destination
		FROM trips t
		JOIN notification_preferences np ON np.user_id = t.user_id
		WHERE date(t.start_date) = ?
		  AND np.trip_reminders = 1
		  AND NOT EXISTS (
		    SELECT 1 FROM notifications n
		    WHERE n.user_id = t.user_id
		      AND n.trip_id = t.id
		      AND n.type = ?
		      AND date(n.created_at) = ?
		  )
	`, targetDate, string(notifType), today)

	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var tripID, userID int
		var tripName, destination string
		if err := rows.Scan(&tripID, &userID, &tripName, &destination); err != nil {
			continue
		}

		dest := destination
		if dest == "" {
			dest = "your destination"
		}
		msg := msgPrefix + " \"" + tripName + "\" to " + dest + " is coming up soon. Make sure you're ready!"

		CreateNotification(models.CreateNotificationRequest{
			UserID:  userID,
			Type:    notifType,
			Title:   title,
			Message: msg,
			TripID:  &tripID,
		})
		count++
	}
	return count, nil
}
