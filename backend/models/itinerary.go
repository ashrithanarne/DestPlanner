package models

import "time"

type Itinerary struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Owner int    `json:"owner"`
}

type ItineraryDestination struct {
	ID          int `json:"id"`
	ItineraryID int `json:"itinerary_id"`
	Destination int `json:"destination_id"`
}

type ItineraryCollaborator struct {
	ID          int `json:"id"`
	ItineraryID int `json:"itinerary_id"`
	UserID      int `json:"user_id"`
}

type ItineraryResponse struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Owner         int    `json:"owner"`
	Destinations  []int  `json:"destinations,omitempty"`
	Collaborators []int  `json:"collaborators,omitempty"`
}

type ActivityType string

const (
	ActivityTypeTravel        ActivityType = "travel"
	ActivityTypeAccommodation ActivityType = "accommodation"
	ActivityTypeActivity      ActivityType = "activity"
	ActivityTypeDining        ActivityType = "dining"
	ActivityTypeOther         ActivityType = "other"
)

// ItineraryItem is a single time-slotted event stored in the database.
type ItineraryItem struct {
	ID           int          `json:"id"`
	TripID       int          `json:"trip_id"`
	UserID       int          `json:"user_id"`
	Title        string       `json:"title"`
	ActivityType ActivityType `json:"activity_type"`
	Date         string       `json:"date"`       // YYYY-MM-DD
	StartTime    string       `json:"start_time"` // HH:MM  (24-h, optional)
	EndTime      string       `json:"end_time"`   // HH:MM  (24-h, optional)
	Location     string       `json:"location,omitempty"`
	Notes        string       `json:"notes,omitempty"`
	SortOrder    int          `json:"sort_order"` // position within the same date slot
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

// TimelineDay groups items that share the same calendar date.
type TimelineDay struct {
	Date      string          `json:"date"`       // YYYY-MM-DD
	DayNumber int             `json:"day_number"` // 1-based index relative to trip start
	Items     []ItineraryItem `json:"items"`
}

type TimelineResponse struct {
	TripID    int           `json:"trip_id"`
	TripName  string        `json:"trip_name"`
	StartDate string        `json:"start_date,omitempty"`
	EndDate   string        `json:"end_date,omitempty"`
	Days      []TimelineDay `json:"days"`
}

type CreateItineraryItemRequest struct {
	Title        string `json:"title"          binding:"required"`
	ActivityType string `json:"activity_type"  binding:"required"`
	Date         string `json:"date"           binding:"required"` // YYYY-MM-DD
	StartTime    string `json:"start_time,omitempty"`
	EndTime      string `json:"end_time,omitempty"`
	Location     string `json:"location,omitempty"`
	Notes        string `json:"notes,omitempty"`
}

type UpdateItineraryItemRequest struct {
	Title        string `json:"title,omitempty"`
	ActivityType string `json:"activity_type,omitempty"`
	Date         string `json:"date,omitempty"`
	StartTime    string `json:"start_time,omitempty"`
	EndTime      string `json:"end_time,omitempty"`
	Location     string `json:"location,omitempty"`
	Notes        string `json:"notes,omitempty"`
}

type ReorderItemRequest struct {
	Date      string `json:"date"       binding:"required"` // target date
	SortOrder int    `json:"sort_order" binding:"required"` // new position (1-based)
}
