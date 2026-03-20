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
