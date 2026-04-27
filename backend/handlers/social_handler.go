package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

// ── Follow / Unfollow ─────────────────────────────────────────────────────────

// FollowUser handles POST /api/users/:id/follow.
func FollowUser(c *gin.Context) {
	claims, ok := getCallerClaims(c)
	if !ok {
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid user ID"})
		return
	}

	if claims.UserID == targetID {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Cannot follow yourself"})
		return
	}

	// Verify target user exists
	var exists int
	database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE id = ?", targetID).Scan(&exists)
	if exists == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "User not found"})
		return
	}

	// Check already following
	var already int
	database.DB.QueryRow(
		"SELECT COUNT(*) FROM user_follows WHERE follower_id = ? AND following_id = ?",
		claims.UserID, targetID,
	).Scan(&already)
	if already > 0 {
		c.JSON(http.StatusConflict, models.ErrorResponse{Error: "conflict", Message: "Already following this user"})
		return
	}

	_, err = database.DB.Exec(
		"INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)",
		claims.UserID, targetID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to follow user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User followed successfully"})
}

// UnfollowUser handles DELETE /api/users/:id/follow.
func UnfollowUser(c *gin.Context) {
	claims, ok := getCallerClaims(c)
	if !ok {
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid user ID"})
		return
	}

	result, err := database.DB.Exec(
		"DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?",
		claims.UserID, targetID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to unfollow user"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Follow relationship not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User unfollowed successfully"})
}

// ── Public Profile ────────────────────────────────────────────────────────────

// GetPublicProfile handles GET /api/users/:id/profile.
func GetPublicProfile(c *gin.Context) {
	claims, ok := getCallerClaims(c)
	if !ok {
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid user ID"})
		return
	}

	var profile models.PublicProfile
	err = database.DB.QueryRow(
		"SELECT id, first_name, last_name FROM users WHERE id = ?", targetID,
	).Scan(&profile.ID, &profile.FirstName, &profile.LastName)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "User not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve profile"})
		return
	}

	database.DB.QueryRow(
		"SELECT COUNT(*) FROM user_follows WHERE following_id = ?", targetID,
	).Scan(&profile.FollowerCount)

	database.DB.QueryRow(
		"SELECT COUNT(*) FROM user_follows WHERE follower_id = ?", targetID,
	).Scan(&profile.FollowingCount)

	var isFollowing int
	database.DB.QueryRow(
		"SELECT COUNT(*) FROM user_follows WHERE follower_id = ? AND following_id = ?",
		claims.UserID, targetID,
	).Scan(&isFollowing)
	profile.IsFollowing = isFollowing > 0

	c.JSON(http.StatusOK, profile)
}

// ── Followers / Following Lists ───────────────────────────────────────────────

// GetFollowers handles GET /api/users/:id/followers.
func GetFollowers(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid user ID"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT u.id, u.first_name, u.last_name
		FROM user_follows uf
		JOIN users u ON u.id = uf.follower_id
		WHERE uf.following_id = ?
		ORDER BY uf.created_at DESC
	`, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve followers"})
		return
	}
	defer rows.Close()

	followers := []models.FollowListEntry{}
	for rows.Next() {
		var e models.FollowListEntry
		if err := rows.Scan(&e.ID, &e.FirstName, &e.LastName); err == nil {
			followers = append(followers, e)
		}
	}

	c.JSON(http.StatusOK, gin.H{"followers": followers})
}

// GetFollowing handles GET /api/users/:id/following.
func GetFollowing(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid user ID"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT u.id, u.first_name, u.last_name
		FROM user_follows uf
		JOIN users u ON u.id = uf.following_id
		WHERE uf.follower_id = ?
		ORDER BY uf.created_at DESC
	`, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve following"})
		return
	}
	defer rows.Close()

	following := []models.FollowListEntry{}
	for rows.Next() {
		var e models.FollowListEntry
		if err := rows.Scan(&e.ID, &e.FirstName, &e.LastName); err == nil {
			following = append(following, e)
		}
	}

	c.JSON(http.StatusOK, gin.H{"following": following})
}

// ── Trip Visibility ───────────────────────────────────────────────────────────

// UpdateTripVisibility handles PUT /api/trips/:id/visibility.
func UpdateTripVisibility(c *gin.Context) {
	claims, ok := getCallerClaims(c)
	if !ok {
		return
	}

	tripID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid trip ID"})
		return
	}

	var req models.VisibilityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "visibility field is required"})
		return
	}

	if req.Visibility != "public" && req.Visibility != "private" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: "visibility must be 'public' or 'private'"})
		return
	}

	result, err := database.DB.Exec(
		"UPDATE trips SET visibility = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
		req.Visibility, tripID, claims.UserID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to update visibility"})
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Trip not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Visibility updated", "visibility": req.Visibility})
}

// ── Public Trips for a User ───────────────────────────────────────────────────

// GetPublicTripsForUser handles GET /api/users/:id/trips.
// Returns only public trips for the given user.
func GetPublicTripsForUser(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid user ID"})
		return
	}

	// Verify user exists
	var exists int
	database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE id = ?", targetID).Scan(&exists)
	if exists == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "User not found"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT t.id, t.trip_name, COALESCE(t.destination,''), 
		       COALESCE(t.start_date,''), COALESCE(t.end_date,''),
		       t.status, t.visibility, t.created_at, t.updated_at,
		       t.user_id, u.first_name || ' ' || u.last_name
		FROM trips t
		JOIN users u ON u.id = t.user_id
		WHERE t.user_id = ? AND t.visibility = 'public'
		ORDER BY t.created_at DESC
	`, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve trips"})
		return
	}
	defer rows.Close()

	trips := []models.FeedTrip{}
	for rows.Next() {
		var ft models.FeedTrip
		if err := rows.Scan(
			&ft.TripID, &ft.TripName, &ft.Destination,
			&ft.StartDate, &ft.EndDate,
			&ft.Status, &ft.Visibility, &ft.CreatedAt, &ft.UpdatedAt,
			&ft.OwnerID, &ft.OwnerName,
		); err == nil {
			trips = append(trips, ft)
		}
	}

	c.JSON(http.StatusOK, gin.H{"trips": trips})
}

// ── Social Feed ───────────────────────────────────────────────────────────────

// GetFeed handles GET /api/feed.
// Returns paginated public trips from users the caller follows.
func GetFeed(c *gin.Context) {
	claims, ok := getCallerClaims(c)
	if !ok {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	rows, err := database.DB.Query(`
		SELECT t.id, t.trip_name, COALESCE(t.destination,''),
		       COALESCE(t.start_date,''), COALESCE(t.end_date,''),
		       t.status, t.visibility, t.created_at, t.updated_at,
		       t.user_id, u.first_name || ' ' || u.last_name
		FROM trips t
		JOIN users u ON u.id = t.user_id
		JOIN user_follows uf ON uf.following_id = t.user_id
		WHERE uf.follower_id = ? AND t.visibility = 'public'
		ORDER BY t.created_at DESC
		LIMIT ? OFFSET ?
	`, claims.UserID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve feed"})
		return
	}
	defer rows.Close()

	feed := []models.FeedTrip{}
	for rows.Next() {
		var ft models.FeedTrip
		if err := rows.Scan(
			&ft.TripID, &ft.TripName, &ft.Destination,
			&ft.StartDate, &ft.EndDate,
			&ft.Status, &ft.Visibility, &ft.CreatedAt, &ft.UpdatedAt,
			&ft.OwnerID, &ft.OwnerName,
		); err == nil {
			feed = append(feed, ft)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"feed":  feed,
		"page":  page,
		"limit": limit,
	})
}

// ── helper ────────────────────────────────────────────────────────────────────

func getCallerClaims(c *gin.Context) (*utils.Claims, bool) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return nil, false
	}
	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "Invalid user claims"})
		return nil, false
	}
	return claims, true
}
