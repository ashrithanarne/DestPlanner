package handlers

import (
	"net/http"
	"strconv"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
)

// getSimulatedTravelOptions returns simulated travel options for a destination
func getSimulatedTravelOptions(destinationName string) []models.TravelOption {
	return []models.TravelOption{
		{
			ID:            1,
			Type:          "Flight",
			Name:          "Direct Flight to " + destinationName,
			Description:   "Round trip direct flight with standard luggage included",
			EstimatedCost: 450.00,
			Currency:      "USD",
			BookingLink:   "https://www.skyscanner.com",
		},
		{
			ID:            2,
			Type:          "Flight",
			Name:          "Connecting Flight to " + destinationName,
			Description:   "Round trip connecting flight, budget option",
			EstimatedCost: 280.00,
			Currency:      "USD",
			BookingLink:   "https://www.kayak.com",
		},
		{
			ID:            3,
			Type:          "Train",
			Name:          "Express Train to " + destinationName,
			Description:   "High speed rail service, scenic route",
			EstimatedCost: 120.00,
			Currency:      "USD",
			BookingLink:   "https://www.raileurope.com",
		},
		{
			ID:            4,
			Type:          "Bus",
			Name:          "Coach Bus to " + destinationName,
			Description:   "Comfortable coach service, most affordable option",
			EstimatedCost: 45.00,
			Currency:      "USD",
			BookingLink:   "https://www.busbud.com",
		},
	}
}

// getSimulatedAccommodationOptions returns simulated accommodation options
func getSimulatedAccommodationOptions(destinationName string) []models.AccommodationOption {
	return []models.AccommodationOption{
		{
			ID:            1,
			Name:          "Luxury Hotel " + destinationName,
			Type:          "Hotel",
			Description:   "5-star hotel with pool, spa, and breakfast included",
			EstimatedCost: 350.00,
			Currency:      "USD",
			BookingLink:   "https://www.booking.com",
		},
		{
			ID:            2,
			Name:          "Boutique Hotel " + destinationName,
			Type:          "Hotel",
			Description:   "Charming 3-star boutique hotel in city center",
			EstimatedCost: 150.00,
			Currency:      "USD",
			BookingLink:   "https://www.hotels.com",
		},
		{
			ID:            3,
			Name:          "Airbnb Apartment " + destinationName,
			Type:          "Apartment",
			Description:   "Entire apartment, great for families or groups",
			EstimatedCost: 95.00,
			Currency:      "USD",
			BookingLink:   "https://www.airbnb.com",
		},
		{
			ID:            4,
			Name:          "Budget Hostel " + destinationName,
			Type:          "Hostel",
			Description:   "Clean and friendly hostel, shared or private rooms available",
			EstimatedCost: 30.00,
			Currency:      "USD",
			BookingLink:   "https://www.hostelworld.com",
		},
	}
}

// GetTravelOptions returns simulated travel options for a destination
func GetTravelOptions(c *gin.Context) {
	destID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid destination ID",
		})
		return
	}

	// Check destination exists and get name
	var destName string
	err = database.DB.QueryRow(
		"SELECT name FROM destinations WHERE id = ?", destID,
	).Scan(&destName)

	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Destination not found",
		})
		return
	}

	options := getSimulatedTravelOptions(destName)

	c.JSON(http.StatusOK, models.TravelResponse{
		DestinationID:   destID,
		DestinationName: destName,
		TotalOptions:    len(options),
		TravelOptions:   options,
	})
}

// GetAccommodationOptions returns simulated accommodation options for a destination
func GetAccommodationOptions(c *gin.Context) {
	destID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid destination ID",
		})
		return
	}

	// Check destination exists and get name
	var destName string
	err = database.DB.QueryRow(
		"SELECT name FROM destinations WHERE id = ?", destID,
	).Scan(&destName)

	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Destination not found",
		})
		return
	}

	options := getSimulatedAccommodationOptions(destName)

	c.JSON(http.StatusOK, models.AccommodationResponse{
		DestinationID:        destID,
		DestinationName:      destName,
		TotalOptions:         len(options),
		AccommodationOptions: options,
	})
}
