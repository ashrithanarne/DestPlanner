package handlers

import (
	"net/http"
	"strconv"

	"backend/models"

	"github.com/gin-gonic/gin"
)

var itineraries = make(map[int]models.ItineraryResponse)
var nextID = 1

// 1. Create Itinerary
func CreateItinerary(c *gin.Context) {
	var input models.Itinerary

	if err := c.ShouldBindJSON(&input); err != nil || input.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	itinerary := models.ItineraryResponse{
		ID:            nextID,
		Name:          input.Name,
		Owner:         input.Owner,
		Destinations:  []int{},
		Collaborators: []int{},
	}

	itineraries[nextID] = itinerary
	nextID++

	c.JSON(http.StatusCreated, itinerary)
}

// 2. Get Itinerary
func GetItinerary(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	itinerary, exists := itineraries[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}

	c.JSON(http.StatusOK, itinerary)
}

// 3. Add Destination
func AddDestination(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var input struct {
		DestinationID int `json:"destination_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil || input.DestinationID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	itinerary, exists := itineraries[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}

	itinerary.Destinations = append(itinerary.Destinations, input.DestinationID)
	itineraries[id] = itinerary

	c.JSON(http.StatusOK, itinerary)
}

// 4. Remove Destination
func RemoveDestination(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	destID, _ := strconv.Atoi(c.Param("dest_id"))

	itinerary, exists := itineraries[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}

	newList := []int{}
	for _, d := range itinerary.Destinations {
		if d != destID {
			newList = append(newList, d)
		}
	}

	itinerary.Destinations = newList
	itineraries[id] = itinerary

	c.JSON(http.StatusOK, itinerary)
}

// 5. Add Collaborator
func AddCollaborator(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var input struct {
		UserID int `json:"user_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil || input.UserID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	itinerary, exists := itineraries[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}

	itinerary.Collaborators = append(itinerary.Collaborators, input.UserID)
	itineraries[id] = itinerary

	c.JSON(http.StatusOK, itinerary)
}

// 6. Remove Collaborator
func RemoveCollaborator(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := strconv.Atoi(c.Param("user_id"))

	itinerary, exists := itineraries[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}

	newList := []int{}
	for _, u := range itinerary.Collaborators {
		if u != userID {
			newList = append(newList, u)
		}
	}

	itinerary.Collaborators = newList
	itineraries[id] = itinerary

	c.JSON(http.StatusOK, itinerary)
}

// 7. Delete Itinerary
func DeleteItinerary(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	if _, exists := itineraries[id]; !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}

	delete(itineraries, id)
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
