package models

type DestinationComparison struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Country     string  `json:"country"`
	Budget      float64 `json:"budget"`
	Description string  `json:"description"`
}

type CompareResponse struct {
	TotalDestinations int                     `json:"total_destinations"`
	Destinations      []DestinationComparison `json:"destinations"`
}
