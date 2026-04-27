package models

import "time"

// ── Follow ────────────────────────────────────────────────────────────────────

// UserFollow represents a row in user_follows.
type UserFollow struct {
	ID          int       `json:"id"`
	FollowerID  int       `json:"follower_id"`
	FollowingID int       `json:"following_id"`
	CreatedAt   time.Time `json:"created_at"`
}

// PublicProfile is returned by GET /users/:id/profile.
type PublicProfile struct {
	ID             int    `json:"id"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	FollowerCount  int    `json:"follower_count"`
	FollowingCount int    `json:"following_count"`
	IsFollowing    bool   `json:"is_following"` // true if the caller follows this user
}

// FollowListEntry is one entry in the followers / following lists.
type FollowListEntry struct {
	ID        int    `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

// ── Visibility ────────────────────────────────────────────────────────────────

// VisibilityRequest is the body for PUT /trips/:id/visibility.
type VisibilityRequest struct {
	Visibility string `json:"visibility" binding:"required"` // "public" | "private"
}

// ── Feed ─────────────────────────────────────────────────────────────────────

// FeedTrip is one trip card in the social feed.
type FeedTrip struct {
	TripID      int       `json:"trip_id"`
	TripName    string    `json:"trip_name"`
	Destination string    `json:"destination"`
	StartDate   string    `json:"start_date"`
	EndDate     string    `json:"end_date"`
	Status      string    `json:"status"`
	Visibility  string    `json:"visibility"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	OwnerID     int       `json:"owner_id"`
	OwnerName   string    `json:"owner_name"`
}
