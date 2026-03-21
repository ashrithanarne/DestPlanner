package models

import "time"

// PackingList represents a packing list for a trip
type PackingList struct {
	ID           int       `json:"id"`
	TripID       int       `json:"trip_id"`
	UserID       int       `json:"user_id"`
	Destination  string    `json:"destination,omitempty"`
	Climate      string    `json:"climate,omitempty"`
	DurationDays int       `json:"duration_days,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// PackingItem represents an individual item in a packing list
type PackingItem struct {
	ID             int       `json:"id"`
	PackingListID  int       `json:"packing_list_id"`
	ItemName       string    `json:"item_name"`
	Category       string    `json:"category,omitempty"`
	Quantity       int       `json:"quantity"`
	IsChecked      bool      `json:"is_checked"`
	IsSuggested    bool      `json:"is_suggested"`
	Notes          string    `json:"notes,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// CreatePackingListRequest represents the request to create a packing list
type CreatePackingListRequest struct {
	TripID       int    `json:"trip_id" binding:"required"`
	Destination  string `json:"destination,omitempty"`
	Climate      string `json:"climate,omitempty"`
	DurationDays int    `json:"duration_days,omitempty"`
	AutoPopulate bool   `json:"auto_populate,omitempty"`
}

// AddPackingItemRequest represents the request to add an item to a packing list
type AddPackingItemRequest struct {
	ItemName string `json:"item_name" binding:"required"`
	Category string `json:"category,omitempty"`
	Quantity int    `json:"quantity,omitempty"`
	Notes    string `json:"notes,omitempty"`
}

// UpdatePackingItemRequest represents the request to update a packing item
type UpdatePackingItemRequest struct {
	ItemName  string `json:"item_name,omitempty"`
	Category  string `json:"category,omitempty"`
	Quantity  int    `json:"quantity,omitempty"`
	IsChecked *bool  `json:"is_checked,omitempty"`
	Notes     string `json:"notes,omitempty"`
}

// PackingListWithItems represents a packing list with all its items
type PackingListWithItems struct {
	PackingList
	Items            []PackingItem `json:"items"`
	TotalItems       int           `json:"total_items"`
	CheckedItems     int           `json:"checked_items"`
	PercentComplete  float64       `json:"percent_complete"`
}

// SuggestItemsRequest represents the request to get suggested items
type SuggestItemsRequest struct {
	Climate      string `json:"climate,omitempty"`
	DurationDays int    `json:"duration_days,omitempty"`
}