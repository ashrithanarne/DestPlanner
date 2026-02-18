package models

import "time"

// User represents a user in the system
type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // Don't expose password hash in JSON
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// RegisterRequest represents the registration request payload
type RegisterRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token     string `json:"token"`
	User      User   `json:"user"`
	ExpiresAt int64  `json:"expires_at"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}
