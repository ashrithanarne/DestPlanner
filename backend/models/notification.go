package models

import "time"

// NotificationType categorises what triggered the notification.
type NotificationType string

const (
	// Trip-related
	NotificationTripReminder7Day NotificationType = "trip_reminder_7day"
	NotificationTripReminder1Day NotificationType = "trip_reminder_1day"
	NotificationTripUpdated      NotificationType = "trip_updated"
	// Itinerary / collaborator
	NotificationItineraryChanged  NotificationType = "itinerary_changed"
	NotificationCollaboratorAdded NotificationType = "collaborator_added"
	// Group expense
	NotificationExpenseAdded   NotificationType = "expense_added"
	NotificationExpenseSettled NotificationType = "expense_settled"
)

// Notification is a single in-app notification row.
type Notification struct {
	ID        int              `json:"id"`
	UserID    int              `json:"user_id"`
	Type      NotificationType `json:"type"`
	Title     string           `json:"title"`
	Message   string           `json:"message"`
	TripID    *int             `json:"trip_id,omitempty"`
	IsRead    bool             `json:"is_read"`
	CreatedAt time.Time        `json:"created_at"`
}

// NotificationPreferences holds per-user notification settings.
type NotificationPreferences struct {
	UserID              int  `json:"user_id"`
	EmailEnabled        bool `json:"email_enabled"`
	TripReminders       bool `json:"trip_reminders"`
	ItineraryChanges    bool `json:"itinerary_changes"`
	ExpenseUpdates      bool `json:"expense_updates"`
	CollaboratorUpdates bool `json:"collaborator_updates"`
}

// NotificationsResponse is the envelope returned by GET /notifications.
type NotificationsResponse struct {
	Notifications []Notification `json:"notifications"`
	UnreadCount   int            `json:"unread_count"`
}

// UpdatePreferencesRequest is the body for PUT /notifications/preferences.
type UpdatePreferencesRequest struct {
	EmailEnabled        *bool `json:"email_enabled"`
	TripReminders       *bool `json:"trip_reminders"`
	ItineraryChanges    *bool `json:"itinerary_changes"`
	ExpenseUpdates      *bool `json:"expense_updates"`
	CollaboratorUpdates *bool `json:"collaborator_updates"`
}

// CreateNotificationRequest is used internally (not exposed as an HTTP endpoint)
// to create a notification from other handlers.
type CreateNotificationRequest struct {
	UserID  int
	Type    NotificationType
	Title   string
	Message string
	TripID  *int
}
