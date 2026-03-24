package models

type Itinerary struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Owner int    `json:"owner"`
}

type ItineraryDestination struct {
	ID          int `json:"id"`
	ItineraryID int `json:"itinerary_id"`
	Destination int `json:"destination_id"`
}

type ItineraryCollaborator struct {
	ID          int `json:"id"`
	ItineraryID int `json:"itinerary_id"`
	UserID      int `json:"user_id"`
}

type ItineraryResponse struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Owner         int    `json:"owner"`
	Destinations  []int  `json:"destinations,omitempty"`
	Collaborators []int  `json:"collaborators,omitempty"`
}
