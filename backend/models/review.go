package models

import "time"

type Review struct {
	ID            int       `json:"id"`
	DestinationID int       `json:"destination_id"`
	UserID        int       `json:"user_id"`
	Rating        int       `json:"rating"`
	Comment       string    `json:"comment"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ReviewResponse struct {
	ID            int       `json:"id"`
	DestinationID int       `json:"destination_id"`
	UserID        int       `json:"user_id"`
	ReviewerName  string    `json:"reviewer_name"`
	Rating        int       `json:"rating"`
	Comment       string    `json:"comment"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateReviewRequest struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

type UpdateReviewRequest struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

type ReviewsListResponse struct {
	DestinationID int              `json:"destination_id"`
	AverageRating float64          `json:"average_rating"`
	TotalReviews  int              `json:"total_reviews"`
	Reviews       []ReviewResponse `json:"reviews"`
}
