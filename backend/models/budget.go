package models

import "time"

// Budget represents a trip budget
type Budget struct {
	ID          int       `json:"id"`
	UserID      int       `json:"user_id"`
	TripName    string    `json:"trip_name"`
	TotalBudget float64   `json:"total_budget"`
	SpentAmount float64   `json:"spent_amount"`
	Currency    string    `json:"currency"`
	StartDate   time.Time `json:"start_date,omitempty"`
	EndDate     time.Time `json:"end_date,omitempty"`
	Notes       string    `json:"notes,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Expense represents an individual expense within a budget
type Expense struct {
	ID          int       `json:"id"`
	BudgetID    int       `json:"budget_id"`
	Category    string    `json:"category"`
	Amount      float64   `json:"amount"`
	Description string    `json:"description,omitempty"`
	ExpenseDate time.Time `json:"expense_date"`
	CreatedAt   time.Time `json:"created_at"`
}

// CreateBudgetRequest represents the request to create a budget
type CreateBudgetRequest struct {
	TripName    string  `json:"trip_name" binding:"required"`
	TotalBudget float64 `json:"total_budget" binding:"required,gt=0"`
	Currency    string  `json:"currency"`
	StartDate   string  `json:"start_date,omitempty"`
	EndDate     string  `json:"end_date,omitempty"`
	Notes       string  `json:"notes,omitempty"`
}

// UpdateBudgetRequest represents the request to update a budget
type UpdateBudgetRequest struct {
	TripName    string  `json:"trip_name,omitempty"`
	TotalBudget float64 `json:"total_budget,omitempty"`
	Currency    string  `json:"currency,omitempty"`
	StartDate   string  `json:"start_date,omitempty"`
	EndDate     string  `json:"end_date,omitempty"`
	Notes       string  `json:"notes,omitempty"`
}

// CreateExpenseRequest represents the request to add an expense
type CreateExpenseRequest struct {
	Category    string  `json:"category" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Description string  `json:"description,omitempty"`
	ExpenseDate string  `json:"expense_date,omitempty"`
}

// BudgetSummary represents a budget with calculated summary
type BudgetSummary struct {
	Budget
	RemainingBudget float64 `json:"remaining_budget"`
	PercentageUsed  float64 `json:"percentage_used"`
}