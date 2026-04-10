package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// ─── shared test helpers ──────────────────────────────────────────────────────

func setupTimelineRouter(db interface{}) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	api := r.Group("/api")
	api.Use(func(c *gin.Context) {
		claims := &utils.Claims{UserID: 1, Email: "test@example.com"}
		c.Set("user", claims)
		c.Next()
	})
	{
		api.GET("/trips/:id/timeline", GetTimeline)
		api.POST("/trips/:id/timeline/items", CreateTimelineItem)
		api.PUT("/trips/:id/timeline/items/:itemId", UpdateTimelineItem)
		api.DELETE("/trips/:id/timeline/items/:itemId", DeleteTimelineItem)
		api.PUT("/trips/:id/timeline/items/:itemId/reorder", ReorderTimelineItem)
	}
	return r
}

// initTimelineDB sets up an in-memory SQLite database for timeline tests
// and creates a test user + trip, returning (tripID, router).
func initTimelineDB(t *testing.T) (int, *gin.Engine) {
	t.Helper()
	err := database.InitDB(":memory:")
	assert.Nil(t, err)

	// seed user
	_, err = database.DB.Exec(
		`INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES (1, 'test@example.com', 'hash', 'Test', 'User')`,
	)
	assert.Nil(t, err)

	// seed trip
	result, err := database.DB.Exec(
		`INSERT INTO trips (user_id, trip_name, destination, start_date, end_date, status) VALUES (1, 'Test Trip', 'Paris', '2026-06-01', '2026-06-05', 'planning')`,
	)
	assert.Nil(t, err)
	tripID64, _ := result.LastInsertId()
	return int(tripID64), setupTimelineRouter(nil)
}

// ─── test: GET timeline ───────────────────────────────────────────────────────

func TestGetTimeline_EmptyTrip(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("GET", fmt.Sprintf("/api/trips/%d/timeline", tripID), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.TimelineResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, tripID, resp.TripID)
	assert.Equal(t, "Test Trip", resp.TripName)
	assert.Equal(t, "2026-06-01", resp.StartDate)
	assert.Empty(t, resp.Days)
}

func TestGetTimeline_NotFound(t *testing.T) {
	_, r := initTimelineDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("GET", "/api/trips/9999/timeline", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetTimeline_WithItems_GroupedByDay(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	// Insert items on two different dates
	database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, start_time, sort_order) VALUES (?, 1, 'Flight', 'travel', '2026-06-01', '08:00', 1)`,
		tripID,
	)
	database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, start_time, sort_order) VALUES (?, 1, 'Hotel Check-in', 'accommodation', '2026-06-01', '14:00', 2)`,
		tripID,
	)
	database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, start_time, sort_order) VALUES (?, 1, 'Eiffel Tower', 'activity', '2026-06-02', '10:00', 1)`,
		tripID,
	)

	req, _ := http.NewRequest("GET", fmt.Sprintf("/api/trips/%d/timeline", tripID), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.TimelineResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	assert.Len(t, resp.Days, 2)
	assert.Equal(t, "2026-06-01", resp.Days[0].Date)
	assert.Equal(t, 1, resp.Days[0].DayNumber)
	assert.Len(t, resp.Days[0].Items, 2)
	assert.Equal(t, "2026-06-02", resp.Days[1].Date)
	assert.Equal(t, 2, resp.Days[1].DayNumber)
	assert.Len(t, resp.Days[1].Items, 1)
}

func TestGetTimeline_ChronologicalOrder(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	// Insert out-of-order on purpose
	database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, start_time, sort_order) VALUES (?, 1, 'Dinner', 'dining', '2026-06-01', '19:00', 2)`,
		tripID,
	)
	database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, start_time, sort_order) VALUES (?, 1, 'Breakfast', 'dining', '2026-06-01', '08:00', 1)`,
		tripID,
	)

	req, _ := http.NewRequest("GET", fmt.Sprintf("/api/trips/%d/timeline", tripID), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.TimelineResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	assert.Len(t, resp.Days[0].Items, 2)
	// First item should be breakfast (earlier start_time)
	assert.Equal(t, "Breakfast", resp.Days[0].Items[0].Title)
	assert.Equal(t, "Dinner", resp.Days[0].Items[1].Title)
}

func TestGetTimeline_ActivityTypeInResponse(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, sort_order) VALUES (?, 1, 'Bus', 'travel', '2026-06-01', 1)`,
		tripID,
	)

	req, _ := http.NewRequest("GET", fmt.Sprintf("/api/trips/%d/timeline", tripID), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp models.TimelineResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, models.ActivityTypeTravel, resp.Days[0].Items[0].ActivityType)
}

// ─── test: POST create item ───────────────────────────────────────────────────

func TestCreateTimelineItem_Success(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]interface{}{
		"title":         "Eiffel Tower Visit",
		"activity_type": "activity",
		"date":          "2026-06-01",
		"start_time":    "10:00",
		"end_time":      "12:00",
		"location":      "Champ de Mars",
		"notes":         "Book tickets in advance",
	})

	req, _ := http.NewRequest("POST", fmt.Sprintf("/api/trips/%d/timeline/items", tripID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Timeline item created successfully", resp["message"])
	assert.NotNil(t, resp["item_id"])
}

func TestCreateTimelineItem_MissingTitle(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]string{
		"activity_type": "activity",
		"date":          "2026-06-01",
	})

	req, _ := http.NewRequest("POST", fmt.Sprintf("/api/trips/%d/timeline/items", tripID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateTimelineItem_MissingDate(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]string{
		"title":         "Some Event",
		"activity_type": "other",
	})

	req, _ := http.NewRequest("POST", fmt.Sprintf("/api/trips/%d/timeline/items", tripID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateTimelineItem_InvalidActivityType(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]string{
		"title":         "Some Event",
		"activity_type": "INVALID_TYPE",
		"date":          "2026-06-01",
	})

	req, _ := http.NewRequest("POST", fmt.Sprintf("/api/trips/%d/timeline/items", tripID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "validation_error", resp["error"])
}

func TestCreateTimelineItem_InvalidDateFormat(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]string{
		"title":         "Event",
		"activity_type": "activity",
		"date":          "01/06/2026",
	})

	req, _ := http.NewRequest("POST", fmt.Sprintf("/api/trips/%d/timeline/items", tripID), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateTimelineItem_TripNotFound(t *testing.T) {
	_, r := initTimelineDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]string{
		"title":         "Event",
		"activity_type": "activity",
		"date":          "2026-06-01",
	})

	req, _ := http.NewRequest("POST", "/api/trips/9999/timeline/items", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestCreateTimelineItem_SortOrderAutoIncrement(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	createItem := func(title string) {
		body, _ := json.Marshal(map[string]string{
			"title":         title,
			"activity_type": "activity",
			"date":          "2026-06-01",
		})
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/trips/%d/timeline/items", tripID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(httptest.NewRecorder(), req)
	}
	createItem("First")
	createItem("Second")

	// Verify sort_order values in the DB
	rows, _ := database.DB.Query(
		"SELECT title, sort_order FROM itinerary_items WHERE trip_id = ? ORDER BY sort_order",
		tripID,
	)
	defer rows.Close()
	type row struct {
		title string
		order int
	}
	var items []row
	for rows.Next() {
		var it row
		rows.Scan(&it.title, &it.order)
		items = append(items, it)
	}
	assert.Len(t, items, 2)
	assert.Equal(t, 1, items[0].order)
	assert.Equal(t, 2, items[1].order)
}

// ─── test: PUT update item ────────────────────────────────────────────────────

func TestUpdateTimelineItem_Success(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	// seed one item
	result, _ := database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, sort_order) VALUES (?, 1, 'Old Title', 'other', '2026-06-01', 1)`,
		tripID,
	)
	itemID, _ := result.LastInsertId()

	body, _ := json.Marshal(map[string]string{
		"title":    "New Title",
		"location": "Louvre Museum",
	})
	req, _ := http.NewRequest("PUT",
		fmt.Sprintf("/api/trips/%d/timeline/items/%d", tripID, itemID),
		bytes.NewBuffer(body),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Timeline item updated successfully", resp["message"])

	// Verify in DB
	var title, location string
	database.DB.QueryRow("SELECT title, location FROM itinerary_items WHERE id = ?", itemID).Scan(&title, &location)
	assert.Equal(t, "New Title", title)
	assert.Equal(t, "Louvre Museum", location)
}

func TestUpdateTimelineItem_NotFound(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]string{"title": "Anything"})
	req, _ := http.NewRequest("PUT",
		fmt.Sprintf("/api/trips/%d/timeline/items/9999", tripID),
		bytes.NewBuffer(body),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUpdateTimelineItem_InvalidActivityType(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	result, _ := database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, sort_order) VALUES (?, 1, 'Event', 'other', '2026-06-01', 1)`,
		tripID,
	)
	itemID, _ := result.LastInsertId()

	body, _ := json.Marshal(map[string]string{"activity_type": "NOPE"})
	req, _ := http.NewRequest("PUT",
		fmt.Sprintf("/api/trips/%d/timeline/items/%d", tripID, itemID),
		bytes.NewBuffer(body),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ─── test: DELETE item ────────────────────────────────────────────────────────

func TestDeleteTimelineItem_Success(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	result, _ := database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, sort_order) VALUES (?, 1, 'Delete Me', 'other', '2026-06-01', 1)`,
		tripID,
	)
	itemID, _ := result.LastInsertId()

	req, _ := http.NewRequest("DELETE",
		fmt.Sprintf("/api/trips/%d/timeline/items/%d", tripID, itemID),
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify deleted
	var count int
	database.DB.QueryRow("SELECT COUNT(*) FROM itinerary_items WHERE id = ?", itemID).Scan(&count)
	assert.Equal(t, 0, count)
}

func TestDeleteTimelineItem_NotFound(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	req, _ := http.NewRequest("DELETE",
		fmt.Sprintf("/api/trips/%d/timeline/items/9999", tripID),
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ─── test: PUT reorder item ───────────────────────────────────────────────────

func TestReorderTimelineItem_Success(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	// Insert two items on the same date
	res1, _ := database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, sort_order) VALUES (?, 1, 'Item A', 'activity', '2026-06-01', 1)`,
		tripID,
	)
	res2, _ := database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, sort_order) VALUES (?, 1, 'Item B', 'activity', '2026-06-01', 2)`,
		tripID,
	)
	itemAID, _ := res1.LastInsertId()
	_, _ = res2.LastInsertId()

	// Move Item A to position 2 (after Item B)
	body, _ := json.Marshal(map[string]interface{}{
		"date":       "2026-06-01",
		"sort_order": 2,
	})
	req, _ := http.NewRequest("PUT",
		fmt.Sprintf("/api/trips/%d/timeline/items/%d/reorder", tripID, itemAID),
		bytes.NewBuffer(body),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestReorderTimelineItem_MoveToNewDate(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	result, _ := database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, sort_order) VALUES (?, 1, 'Flexible Event', 'activity', '2026-06-01', 1)`,
		tripID,
	)
	itemID, _ := result.LastInsertId()

	body, _ := json.Marshal(map[string]interface{}{
		"date":       "2026-06-03",
		"sort_order": 1,
	})
	req, _ := http.NewRequest("PUT",
		fmt.Sprintf("/api/trips/%d/timeline/items/%d/reorder", tripID, itemID),
		bytes.NewBuffer(body),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var newDate string
	database.DB.QueryRow("SELECT date FROM itinerary_items WHERE id = ?", itemID).Scan(&newDate)
	assert.Equal(t, "2026-06-03", newDate)
}

func TestReorderTimelineItem_NotFound(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	body, _ := json.Marshal(map[string]interface{}{
		"date":       "2026-06-01",
		"sort_order": 1,
	})
	req, _ := http.NewRequest("PUT",
		fmt.Sprintf("/api/trips/%d/timeline/items/9999/reorder", tripID),
		bytes.NewBuffer(body),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestReorderTimelineItem_InvalidDate(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	result, _ := database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, sort_order) VALUES (?, 1, 'Event', 'other', '2026-06-01', 1)`,
		tripID,
	)
	itemID, _ := result.LastInsertId()

	body, _ := json.Marshal(map[string]interface{}{
		"date":       "not-a-date",
		"sort_order": 1,
	})
	req, _ := http.NewRequest("PUT",
		fmt.Sprintf("/api/trips/%d/timeline/items/%d/reorder", tripID, itemID),
		bytes.NewBuffer(body),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestReorderTimelineItem_MissingBody(t *testing.T) {
	tripID, r := initTimelineDB(t)
	defer database.CloseDB()

	result, _ := database.DB.Exec(
		`INSERT INTO itinerary_items (trip_id, user_id, title, activity_type, date, sort_order) VALUES (?, 1, 'Event', 'other', '2026-06-01', 1)`,
		tripID,
	)
	itemID, _ := result.LastInsertId()

	req, _ := http.NewRequest("PUT",
		fmt.Sprintf("/api/trips/%d/timeline/items/%d/reorder", tripID, itemID),
		bytes.NewBuffer([]byte("{}")),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ─── test: all five activity types accepted ───────────────────────────────────

func TestCreateTimelineItem_AllActivityTypes(t *testing.T) {
	types := []string{"travel", "accommodation", "activity", "dining", "other"}
	for _, at := range types {
		t.Run(at, func(t *testing.T) {
			tripID, r := initTimelineDB(t)
			defer database.CloseDB()

			body, _ := json.Marshal(map[string]string{
				"title":         "Test " + at,
				"activity_type": at,
				"date":          "2026-06-01",
			})
			req, _ := http.NewRequest("POST", fmt.Sprintf("/api/trips/%d/timeline/items", tripID), bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			assert.Equal(t, http.StatusCreated, w.Code, "failed for activity_type: "+at)
		})
	}
}
