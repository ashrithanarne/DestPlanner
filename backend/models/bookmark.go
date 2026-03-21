package models

type Bookmark struct {
	ID            int `json:"id"`
	UserID        int `json:"user_id"`
	DestinationID int `json:"destination_id"`
}

type BookmarkResponse struct {
	ID          int    `json:"id"`
	Destination string `json:"destination"`
}
