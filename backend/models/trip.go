package models

import "time"

// Trip represents a user's trip
type Trip struct {
	ID          int       `json:"id"`
	UserID      int       `json:"user_id"`
	TripName    string    `json:"trip_name"`
	Destination string    `json:"destination,omitempty"`
	StartDate   time.Time `json:"start_date,omitempty"`
	EndDate     time.Time `json:"end_date,omitempty"`
	Budget      float64   `json:"budget"`
	Notes       string    `json:"notes,omitempty"`
	Status      string    `json:"status"` // planning, ongoing, completed, cancelled
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateTripRequest represents the request to create a trip
type CreateTripRequest struct {
	TripName    string  `json:"trip_name" binding:"required"`
	Destination string  `json:"destination,omitempty"`
	StartDate   string  `json:"start_date,omitempty"`
	EndDate     string  `json:"end_date,omitempty"`
	Budget      float64 `json:"budget,omitempty"`
	Notes       string  `json:"notes,omitempty"`
}

// UpdateTripRequest represents the request to update a trip
type UpdateTripRequest struct {
	TripName    string  `json:"trip_name,omitempty"`
	Destination string  `json:"destination,omitempty"`
	StartDate   string  `json:"start_date,omitempty"`
	EndDate     string  `json:"end_date,omitempty"`
	Budget      float64 `json:"budget,omitempty"`
	Notes       string  `json:"notes,omitempty"`
	Status      string  `json:"status,omitempty"`
}

// TripSummary represents a trip with related information
type TripSummary struct {
	Trip
	DurationDays    int     `json:"duration_days"`
	HasPackingList  bool    `json:"has_packing_list"`
	HasBudget       bool    `json:"has_budget"`
	PackingProgress float64 `json:"packing_progress,omitempty"`
}