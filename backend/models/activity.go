package models

import "time"

type Activity struct {
	ID            int       `json:"id"`
	DestinationID int       `json:"destination_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description,omitempty"`
	Category      string    `json:"category,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ActivityResponse struct {
	ID            int       `json:"id"`
	DestinationID int       `json:"destination_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description,omitempty"`
	Category      string    `json:"category,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateActivityRequest struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Category    string `json:"category,omitempty"`
}

type UpdateActivityRequest struct {
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
	Category    string `json:"category,omitempty"`
}

type ActivitiesListResponse struct {
	DestinationID   int                `json:"destination_id"`
	TotalActivities int                `json:"total_activities"`
	Activities      []ActivityResponse `json:"activities"`
}
