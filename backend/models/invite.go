package models

import "time"

// InviteStatus represents the state of a trip invite.
type InviteStatus string

const (
	InviteStatusPending  InviteStatus = "pending"
	InviteStatusAccepted InviteStatus = "accepted"
	InviteStatusExpired  InviteStatus = "expired"
)

// TripInvite represents a row in the trip_invites table.
type TripInvite struct {
	ID        int          `json:"id"`
	TripID    int          `json:"trip_id"`
	Email     string       `json:"email"`
	Token     string       `json:"-"` // never expose raw token in list responses
	Status    InviteStatus `json:"status"`
	ExpiresAt time.Time    `json:"expires_at"`
	CreatedAt time.Time    `json:"created_at"`
}

// InviteRequest is the body for POST /api/trips/:id/invite.
type InviteRequest struct {
	Emails []string `json:"emails" binding:"required,min=1"`
}

// InviteResult is the per-email outcome returned in the invite response.
type InviteResult struct {
	Email  string `json:"email"`
	Status string `json:"status"` // "invited" | "already_invited" | "already_collaborator" | "invalid_email"
}

// InviteResponse is the envelope returned by POST /api/trips/:id/invite.
type InviteResponse struct {
	Message string         `json:"message"`
	Results []InviteResult `json:"results"`
}

// AcceptInviteResponse is returned by POST /api/invites/:token/accept.
type AcceptInviteResponse struct {
	Message string `json:"message"`
	TripID  int    `json:"trip_id"`
}
