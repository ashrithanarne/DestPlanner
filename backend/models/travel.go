package models

type TravelOption struct {
	ID          int     `json:"id"`
	Type        string  `json:"type"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	EstimatedCost float64 `json:"estimated_cost"`
	Currency    string  `json:"currency"`
	BookingLink string  `json:"booking_link"`
}

type AccommodationOption struct {
	ID            int     `json:"id"`
	Name          string  `json:"name"`
	Type          string  `json:"type"`
	Description   string  `json:"description"`
	EstimatedCost float64 `json:"estimated_cost"`
	Currency      string  `json:"currency"`
	BookingLink   string  `json:"booking_link"`
}

type TravelResponse struct {
	DestinationID   int            `json:"destination_id"`
	DestinationName string         `json:"destination_name"`
	TotalOptions    int            `json:"total_options"`
	TravelOptions   []TravelOption `json:"travel_options"`
}

type AccommodationResponse struct {
	DestinationID        int                   `json:"destination_id"`
	DestinationName      string                `json:"destination_name"`
	TotalOptions         int                   `json:"total_options"`
	AccommodationOptions []AccommodationOption `json:"accommodation_options"`
}