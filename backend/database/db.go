package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

// InitDB initializes the SQLite database connection and creates tables
func InitDB(dataSourceName string) error {
	// Close existing connection if any
	if DB != nil {
		DB.Close()
	}

	var err error
	DB, err = sql.Open("sqlite", dataSourceName)
	if err != nil {
		return err
	}

	// Test the connection
	if err = DB.Ping(); err != nil {
		return err
	}

	// Create users table if it doesn't exist
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err = DB.Exec(createTableQuery)
	if err != nil {
		return err
	}

	// Create destinations table if it doesn't exist
	createDestinationsTable := `
	CREATE TABLE IF NOT EXISTS destinations (
	    id INTEGER PRIMARY KEY AUTOINCREMENT,
	    name TEXT NOT NULL,
	    country TEXT NOT NULL,
	    budget REAL NOT NULL,
	    description TEXT,
	    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err = DB.Exec(createDestinationsTable)
	if err != nil {
		return err
	}

	// Create bookmarks table
	createBookmarksTable := `
	CREATE TABLE IF NOT EXISTS bookmarks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		destination_id INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id),
		FOREIGN KEY(destination_id) REFERENCES destinations(id)
	);
`

	_, err = DB.Exec(createBookmarksTable)
	if err != nil {
		return err
	}

	// Create itineraries table
	createItinerariesTable := `
   CREATE TABLE IF NOT EXISTS itineraries (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       created_by INTEGER NOT NULL,
       FOREIGN KEY (created_by) REFERENCES users(id)
    );
    `
	_, err = DB.Exec(createItinerariesTable)
	if err != nil {
		return err
	}

	// Create itinerary_destinations table (many-to-many)
	createItineraryDestinationsTable := `
   CREATE TABLE IF NOT EXISTS itinerary_destinations (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       itinerary_id INTEGER NOT NULL,
       destination_id INTEGER NOT NULL,
       FOREIGN KEY (itinerary_id) REFERENCES itineraries(id),
       FOREIGN KEY (destination_id) REFERENCES destinations(id)
   );
   `
	_, err = DB.Exec(createItineraryDestinationsTable)
	if err != nil {
		return err
	}

	// Create itinerary_collaborators table (many-to-many users <-> itineraries)
	createItineraryCollaboratorsTable := `
   CREATE TABLE IF NOT EXISTS itinerary_collaborators (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       itinerary_id INTEGER NOT NULL,
       user_id INTEGER NOT NULL,
       FOREIGN KEY (itinerary_id) REFERENCES itineraries(id),
       FOREIGN KEY (user_id) REFERENCES users(id)
    );
    `
	_, err = DB.Exec(createItineraryCollaboratorsTable)
	if err != nil {
		return err
	}

	// Create reviews table
	createReviewsTable := `
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(destination_id) REFERENCES destinations(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);
`
	_, err = DB.Exec(createReviewsTable)
	if err != nil {
		return err
	}

	// Create activities table
	createActivitiesTable := `
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(destination_id) REFERENCES destinations(id)
);
`
	_, err = DB.Exec(createActivitiesTable)
	if err != nil {
		return err
	}

	// Create token blacklist table
	createBlacklistTable := `
	CREATE TABLE IF NOT EXISTS token_blacklist (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT UNIQUE NOT NULL,
		user_id INTEGER NOT NULL,
		blacklisted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		expires_at DATETIME NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`

	_, err = DB.Exec(createBlacklistTable)
	if err != nil {
		return err
	}

	// Create trips table (MUST be before budgets and packing_lists that reference it)
	createTripsTable := `
	CREATE TABLE IF NOT EXISTS trips (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		trip_name TEXT NOT NULL,
		destination TEXT,
		start_date DATETIME,
		end_date DATETIME,
		notes TEXT,
		status TEXT DEFAULT 'planning',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`

	_, err = DB.Exec(createTripsTable)
	if err != nil {
		return err
	}

	// Create budgets table
	createBudgetsTable := `
	CREATE TABLE IF NOT EXISTS budgets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		trip_id INTEGER,
		trip_name TEXT NOT NULL,
		total_budget REAL NOT NULL,
		spent_amount REAL DEFAULT 0,
		currency TEXT DEFAULT 'USD',
		start_date DATETIME,
		end_date DATETIME,
		notes TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id),
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE SET NULL
	);
	`

	_, err = DB.Exec(createBudgetsTable)
	if err != nil {
		return err
	}

	// Create budget expenses table (for tracking individual expenses)
	createExpensesTable := `
	CREATE TABLE IF NOT EXISTS expenses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		budget_id INTEGER NOT NULL,
		category TEXT NOT NULL,
		amount REAL NOT NULL,
		description TEXT,
		expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(budget_id) REFERENCES budgets(id) ON DELETE CASCADE
	);
	`

	_, err = DB.Exec(createExpensesTable)
	if err != nil {
		return err
	}

	// Create packing lists table
	createPackingListsTable := `
	CREATE TABLE IF NOT EXISTS packing_lists (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		destination TEXT,
		climate TEXT,
		duration_days INTEGER,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id),
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
	);
	`

	_, err = DB.Exec(createPackingListsTable)
	if err != nil {
		return err
	}

	// Create packing items table
	createPackingItemsTable := `
	CREATE TABLE IF NOT EXISTS packing_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		packing_list_id INTEGER NOT NULL,
		item_name TEXT NOT NULL,
		category TEXT,
		quantity INTEGER DEFAULT 1,
		is_checked BOOLEAN DEFAULT 0,
		is_suggested BOOLEAN DEFAULT 0,
		notes TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE
	);
	`

	_, err = DB.Exec(createPackingItemsTable)
	if err != nil {
		return err
	}

	// Create groups table
	createGroupsTable := `
	CREATE TABLE IF NOT EXISTS groups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id INTEGER,
		created_by INTEGER NOT NULL,
		group_name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(created_by) REFERENCES users(id),
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE SET NULL
	);
	`
	_, err = DB.Exec(createGroupsTable)
	if err != nil {
		return err
	}

	// Create group_members table
	createGroupMembersTable := `
	CREATE TABLE IF NOT EXISTS group_members (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		group_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id),
		UNIQUE(group_id, user_id)
	);
	`
	_, err = DB.Exec(createGroupMembersTable)
	if err != nil {
		return err
	}

	// Create group_expenses table
	createGroupExpensesTable := `
	CREATE TABLE IF NOT EXISTS group_expenses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		group_id INTEGER NOT NULL,
		paid_by INTEGER NOT NULL,
		amount REAL NOT NULL,
		category TEXT NOT NULL,
		description TEXT,
		expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
		FOREIGN KEY(paid_by) REFERENCES users(id)
	);
	`
	_, err = DB.Exec(createGroupExpensesTable)
	if err != nil {
		return err
	}

	// Create expense_splits table
	createExpenseSplitsTable := `
	CREATE TABLE IF NOT EXISTS expense_splits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		expense_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		amount_owed REAL NOT NULL,
		is_settled INTEGER DEFAULT 0,
		settled_at DATETIME,
		FOREIGN KEY(expense_id) REFERENCES group_expenses(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id),
		UNIQUE(expense_id, user_id)
	);
	`
	_, err = DB.Exec(createExpenseSplitsTable)
	if err != nil {
		return err
	}

	// Create itinerary_items table (Sprint 3 - DB-backed timeline)
	createItineraryItemsTable := `
	CREATE TABLE IF NOT EXISTS itinerary_items (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id       INTEGER NOT NULL,
		user_id       INTEGER NOT NULL,
		title         TEXT    NOT NULL,
		activity_type TEXT    NOT NULL DEFAULT 'other',
		date          TEXT    NOT NULL,
		start_time    TEXT    NOT NULL DEFAULT '',
		end_time      TEXT    NOT NULL DEFAULT '',
		location      TEXT    NOT NULL DEFAULT '',
		notes         TEXT    NOT NULL DEFAULT '',
		sort_order    INTEGER NOT NULL DEFAULT 0,
		created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`
	_, err = DB.Exec(createItineraryItemsTable)
	if err != nil {
		return err
	}

	// Create notifications table (Sprint 3)
	createNotificationsTable := `
	CREATE TABLE IF NOT EXISTS notifications (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id    INTEGER NOT NULL,
		type       TEXT    NOT NULL,
		title      TEXT    NOT NULL,
		message    TEXT    NOT NULL,
		trip_id    INTEGER,
		is_read    INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE SET NULL
	);
	`
	_, err = DB.Exec(createNotificationsTable)
	if err != nil {
		return err
	}

	// Create notification_preferences table (Sprint 3)
	createNotifPrefsTable := `
	CREATE TABLE IF NOT EXISTS notification_preferences (
		user_id              INTEGER PRIMARY KEY,
		email_enabled        INTEGER NOT NULL DEFAULT 0,
		trip_reminders       INTEGER NOT NULL DEFAULT 1,
		itinerary_changes    INTEGER NOT NULL DEFAULT 1,
		expense_updates      INTEGER NOT NULL DEFAULT 1,
		collaborator_updates INTEGER NOT NULL DEFAULT 1,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	);
	`
	_, err = DB.Exec(createNotifPrefsTable)
	if err != nil {
		return err
	}

	// Create trip_invites table
	createTripInvitesTable := `
	CREATE TABLE IF NOT EXISTS trip_invites (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id    INTEGER NOT NULL,
		email      TEXT    NOT NULL,
		token      TEXT    NOT NULL UNIQUE,
		status     TEXT    NOT NULL DEFAULT 'pending',
		expires_at DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
		UNIQUE(trip_id, email, status)
	);
	`
	_, err = DB.Exec(createTripInvitesTable)
	if err != nil {
		return err
	}

	log.Println("Database initialized successfully")
	return nil
}

// CloseDB closes the database connection
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
