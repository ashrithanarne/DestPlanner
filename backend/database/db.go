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
