package models

type AnalyticsSummary struct {
	TotalTrips          int     `json:"total_trips"`
	TotalSpent          float64 `json:"total_spent"`
	TotalBudgets        int     `json:"total_budgets"`
	AverageSpentPerTrip float64 `json:"average_spent_per_trip"`
}

type AnalyticsTrip struct {
	ID          int     `json:"id"`
	TripName    string  `json:"trip_name"`
	Destination string  `json:"destination"`
	StartDate   string  `json:"start_date,omitempty"`
	EndDate     string  `json:"end_date,omitempty"`
	Status      string  `json:"status"`
	TotalCost   float64 `json:"total_cost"`
}

type AnalyticsExpenseCategory struct {
	Category    string  `json:"category"`
	TotalAmount float64 `json:"total_amount"`
	Count       int     `json:"count"`
}

type AnalyticsSummaryResponse struct {
	UserID  int              `json:"user_id"`
	Summary AnalyticsSummary `json:"summary"`
}

type AnalyticsTripsResponse struct {
	UserID     int             `json:"user_id"`
	TotalTrips int             `json:"total_trips"`
	Trips      []AnalyticsTrip `json:"trips"`
}

type AnalyticsExpensesResponse struct {
	UserID     int                        `json:"user_id"`
	TotalSpent float64                    `json:"total_spent"`
	Categories []AnalyticsExpenseCategory `json:"categories"`
}
