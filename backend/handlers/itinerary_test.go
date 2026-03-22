package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	api := r.Group("/api")
	{
		api.POST("/itineraries", CreateItinerary)
		api.GET("/itineraries/:id", GetItinerary)
		api.POST("/itineraries/:id/destinations", AddDestination)
		api.DELETE("/itineraries/:id/destinations/:dest_id", RemoveDestination)
		api.POST("/itineraries/:id/collaborators", AddCollaborator)
		api.DELETE("/itineraries/:id/collaborators/:user_id", RemoveCollaborator)
		api.DELETE("/itineraries/:id", DeleteItinerary)
	}

	return r
}

func TestItineraryFlow(t *testing.T) {
	router := setupRouter()

	// -------------------------
	// 1. Create Itinerary
	// -------------------------
	createBody := `{"name":"Trip to NYC","owner":1}`
	req, _ := http.NewRequest("POST", "/api/itineraries", bytes.NewBuffer([]byte(createBody)))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var createRes map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &createRes)
	assert.Nil(t, err)

	itineraryID := int(createRes["id"].(float64))

	// -------------------------
	// 2. Add Destination
	// -------------------------
	destBody := `{"destination_id":101}`
	req, _ = http.NewRequest(
		"POST",
		fmt.Sprintf("/api/itineraries/%d/destinations", itineraryID),
		bytes.NewBuffer([]byte(destBody)),
	)
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 3. Remove Destination
	// -------------------------
	req, _ = http.NewRequest(
		"DELETE",
		fmt.Sprintf("/api/itineraries/%d/destinations/%d", itineraryID, 101),
		nil,
	)

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 4. Add Collaborator
	// -------------------------
	collabBody := `{"user_id":5}`
	req, _ = http.NewRequest(
		"POST",
		fmt.Sprintf("/api/itineraries/%d/collaborators", itineraryID),
		bytes.NewBuffer([]byte(collabBody)),
	)
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 5. Remove Collaborator
	// -------------------------
	req, _ = http.NewRequest(
		"DELETE",
		fmt.Sprintf("/api/itineraries/%d/collaborators/%d", itineraryID, 5),
		nil,
	)

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 6. Get Itinerary
	// -------------------------
	req, _ = http.NewRequest(
		"GET",
		fmt.Sprintf("/api/itineraries/%d", itineraryID),
		nil,
	)

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 7. Delete Itinerary
	// -------------------------
	req, _ = http.NewRequest(
		"DELETE",
		fmt.Sprintf("/api/itineraries/%d", itineraryID),
		nil,
	)

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// -------------------------
	// 8. Verify Deletion (should 404)
	// -------------------------
	req, _ = http.NewRequest(
		"GET",
		fmt.Sprintf("/api/itineraries/%d", itineraryID),
		nil,
	)

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
