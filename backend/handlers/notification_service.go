package handlers

import (
	"backend/database"
	"backend/models"
)

// CreateNotification inserts a notification row for the given user.
// It silently returns on error so that a notification failure never
// blocks the main operation that triggered it.
func CreateNotification(req models.CreateNotificationRequest) {
	if database.DB == nil {
		return
	}

	query := `
		INSERT INTO notifications (user_id, type, title, message, trip_id)
		VALUES (?, ?, ?, ?, ?)
	`
	database.DB.Exec(query,
		req.UserID,
		string(req.Type),
		req.Title,
		req.Message,
		req.TripID,
	)
}

// getNotifPrefs returns a user's notification preferences from the DB.
// If no row exists yet it returns safe defaults (all in-app on, email off).
func getNotifPrefs(userID int) models.NotificationPreferences {
	prefs := models.NotificationPreferences{
		UserID:              userID,
		EmailEnabled:        false,
		TripReminders:       true,
		ItineraryChanges:    true,
		ExpenseUpdates:      true,
		CollaboratorUpdates: true,
	}

	database.DB.QueryRow(`
		SELECT email_enabled, trip_reminders, itinerary_changes,
		       expense_updates, collaborator_updates
		FROM notification_preferences WHERE user_id = ?`, userID,
	).Scan(
		&prefs.EmailEnabled,
		&prefs.TripReminders,
		&prefs.ItineraryChanges,
		&prefs.ExpenseUpdates,
		&prefs.CollaboratorUpdates,
	)
	return prefs
}

// upsertNotifPrefs writes preferences to the DB (INSERT OR REPLACE).
func upsertNotifPrefs(prefs models.NotificationPreferences) error {
	_, err := database.DB.Exec(`
		INSERT INTO notification_preferences
		  (user_id, email_enabled, trip_reminders, itinerary_changes,
		   expense_updates, collaborator_updates)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET
		  email_enabled        = excluded.email_enabled,
		  trip_reminders       = excluded.trip_reminders,
		  itinerary_changes    = excluded.itinerary_changes,
		  expense_updates      = excluded.expense_updates,
		  collaborator_updates = excluded.collaborator_updates
	`,
		prefs.UserID,
		prefs.EmailEnabled,
		prefs.TripReminders,
		prefs.ItineraryChanges,
		prefs.ExpenseUpdates,
		prefs.CollaboratorUpdates,
	)
	return err
}
