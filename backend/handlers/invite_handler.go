package handlers

import (
	"database/sql"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const inviteTTL = 7 * 24 * time.Hour // invites expire after 7 days

// SendTripInvites handles POST /api/trips/:id/invite.
// The trip owner can supply one or more email addresses; each gets a unique
// token stored in trip_invites. In a real deployment you would hand the token
// to an email service here — for now the token is returned in the response so
// the frontend / tests can drive the accept flow without an SMTP server.
func SendTripInvites(c *gin.Context) {
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

	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid trip ID"})
		return
	}

	// Verify the trip exists and belongs to the caller
	var ownerID int
	err = database.DB.QueryRow("SELECT user_id FROM trips WHERE id = ?", tripID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Trip not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to verify trip"})
		return
	}
	if ownerID != claims.UserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "Only the trip owner can send invites"})
		return
	}

	var req models.InviteRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Emails) == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "emails array is required and must not be empty"})
		return
	}

	// Mark any previously-pending invites for this trip that have passed their
	// expiry time so subsequent duplicate checks are accurate.
	database.DB.Exec(`
		UPDATE trip_invites SET status = 'expired'
		WHERE trip_id = ? AND status = 'pending' AND expires_at < CURRENT_TIMESTAMP
	`, tripID)

	results := make([]models.InviteResult, 0, len(req.Emails))

	for _, raw := range req.Emails {
		email := strings.TrimSpace(strings.ToLower(raw))

		// Basic format validation
		if _, parseErr := mail.ParseAddress(email); parseErr != nil {
			results = append(results, models.InviteResult{Email: email, Status: "invalid_email"})
			continue
		}

		// Check if the email belongs to a user who is already a collaborator
		// (i.e. they own or are a group member on this trip).
		alreadyCollab := isAlreadyCollaborator(tripID, email)
		if alreadyCollab {
			results = append(results, models.InviteResult{Email: email, Status: "already_collaborator"})
			continue
		}

		// Check for an existing pending invite for this (trip, email) pair
		var existingStatus string
		lookupErr := database.DB.QueryRow(
			"SELECT status FROM trip_invites WHERE trip_id = ? AND email = ? AND status = 'pending'",
			tripID, email,
		).Scan(&existingStatus)

		if lookupErr == nil {
			// A live pending invite already exists
			results = append(results, models.InviteResult{Email: email, Status: "already_invited"})
			continue
		}

		// Insert a fresh invite
		token := uuid.NewString()
		expiresAt := time.Now().UTC().Add(inviteTTL)

		_, insertErr := database.DB.Exec(`
			INSERT INTO trip_invites (trip_id, email, token, status, expires_at)
			VALUES (?, ?, ?, 'pending', ?)
		`, tripID, email, token, expiresAt.Format("2006-01-02 15:04:05"))

		if insertErr != nil {
			// Treat insert failure as a soft error; keep processing other emails
			results = append(results, models.InviteResult{Email: email, Status: "error"})
			continue
		}

		// In a real system: dispatch email here via SendGrid / SES / etc.
		// e.g. emailService.Send(email, buildInviteLink(token))

		results = append(results, models.InviteResult{Email: email, Status: "invited"})
	}

	c.JSON(http.StatusOK, models.InviteResponse{
		Message: "Invites processed",
		Results: results,
	})
}

// AcceptInvite handles POST /api/invites/:token/accept.
// The authenticated user accepts the invite identified by token and is added
// as a collaborator on the trip (via itinerary_collaborators, matching the
// existing collaborator model used by the itinerary handlers).
func AcceptInvite(c *gin.Context) {
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

	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Token is required"})
		return
	}

	// Expire any stale pending invites on read
	database.DB.Exec(`
		UPDATE trip_invites SET status = 'expired'
		WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP
	`)

	// Look up the invite
	var invite models.TripInvite
	err := database.DB.QueryRow(`
		SELECT id, trip_id, email, status, expires_at, created_at
		FROM trip_invites WHERE token = ?
	`, token).Scan(
		&invite.ID,
		&invite.TripID,
		&invite.Email,
		&invite.Status,
		&invite.ExpiresAt,
		&invite.CreatedAt,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Invite not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to look up invite"})
		return
	}

	if invite.Status == "expired" {
		c.JSON(http.StatusGone, models.ErrorResponse{Error: "invite_expired", Message: "This invite link has expired"})
		return
	}
	if invite.Status == "accepted" {
		c.JSON(http.StatusConflict, models.ErrorResponse{Error: "already_accepted", Message: "This invite has already been accepted"})
		return
	}

	// Verify the trip still exists
	var tripOwnerID int
	err = database.DB.QueryRow("SELECT user_id FROM trips WHERE id = ?", invite.TripID).Scan(&tripOwnerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Trip no longer exists"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to verify trip"})
		return
	}

	// Guard: user must not already be a collaborator
	if isAlreadyCollaborator(invite.TripID, getUserEmail(claims.UserID)) {
		c.JSON(http.StatusConflict, models.ErrorResponse{Error: "already_collaborator", Message: "You are already a collaborator on this trip"})
		return
	}

	// Add user to itinerary_collaborators for the trip's itinerary (if one exists)
	// and also to the trip's group members (if a group is linked).
	// Using itinerary_collaborators as the canonical collaborator store to match
	// the existing itinerary handler pattern.
	addCollaboratorToTrip(invite.TripID, claims.UserID)

	// Mark invite as accepted
	database.DB.Exec(`
		UPDATE trip_invites SET status = 'accepted' WHERE id = ?
	`, invite.ID)

	// Fire collaborator_added notification to the trip owner
	prefs := getNotifPrefs(tripOwnerID)
	if prefs.CollaboratorUpdates {
		tripIDCopy := invite.TripID
		CreateNotification(models.CreateNotificationRequest{
			UserID:  tripOwnerID,
			Type:    models.NotificationCollaboratorAdded,
			Title:   "New collaborator joined",
			Message: invite.Email + " has accepted your trip invite.",
			TripID:  &tripIDCopy,
		})
	}

	c.JSON(http.StatusOK, models.AcceptInviteResponse{
		Message: "Invite accepted successfully",
		TripID:  invite.TripID,
	})
}

// GetTripInvites handles GET /api/trips/:id/invites.
// Returns all invites for the trip so the owner can see pending/accepted/expired statuses.
func GetTripInvites(c *gin.Context) {
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

	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid trip ID"})
		return
	}

	// Only the trip owner may see invites
	var ownerID int
	err = database.DB.QueryRow("SELECT user_id FROM trips WHERE id = ?", tripID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Trip not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to verify trip"})
		return
	}
	if ownerID != claims.UserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "Only the trip owner can view invites"})
		return
	}

	// Expire stale invites on read
	database.DB.Exec(`
		UPDATE trip_invites SET status = 'expired'
		WHERE trip_id = ? AND status = 'pending' AND expires_at < CURRENT_TIMESTAMP
	`, tripID)

	rows, err := database.DB.Query(`
		SELECT id, trip_id, email, status, expires_at, created_at
		FROM trip_invites WHERE trip_id = ?
		ORDER BY created_at DESC
	`, tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve invites"})
		return
	}
	defer rows.Close()

	invites := []models.TripInvite{}
	for rows.Next() {
		var inv models.TripInvite
		if scanErr := rows.Scan(&inv.ID, &inv.TripID, &inv.Email, &inv.Status, &inv.ExpiresAt, &inv.CreatedAt); scanErr == nil {
			invites = append(invites, inv)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"trip_id": tripID,
		"invites": invites,
	})
}

// ── helpers ──────────────────────────────────────────────────────────────────

// isAlreadyCollaborator returns true if the given email belongs to a user who
// already owns or is a group member / itinerary collaborator on this trip.
func isAlreadyCollaborator(tripID int, email string) bool {
	if email == "" {
		return false
	}
	// Resolve email → user ID
	var uid int
	err := database.DB.QueryRow("SELECT id FROM users WHERE email = ?", email).Scan(&uid)
	if err != nil {
		// Email not registered — cannot be a collaborator yet
		return false
	}
	// Is this user the trip owner?
	var ownerID int
	if database.DB.QueryRow("SELECT user_id FROM trips WHERE id = ?", tripID).Scan(&ownerID) == nil {
		if ownerID == uid {
			return true
		}
	}
	// Is this user in any group linked to the trip?
	var count int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM group_members gm
		JOIN groups g ON g.id = gm.group_id
		WHERE g.trip_id = ? AND gm.user_id = ?
	`, tripID, uid).Scan(&count)
	return count > 0
}

// getUserEmail returns the email for a given user ID.
func getUserEmail(userID int) string {
	var email string
	database.DB.QueryRow("SELECT email FROM users WHERE id = ?", userID).Scan(&email)
	return email
}

// addCollaboratorToTrip adds the user to the itinerary linked to the trip
// (if one exists) and to the group linked to the trip (if one exists).
func addCollaboratorToTrip(tripID, userID int) {
	// Add to itinerary_collaborators for any itinerary whose created_by owns this trip
	database.DB.Exec(`
		INSERT OR IGNORE INTO itinerary_collaborators (itinerary_id, user_id)
		SELECT i.id, ?
		FROM itineraries i
		JOIN trips t ON t.user_id = i.created_by
		WHERE t.id = ?
	`, userID, tripID)

	// Add to group_members for any group linked to this trip
	database.DB.Exec(`
		INSERT OR IGNORE INTO group_members (group_id, user_id)
		SELECT id, ? FROM groups WHERE trip_id = ?
	`, userID, tripID)
}
