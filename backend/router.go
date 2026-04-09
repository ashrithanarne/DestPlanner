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

		auth.GET("/destinations", handlers.GetDestinations)
		auth.GET("/destinations/:id", handlers.GetDestinationByID)
		auth.GET("/destinations/suggest", handlers.SuggestDestinations)
	}

	// Protected auth routes (require authentication)
	authProtected := r.Group("/api/auth")
	authProtected.Use(middleware.AuthMiddleware())
	{
		authProtected.POST("/logout", handlers.Logout)
	}

	// Protected routes - require JWT authentication
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// Profile routes
		api.GET("/profile", handlers.GetProfile)
		api.PUT("/profile", handlers.UpdateProfile)

		// User search (for adding group members)
		api.GET("/users/search", handlers.SearchUsers)
		api.GET("/users/:id", handlers.GetUserByID)

		// Bookmark routes
		api.POST("/bookmarks", handlers.SaveBookmark)
		api.GET("/bookmarks", handlers.GetBookmarks)
		api.DELETE("/bookmarks/:id", handlers.DeleteBookmark)

		// Destination routes
		api.POST("/destinations", handlers.CreateDestination)
		api.DELETE("/destinations/:id", handlers.DeleteDestination)
		api.PUT("/destinations/:id", handlers.UpdateDestination)

		// Review routes
		api.POST("/destinations/:id/reviews", handlers.CreateReview)
		api.GET("/destinations/:id/reviews", handlers.GetReviews)
		api.PUT("/destinations/:id/reviews/:reviewId", handlers.UpdateReview)
		api.DELETE("/destinations/:id/reviews/:reviewId", handlers.DeleteReview)

		// Activity routes
		api.GET("/destinations/:id/activities", handlers.GetActivities)
		api.POST("/destinations/:id/activities", handlers.CreateActivity)
		api.PUT("/destinations/:id/activities/:activityId", handlers.UpdateActivity)
		api.DELETE("/destinations/:id/activities/:activityId", handlers.DeleteActivity)

		// Itinerary routes
		api.POST("/itineraries", handlers.CreateItinerary)
		api.GET("/itineraries/:id", handlers.GetItinerary)
		api.POST("/itineraries/:id/destinations", handlers.AddDestination)
		api.DELETE("/itineraries/:id/destinations/:dest_id", handlers.RemoveDestination)
		api.POST("/itineraries/:id/collaborators", handlers.AddCollaborator)
		api.DELETE("/itineraries/:id/collaborators/:user_id", handlers.RemoveCollaborator)
		api.DELETE("/itineraries/:id", handlers.DeleteItinerary)

		// Budget routes
		api.POST("/budgets", handlers.CreateBudget)
		api.GET("/budgets", handlers.GetBudgets)
		api.GET("/budgets/:id", handlers.GetBudgetByID)
		api.PUT("/budgets/:id", handlers.UpdateBudget)
		api.DELETE("/budgets/:id", handlers.DeleteBudget)

		// Expense routes (under budget)
		api.POST("/budgets/:id/expenses", handlers.AddExpense)
		api.GET("/budgets/:id/expenses", handlers.GetExpenses)
		api.PUT("/budgets/:id/expenses/:expenseId", handlers.UpdateExpense)
		api.DELETE("/budgets/:id/expenses/:expenseId", handlers.DeleteExpense)

		// Packing list routes
		api.POST("/trips/:id/packing-list", handlers.CreatePackingList)
		api.GET("/trips/:id/packing-list", handlers.GetPackingList)
		api.DELETE("/trips/:id/packing-list", handlers.DeletePackingList)
		api.POST("/trips/:id/packing-list/items", handlers.AddPackingItem)
		api.GET("/packing-list/suggest", handlers.GetSuggestedItems)

		// Packing item routes
		api.PUT("/packing-items/:itemId", handlers.UpdatePackingItem)
		api.DELETE("/packing-items/:itemId", handlers.DeletePackingItem)

		// Trip routes
		api.POST("/trips", handlers.CreateTrip)
		api.GET("/trips", handlers.GetTrips)
		api.GET("/trips/:id", handlers.GetTripByID)
		api.PUT("/trips/:id", handlers.UpdateTrip)
		api.DELETE("/trips/:id", handlers.DeleteTrip)

		// Group routes
		api.POST("/groups", handlers.CreateGroup)
		api.GET("/groups", handlers.GetGroups)
		api.GET("/groups/:id", handlers.GetGroupByID)
		api.POST("/groups/:id/members", handlers.AddMember)
		api.DELETE("/groups/:id/members/:userId", handlers.RemoveMember)
		api.POST("/groups/:id/expenses", handlers.AddGroupExpense)
		api.GET("/groups/:id/expenses", handlers.GetGroupExpenses)
		api.GET("/groups/:id/balances", handlers.GetGroupBalances)
		api.PUT("/groups/:id/expenses/:expenseId/settle", handlers.SettleExpense)

		// Timeline routes
		api.GET("/trips/:id/timeline", handlers.GetTimeline)
		api.POST("/trips/:id/timeline/items", handlers.CreateTimelineItem)
		api.PUT("/trips/:id/timeline/items/:itemId", handlers.UpdateTimelineItem)
		api.DELETE("/trips/:id/timeline/items/:itemId", handlers.DeleteTimelineItem)
		api.PUT("/trips/:id/timeline/items/:itemId/reorder", handlers.ReorderTimelineItem)
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
