package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Open database
	db, err := sql.Open("sqlite3", "./destplanner.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Hash the password
	password := "password123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}

	email := "test@example.com"
	
	// Delete existing user if any
	db.Exec("DELETE FROM users WHERE email = ?", email)

	// Insert user with correct hash
	query := `INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)`
	_, err = db.Exec(query, email, string(hashedPassword), "Test", "User")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("✅ Test user created successfully!")
	fmt.Println()
	fmt.Println("Login credentials:")
	fmt.Println("  Email:", email)
	fmt.Println("  Password:", password)
	fmt.Println()
	fmt.Println("Password hash:", string(hashedPassword))
	fmt.Println()
	fmt.Println("Test login with:")
	fmt.Println(`  curl -X POST http://localhost:8080/api/auth/login \`)
	fmt.Println(`    -H "Content-Type: application/json" \`)
	fmt.Printf(`    -d '{"email":"%s","password":"%s"}'`+"\n", email, password)
}
