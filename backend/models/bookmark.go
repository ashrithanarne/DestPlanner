package models

type Bookmark struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	Destination string `json:"destination"`
}
