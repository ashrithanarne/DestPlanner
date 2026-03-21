package models

type Destination struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Country     string  `json:"country"`
	Budget      float64 `json:"budget"`
	Description string  `json:"description"`
}

type DestinationResponse struct {
	ID           int     `json:"id"`
	Name         string  `json:"name"`
	Country      string  `json:"country"`
	Budget       float64 `json:"budget"`
	Description  string  `json:"description"`
	IsBookmarked bool    `json:"is_bookmarked"`
}
