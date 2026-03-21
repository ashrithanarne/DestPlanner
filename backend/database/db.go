package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

// InitDB initializes the SQLite database connection and creates tables
func InitDB(dataSourceName string) error {
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
	    destination TEXT NOT NULL,
	    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	    FOREIGN KEY(user_id) REFERENCES users(id)
    );
 `

	_, err = DB.Exec(createBookmarksTable)
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

	// Create trips table
	createTripsTable := `
	CREATE TABLE IF NOT EXISTS trips (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		trip_name TEXT NOT NULL,
		destination TEXT,
		start_date DATETIME,
		end_date DATETIME,
		budget REAL DEFAULT 0,
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
