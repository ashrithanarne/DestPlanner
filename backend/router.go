package main

import (
	"log"
	"net/http"
	"os"

	"backend/database"
	"backend/handlers"
	"backend/middleware"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

func main() {

	// Initialize database
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./destplanner.db"
	}

	if err := database.InitDB(dbPath); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDB()

	// Set JWT secret from environment variable
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret != "" {
		utils.SetJWTSecret(jwtSecret)
	} else {
		log.Println("WARNING: Using default JWT secret. Set JWT_SECRET environment variable in production!")
	}

	// Create Gin router
	r := gin.Default()

	// Apply CORS middleware
	r.Use(middleware.CORSMiddleware())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	// Public routes - Authentication
	auth := r.Group("/api/auth")
	{
		auth.POST("/login", handlers.Login)
		auth.POST("/register", handlers.Register)
	}

	// Protected routes - require JWT authentication
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		api.GET("/profile", handlers.GetProfile)
		api.PUT("/profile", handlers.UpdateProfile)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s...\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
