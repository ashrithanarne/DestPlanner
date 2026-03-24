package models

import "time"

// Group represents a group of users sharing trip expenses
type Group struct {
	ID        int       `json:"id"`
	TripID    *int      `json:"trip_id,omitempty"`
	CreatedBy int       `json:"created_by"`
	GroupName string    `json:"group_name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GroupMember represents a member of a group
type GroupMember struct {
	ID       int       `json:"id"`
	GroupID  int       `json:"group_id"`
	UserID   int       `json:"user_id"`
	JoinedAt time.Time `json:"joined_at"`
}

// GroupMemberDetail includes user info alongside membership
type GroupMemberDetail struct {
	UserID    int    `json:"user_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
}

// GroupExpense represents an expense paid by one member of the group
type GroupExpense struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	PaidBy      int       `json:"paid_by"`
	Amount      float64   `json:"amount"`
	Category    string    `json:"category"`
	Description string    `json:"description,omitempty"`
	ExpenseDate time.Time `json:"expense_date"`
	CreatedAt   time.Time `json:"created_at"`
}

// ExpenseSplit represents how much one member owes for a group expense
type ExpenseSplit struct {
	ID         int        `json:"id"`
	ExpenseID  int        `json:"expense_id"`
	UserID     int        `json:"user_id"`
	AmountOwed float64    `json:"amount_owed"`
	IsSettled  bool       `json:"is_settled"`
	SettledAt  *time.Time `json:"settled_at,omitempty"`
}

// GroupExpenseWithSplits includes the expense and all its splits
type GroupExpenseWithSplits struct {
	GroupExpense
	PaidByName string        `json:"paid_by_name"`
	Splits     []SplitDetail `json:"splits"`
}

// SplitDetail includes user info with their split amount
type SplitDetail struct {
	UserID     int     `json:"user_id"`
	FirstName  string  `json:"first_name"`
	LastName   string  `json:"last_name"`
	AmountOwed float64 `json:"amount_owed"`
	IsSettled  bool    `json:"is_settled"`
}

// Balance represents the net amount one user owes another
type Balance struct {
	FromUserID int     `json:"from_user_id"`
	FromName   string  `json:"from_name"`
	ToUserID   int     `json:"to_user_id"`
	ToName     string  `json:"to_name"`
	Amount     float64 `json:"amount"`
}

// GroupWithMembers includes the group and its members
type GroupWithMembers struct {
	Group
	Members []GroupMemberDetail `json:"members"`
}

// --- Request structs ---

// CreateGroupRequest is the payload to create a new group
type CreateGroupRequest struct {
	GroupName string `json:"group_name" binding:"required"`
	TripID    int    `json:"trip_id,omitempty"`
}

// AddMemberRequest is the payload to add a member to a group
type AddMemberRequest struct {
	UserID int `json:"user_id" binding:"required"`
}

// CreateGroupExpenseRequest is the payload to add a group expense
type CreateGroupExpenseRequest struct {
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Category    string  `json:"category" binding:"required"`
	Description string  `json:"description,omitempty"`
	ExpenseDate string  `json:"expense_date,omitempty"`
	// Optional explicit split amounts per user_id.
	// If omitted, the expense is split equally among all members.
	Splits []SplitInput `json:"splits,omitempty"`
}

// SplitInput lets the caller specify a custom split amount per user
type SplitInput struct {
	UserID     int     `json:"user_id" binding:"required"`
	AmountOwed float64 `json:"amount_owed" binding:"required,gt=0"`
}
