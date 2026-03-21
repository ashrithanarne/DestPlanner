package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

// ── helpers ──────────────────────────────────────────────────────────────────

// isGroupMember checks whether a user belongs to a group
func isGroupMember(groupID, userID int) (bool, error) {
	var id int
	err := database.DB.QueryRow(
		"SELECT id FROM group_members WHERE group_id = ? AND user_id = ?",
		groupID, userID,
	).Scan(&id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	return err == nil, err
}

// groupMemberIDs returns all user_ids that belong to a group
func groupMemberIDs(groupID int) ([]int, error) {
	rows, err := database.DB.Query(
		"SELECT user_id FROM group_members WHERE group_id = ?", groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// ── CreateGroup ───────────────────────────────────────────────────────────────

// CreateGroup creates a new group and adds the creator as the first member
func CreateGroup(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	var req models.CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	// Optionally verify trip belongs to user
	if req.TripID != 0 {
		var tripID int
		err := database.DB.QueryRow(
			"SELECT id FROM trips WHERE id = ? AND user_id = ?", req.TripID, claims.UserID,
		).Scan(&tripID)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Trip not found"})
			return
		}
	}

	// Insert group
	var tripIDArg interface{}
	if req.TripID != 0 {
		tripIDArg = req.TripID
	}

	result, err := database.DB.Exec(
		"INSERT INTO groups (group_name, created_by, trip_id) VALUES (?, ?, ?)",
		req.GroupName, claims.UserID, tripIDArg,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to create group"})
		return
	}

	groupID, _ := result.LastInsertId()

	// Auto-add creator as a member
	_, err = database.DB.Exec(
		"INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
		groupID, claims.UserID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to add creator as member"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Group created successfully",
		"group_id": groupID,
	})
}

// ── GetGroups ─────────────────────────────────────────────────────────────────

// GetGroups returns all groups the authenticated user belongs to
func GetGroups(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	query := `
		SELECT g.id, g.group_name, g.created_by, g.trip_id, g.created_at, g.updated_at
		FROM groups g
		JOIN group_members gm ON g.id = gm.group_id
		WHERE gm.user_id = ?
		ORDER BY g.created_at DESC
	`
	rows, err := database.DB.Query(query, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve groups"})
		return
	}
	defer rows.Close()

	groups := []models.GroupWithMembers{}
	for rows.Next() {
		var g models.Group
		var tripID sql.NullInt64
		if err := rows.Scan(&g.ID, &g.GroupName, &g.CreatedBy, &tripID, &g.CreatedAt, &g.UpdatedAt); err != nil {
			continue
		}
		if tripID.Valid {
			id := int(tripID.Int64)
			g.TripID = &id
		}

		// Fetch members for this group
		members, err := fetchGroupMembers(g.ID)
		if err != nil {
			members = []models.GroupMemberDetail{}
		}
		groups = append(groups, models.GroupWithMembers{Group: g, Members: members})
	}

	c.JSON(http.StatusOK, gin.H{"groups": groups})
}

// fetchGroupMembers is a shared helper used by GetGroups and GetGroupByID
func fetchGroupMembers(groupID int) ([]models.GroupMemberDetail, error) {
	rows, err := database.DB.Query(`
		SELECT u.id, u.first_name, u.last_name, u.email
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		WHERE gm.group_id = ?
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.GroupMemberDetail
	for rows.Next() {
		var m models.GroupMemberDetail
		if err := rows.Scan(&m.UserID, &m.FirstName, &m.LastName, &m.Email); err != nil {
			continue
		}
		members = append(members, m)
	}
	return members, nil
}

// ── AddMember ─────────────────────────────────────────────────────────────────

// AddMember adds a user to an existing group (only group creator can do this)
func AddMember(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	groupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid group ID"})
		return
	}

	// Only the creator can add members
	var createdBy int
	err = database.DB.QueryRow("SELECT created_by FROM groups WHERE id = ?", groupID).Scan(&createdBy)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Group not found"})
		return
	}
	if createdBy != claims.UserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "Only the group creator can add members"})
		return
	}

	var req models.AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	// Verify the user to be added exists
	var userExists int
	err = database.DB.QueryRow("SELECT id FROM users WHERE id = ?", req.UserID).Scan(&userExists)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "User not found"})
		return
	}

	_, err = database.DB.Exec(
		"INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
		groupID, req.UserID,
	)
	if err != nil {
		// UNIQUE constraint violation means already a member
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "already_exists", Message: "User is already a member of this group"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Member added successfully"})
}

// ── RemoveMember ──────────────────────────────────────────────────────────────

// RemoveMember removes a user from a group (creator only; creator cannot remove themselves)
func RemoveMember(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	groupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid group ID"})
		return
	}

	targetUserID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid user ID"})
		return
	}

	// Only the creator can remove members
	var createdBy int
	err = database.DB.QueryRow("SELECT created_by FROM groups WHERE id = ?", groupID).Scan(&createdBy)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Group not found"})
		return
	}
	if createdBy != claims.UserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "Only the group creator can remove members"})
		return
	}
	if targetUserID == claims.UserID {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Creator cannot remove themselves from the group"})
		return
	}

	result, err := database.DB.Exec(
		"DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
		groupID, targetUserID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to remove member"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Member not found in group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
}

// ── AddGroupExpense ───────────────────────────────────────────────────────────

// AddGroupExpense adds an expense paid by one member and splits it among the group
func AddGroupExpense(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	groupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid group ID"})
		return
	}

	// Verify caller is a group member
	member, err := isGroupMember(groupID, claims.UserID)
	if err != nil || !member {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "You are not a member of this group"})
		return
	}

	var req models.CreateGroupExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid request payload"})
		return
	}

	// Parse optional expense date
	expenseDate := time.Now()
	if req.ExpenseDate != "" {
		parsed, err := time.Parse("2006-01-02", req.ExpenseDate)
		if err == nil {
			expenseDate = parsed
		}
	}

	// Insert the expense
	result, err := database.DB.Exec(`
		INSERT INTO group_expenses (group_id, paid_by, amount, category, description, expense_date)
		VALUES (?, ?, ?, ?, ?, ?)`,
		groupID, claims.UserID, req.Amount, req.Category, req.Description, expenseDate,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to add expense"})
		return
	}
	expenseID, _ := result.LastInsertId()

	// Determine splits
	if len(req.Splits) > 0 {
		// Validate every user in splits is actually a group member
		for _, s := range req.Splits {
			isMember, err := isGroupMember(groupID, s.UserID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to verify group membership"})
				return
			}
			if !isMember {
				c.JSON(http.StatusBadRequest, models.ErrorResponse{
					Error:   "validation_error",
					Message: fmt.Sprintf("User %d is not a member of this group", s.UserID),
				})
				return
			}
		}

		// Validate that provided splits sum to the total amount
		var total float64
		for _, s := range req.Splits {
			total += s.AmountOwed
		}
		if fmt.Sprintf("%.2f", total) != fmt.Sprintf("%.2f", req.Amount) {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "validation_error",
				Message: fmt.Sprintf("Split amounts (%.2f) must equal total expense amount (%.2f)", total, req.Amount),
			})
			return
		}
		for _, s := range req.Splits {
			database.DB.Exec(
				"INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES (?, ?, ?)",
				expenseID, s.UserID, s.AmountOwed,
			)
		}
	} else {
		// Equal split among all members
		memberIDs, err := groupMemberIDs(groupID)
		if err != nil || len(memberIDs) == 0 {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve group members"})
			return
		}
		splitAmount := req.Amount / float64(len(memberIDs))
		for _, uid := range memberIDs {
			database.DB.Exec(
				"INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES (?, ?, ?)",
				expenseID, uid, splitAmount,
			)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Expense added successfully",
		"expense_id": expenseID,
	})
}

// ── GetGroupExpenses ──────────────────────────────────────────────────────────

// GetGroupExpenses returns all expenses for a group with their splits
func GetGroupExpenses(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	groupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid group ID"})
		return
	}

	member, err := isGroupMember(groupID, claims.UserID)
	if err != nil || !member {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "You are not a member of this group"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT ge.id, ge.group_id, ge.paid_by, ge.amount, ge.category, ge.description,
		       ge.expense_date, ge.created_at,
		       u.first_name || ' ' || u.last_name AS paid_by_name
		FROM group_expenses ge
		JOIN users u ON ge.paid_by = u.id
		WHERE ge.group_id = ?
		ORDER BY ge.expense_date DESC
	`, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to retrieve expenses"})
		return
	}
	defer rows.Close()

	var expenses []models.GroupExpenseWithSplits
	for rows.Next() {
		var e models.GroupExpenseWithSplits
		var desc sql.NullString
		if err := rows.Scan(
			&e.ID, &e.GroupID, &e.PaidBy, &e.Amount, &e.Category,
			&desc, &e.ExpenseDate, &e.CreatedAt, &e.PaidByName,
		); err != nil {
			continue
		}
		if desc.Valid {
			e.Description = desc.String
		}

		// Fetch splits for this expense
		splits, _ := fetchExpenseSplits(e.ID)
		e.Splits = splits
		expenses = append(expenses, e)
	}

	c.JSON(http.StatusOK, gin.H{"expenses": expenses})
}

// fetchExpenseSplits retrieves all splits for a given expense
func fetchExpenseSplits(expenseID int) ([]models.SplitDetail, error) {
	rows, err := database.DB.Query(`
		SELECT u.id, u.first_name, u.last_name, es.amount_owed, es.is_settled
		FROM expense_splits es
		JOIN users u ON es.user_id = u.id
		WHERE es.expense_id = ?
	`, expenseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var splits []models.SplitDetail
	for rows.Next() {
		var s models.SplitDetail
		if err := rows.Scan(&s.UserID, &s.FirstName, &s.LastName, &s.AmountOwed, &s.IsSettled); err != nil {
			continue
		}
		splits = append(splits, s)
	}
	return splits, nil
}

// ── GetGroupBalances ──────────────────────────────────────────────────────────

// GetGroupBalances calculates net balances — who owes whom and how much
func GetGroupBalances(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	groupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid group ID"})
		return
	}

	member, err := isGroupMember(groupID, claims.UserID)
	if err != nil || !member {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "You are not a member of this group"})
		return
	}

	// net[userID] = total paid - total owed (unsettled only)
	// positive = others owe this user; negative = this user owes others
	net := map[int]float64{}
	names := map[int]string{}

	// Sum up what each member paid
	paidRows, err := database.DB.Query(`
		SELECT ge.paid_by, u.first_name || ' ' || u.last_name, SUM(ge.amount)
		FROM group_expenses ge
		JOIN users u ON ge.paid_by = u.id
		WHERE ge.group_id = ?
		GROUP BY ge.paid_by
	`, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to calculate balances"})
		return
	}
	defer paidRows.Close()
	for paidRows.Next() {
		var uid int
		var name string
		var total float64
		if err := paidRows.Scan(&uid, &name, &total); err != nil {
			continue
		}
		net[uid] += total
		names[uid] = name
	}

	// Subtract what each member owes (unsettled splits only)
	owedRows, err := database.DB.Query(`
		SELECT es.user_id, u.first_name || ' ' || u.last_name, SUM(es.amount_owed)
		FROM expense_splits es
		JOIN group_expenses ge ON es.expense_id = ge.id
		JOIN users u ON es.user_id = u.id
		WHERE ge.group_id = ? AND es.is_settled = 0
		GROUP BY es.user_id
	`, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to calculate balances"})
		return
	}
	defer owedRows.Close()
	for owedRows.Next() {
		var uid int
		var name string
		var total float64
		if err := owedRows.Scan(&uid, &name, &total); err != nil {
			continue
		}
		net[uid] -= total
		names[uid] = name
	}

	// Convert net map into simplified debt list using a greedy algorithm
	// debtors owe money (net < 0), creditors are owed money (net > 0)
	type person struct {
		id     int
		amount float64
	}
	var debtors, creditors []person
	for uid, balance := range net {
		if balance < -0.01 {
			debtors = append(debtors, person{uid, -balance})
		} else if balance > 0.01 {
			creditors = append(creditors, person{uid, balance})
		}
	}

	var balances []models.Balance
	i, j := 0, 0
	for i < len(debtors) && j < len(creditors) {
		d := &debtors[i]
		cr := &creditors[j]
		amount := d.amount
		if cr.amount < amount {
			amount = cr.amount
		}
		balances = append(balances, models.Balance{
			FromUserID: d.id,
			FromName:   names[d.id],
			ToUserID:   cr.id,
			ToName:     names[cr.id],
			Amount:     amount,
		})
		d.amount -= amount
		cr.amount -= amount
		if d.amount < 0.01 {
			i++
		}
		if cr.amount < 0.01 {
			j++
		}
	}

	c.JSON(http.StatusOK, gin.H{"balances": balances})
}

// ── SettleExpense ─────────────────────────────────────────────────────────────

// SettleExpense marks a specific user's split on an expense as settled
func SettleExpense(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User not authenticated"})
		return
	}
	claims := userInterface.(*utils.Claims)

	groupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid group ID"})
		return
	}

	expenseID, err := strconv.Atoi(c.Param("expenseId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Invalid expense ID"})
		return
	}

	member, err := isGroupMember(groupID, claims.UserID)
	if err != nil || !member {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: "You are not a member of this group"})
		return
	}

	// Verify the expense belongs to this group
	var gid int
	err = database.DB.QueryRow("SELECT group_id FROM group_expenses WHERE id = ?", expenseID).Scan(&gid)
	if err == sql.ErrNoRows || gid != groupID {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Expense not found in this group"})
		return
	}

	// Settle the calling user's split
	result, err := database.DB.Exec(`
		UPDATE expense_splits
		SET is_settled = 1, settled_at = CURRENT_TIMESTAMP
		WHERE expense_id = ? AND user_id = ? AND is_settled = 0
	`, expenseID, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "server_error", Message: "Failed to settle expense"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "bad_request", Message: "Split already settled or not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expense settled successfully"})
}
