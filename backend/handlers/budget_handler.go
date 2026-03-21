package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

// CreateBudget creates a new budget for the authenticated user
func CreateBudget(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Parse request body
	var req models.CreateBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Set default currency if not provided
	if req.Currency == "" {
		req.Currency = "USD"
	}

	// Verify trip exists if trip_id is provided
	var tripID interface{}
	tripID = nil
	if req.TripID > 0 {
		var existingTripID int
		checkTripQuery := "SELECT id FROM trips WHERE id = ? AND user_id = ?"
		err := database.DB.QueryRow(checkTripQuery, req.TripID, claims.UserID).Scan(&existingTripID)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Trip not found",
			})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "server_error",
				Message: "Failed to verify trip",
			})
			return
		}
		tripID = req.TripID
	}

	// Parse dates if provided
	var startDate, endDate interface{}
	startDate, endDate = nil, nil

	if req.StartDate != "" {
		parsedStart, err := time.Parse("2006-01-02", req.StartDate)
		if err == nil {
			startDate = parsedStart
		}
	}

	if req.EndDate != "" {
		parsedEnd, err := time.Parse("2006-01-02", req.EndDate)
		if err == nil {
			endDate = parsedEnd
		}
	}

	// Insert budget into database
	query := `
		INSERT INTO budgets (user_id, trip_id, trip_name, total_budget, currency, start_date, end_date, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	result, err := database.DB.Exec(query,
		claims.UserID,
		tripID,
		req.TripName,
		req.TotalBudget,
		req.Currency,
		startDate,
		endDate,
		req.Notes,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to create budget",
		})
		return
	}

	budgetID, _ := result.LastInsertId()

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Budget created successfully",
		"budget_id": budgetID,
	})
}

// GetBudgets retrieves all budgets for the authenticated user
func GetBudgets(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Query budgets
	query := `
		SELECT id, user_id, trip_id, trip_name, total_budget, spent_amount, currency, 
		       start_date, end_date, notes, created_at, updated_at
		FROM budgets
		WHERE user_id = ?
		ORDER BY created_at DESC
	`

	rows, err := database.DB.Query(query, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to retrieve budgets",
		})
		return
	}
	defer rows.Close()

	budgets := []models.BudgetSummary{}

	for rows.Next() {
		var budget models.Budget
		var startDate, endDate sql.NullTime
		var tripID sql.NullInt64

		err := rows.Scan(
			&budget.ID,
			&budget.UserID,
			&tripID,
			&budget.TripName,
			&budget.TotalBudget,
			&budget.SpentAmount,
			&budget.Currency,
			&startDate,
			&endDate,
			&budget.Notes,
			&budget.CreatedAt,
			&budget.UpdatedAt,
		)

		if err != nil {
			continue
		}

		if tripID.Valid {
			tripIDInt := int(tripID.Int64)
			budget.TripID = &tripIDInt
		}

		if startDate.Valid {
			budget.StartDate = startDate.Time
		}
		if endDate.Valid {
			budget.EndDate = endDate.Time
		}

		// Calculate summary
		remaining := budget.TotalBudget - budget.SpentAmount
		percentageUsed := (budget.SpentAmount / budget.TotalBudget) * 100

		summary := models.BudgetSummary{
			Budget:          budget,
			RemainingBudget: remaining,
			PercentageUsed:  percentageUsed,
		}

		budgets = append(budgets, summary)
	}

	c.JSON(http.StatusOK, gin.H{
		"budgets": budgets,
	})
}

// GetBudgetByID retrieves a specific budget by ID
func GetBudgetByID(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get budget ID from URL
	budgetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid budget ID",
		})
		return
	}

	// Query budget
	query := `
		SELECT id, user_id, trip_id, trip_name, total_budget, spent_amount, currency, 
		       start_date, end_date, notes, created_at, updated_at
		FROM budgets
		WHERE id = ? AND user_id = ?
	`

	var budget models.Budget
	var startDate, endDate sql.NullTime
	var tripID sql.NullInt64

	err = database.DB.QueryRow(query, budgetID, claims.UserID).Scan(
		&budget.ID,
		&budget.UserID,
		&tripID,
		&budget.TripName,
		&budget.TotalBudget,
		&budget.SpentAmount,
		&budget.Currency,
		&startDate,
		&endDate,
		&budget.Notes,
		&budget.CreatedAt,
		&budget.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Budget not found",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to retrieve budget",
		})
		return
	}

	if tripID.Valid {
		tripIDInt := int(tripID.Int64)
		budget.TripID = &tripIDInt
	}

	if startDate.Valid {
		budget.StartDate = startDate.Time
	}
	if endDate.Valid {
		budget.EndDate = endDate.Time
	}

	// Calculate summary
	remaining := budget.TotalBudget - budget.SpentAmount
	percentageUsed := (budget.SpentAmount / budget.TotalBudget) * 100

	summary := models.BudgetSummary{
		Budget:          budget,
		RemainingBudget: remaining,
		PercentageUsed:  percentageUsed,
	}

	c.JSON(http.StatusOK, summary)
}

// UpdateBudget updates an existing budget
func UpdateBudget(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get budget ID
	budgetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid budget ID",
		})
		return
	}

	// Parse request body
	var req models.UpdateBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Build dynamic update query
	query := "UPDATE budgets SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}

	if req.TripName != "" {
		query += ", trip_name = ?"
		args = append(args, req.TripName)
	}
	if req.TotalBudget > 0 {
		query += ", total_budget = ?"
		args = append(args, req.TotalBudget)
	}
	if req.Currency != "" {
		query += ", currency = ?"
		args = append(args, req.Currency)
	}
	if req.StartDate != "" {
		parsedStart, err := time.Parse("2006-01-02", req.StartDate)
		if err == nil {
			query += ", start_date = ?"
			args = append(args, parsedStart)
		}
	}
	if req.EndDate != "" {
		parsedEnd, err := time.Parse("2006-01-02", req.EndDate)
		if err == nil {
			query += ", end_date = ?"
			args = append(args, parsedEnd)
		}
	}
	if req.Notes != "" {
		query += ", notes = ?"
		args = append(args, req.Notes)
	}

	query += " WHERE id = ? AND user_id = ?"
	args = append(args, budgetID, claims.UserID)

	result, err := database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to update budget",
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Budget not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Budget updated successfully",
	})
}

// DeleteBudget deletes a budget
func DeleteBudget(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get budget ID
	budgetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid budget ID",
		})
		return
	}

	// Delete budget
	query := "DELETE FROM budgets WHERE id = ? AND user_id = ?"
	result, err := database.DB.Exec(query, budgetID, claims.UserID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to delete budget",
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Budget not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Budget deleted successfully",
	})
}

// AddExpense adds an expense to a budget
func AddExpense(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get budget ID
	budgetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid budget ID",
		})
		return
	}

	// Verify budget belongs to user
	var userID int
	checkQuery := "SELECT user_id FROM budgets WHERE id = ?"
	err = database.DB.QueryRow(checkQuery, budgetID).Scan(&userID)
	if err == sql.ErrNoRows || userID != claims.UserID {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Budget not found",
		})
		return
	}

	// Parse request body
	var req models.CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Parse expense date
	var expenseDate interface{}
	expenseDate = time.Now()
	if req.ExpenseDate != "" {
		parsedDate, err := time.Parse("2006-01-02", req.ExpenseDate)
		if err == nil {
			expenseDate = parsedDate
		}
	}

	// Insert expense
	insertExpenseQuery := `
		INSERT INTO expenses (budget_id, category, amount, description, expense_date)
		VALUES (?, ?, ?, ?, ?)
	`

	result, err := database.DB.Exec(insertExpenseQuery,
		budgetID,
		req.Category,
		req.Amount,
		req.Description,
		expenseDate,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to add expense",
		})
		return
	}

	// Update budget spent_amount
	updateBudgetQuery := `
		UPDATE budgets 
		SET spent_amount = spent_amount + ?, updated_at = CURRENT_TIMESTAMP 
		WHERE id = ?
	`

	_, err = database.DB.Exec(updateBudgetQuery, req.Amount, budgetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to update budget spent amount",
		})
		return
	}

	expenseID, _ := result.LastInsertId()

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Expense added successfully",
		"expense_id": expenseID,
	})
}

// GetExpenses retrieves all expenses for a budget
func GetExpenses(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get budget ID
	budgetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid budget ID",
		})
		return
	}

	// Verify budget belongs to user
	var userID int
	checkQuery := "SELECT user_id FROM budgets WHERE id = ?"
	err = database.DB.QueryRow(checkQuery, budgetID).Scan(&userID)
	if err == sql.ErrNoRows || userID != claims.UserID {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Budget not found",
		})
		return
	}

	// Query expenses
	query := `
		SELECT id, budget_id, category, amount, description, expense_date, created_at
		FROM expenses
		WHERE budget_id = ?
		ORDER BY expense_date DESC
	`

	rows, err := database.DB.Query(query, budgetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to retrieve expenses",
		})
		return
	}
	defer rows.Close()

	expenses := []models.Expense{}

	for rows.Next() {
		var expense models.Expense

		err := rows.Scan(
			&expense.ID,
			&expense.BudgetID,
			&expense.Category,
			&expense.Amount,
			&expense.Description,
			&expense.ExpenseDate,
			&expense.CreatedAt,
		)

		if err != nil {
			continue
		}

		expenses = append(expenses, expense)
	}

	c.JSON(http.StatusOK, gin.H{
		"expenses": expenses,
	})
}

// UpdateExpense updates an existing expense
func UpdateExpense(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get budget ID and expense ID
	budgetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid budget ID",
		})
		return
	}

	expenseID, err := strconv.Atoi(c.Param("expenseId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid expense ID",
		})
		return
	}

	// Verify budget belongs to user and get old expense amount
	var userID int
	var oldAmount float64
	checkQuery := `
		SELECT b.user_id, e.amount 
		FROM budgets b 
		JOIN expenses e ON e.budget_id = b.id 
		WHERE b.id = ? AND e.id = ?
	`
	err = database.DB.QueryRow(checkQuery, budgetID, expenseID).Scan(&userID, &oldAmount)
	if err == sql.ErrNoRows || userID != claims.UserID {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Expense not found",
		})
		return
	}

	// Parse request body
	var req models.CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid request payload",
		})
		return
	}

	// Parse expense date
	var expenseDate interface{}
	if req.ExpenseDate != "" {
		parsedDate, err := time.Parse("2006-01-02", req.ExpenseDate)
		if err == nil {
			expenseDate = parsedDate
		}
	}

	// Update expense
	updateExpenseQuery := `
		UPDATE expenses 
		SET category = ?, amount = ?, description = ?, expense_date = COALESCE(?, expense_date)
		WHERE id = ? AND budget_id = ?
	`

	_, err = database.DB.Exec(updateExpenseQuery,
		req.Category,
		req.Amount,
		req.Description,
		expenseDate,
		expenseID,
		budgetID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to update expense",
		})
		return
	}

	// Update budget spent_amount (subtract old amount, add new amount)
	amountDifference := req.Amount - oldAmount
	updateBudgetQuery := `
		UPDATE budgets 
		SET spent_amount = spent_amount + ?, updated_at = CURRENT_TIMESTAMP 
		WHERE id = ?
	`

	_, err = database.DB.Exec(updateBudgetQuery, amountDifference, budgetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to update budget spent amount",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Expense updated successfully",
	})
}

// DeleteExpense deletes an expense
func DeleteExpense(c *gin.Context) {
	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	claims, ok := userInterface.(*utils.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid user claims",
		})
		return
	}

	// Get budget ID and expense ID
	budgetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid budget ID",
		})
		return
	}

	expenseID, err := strconv.Atoi(c.Param("expenseId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "bad_request",
			Message: "Invalid expense ID",
		})
		return
	}

	// Verify budget belongs to user and get expense amount
	var userID int
	var expenseAmount float64
	checkQuery := `
		SELECT b.user_id, e.amount 
		FROM budgets b 
		JOIN expenses e ON e.budget_id = b.id 
		WHERE b.id = ? AND e.id = ?
	`
	err = database.DB.QueryRow(checkQuery, budgetID, expenseID).Scan(&userID, &expenseAmount)
	if err == sql.ErrNoRows || userID != claims.UserID {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Expense not found",
		})
		return
	}

	// Delete expense
	deleteQuery := "DELETE FROM expenses WHERE id = ? AND budget_id = ?"
	_, err = database.DB.Exec(deleteQuery, expenseID, budgetID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to delete expense",
		})
		return
	}

	// Update budget spent_amount (subtract deleted expense amount)
	updateBudgetQuery := `
		UPDATE budgets 
		SET spent_amount = spent_amount - ?, updated_at = CURRENT_TIMESTAMP 
		WHERE id = ?
	`

	_, err = database.DB.Exec(updateBudgetQuery, expenseAmount, budgetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "server_error",
			Message: "Failed to update budget spent amount",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Expense deleted successfully",
	})
}