package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"backend/models"
	"backend/utils"
)

// AuthMiddleware validates JWT tokens for Gin
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error:   "unauthorized",
				Message: "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check if it's a Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error:   "unauthorized",
				Message: "Invalid authorization header format. Expected: Bearer <token>",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error:   "unauthorized",
				Message: "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Add claims to context
		c.Set("user", claims)
		c.Next()
	}
}
