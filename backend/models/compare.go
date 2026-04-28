package models

type DestinationComparison struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Country     string   `json:"country"`
	Budget      float64  `json:"budget"`
	Description string   `json:"description"`
	BestSeason  string   `json:"best_season"`
	TravelTime  string   `json:"travel_time"`
	Activities  []string `json:"activities"`
}

type CompareResponse struct {
	TotalDestinations int                     `json:"total_destinations"`
	Destinations      []DestinationComparison `json:"destinations"`
}
