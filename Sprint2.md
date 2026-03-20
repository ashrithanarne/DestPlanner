# Sprint 2 - DestPlanner

## Sprint Overview
**Duration:** Sprint 2  
**Focus:** Backend API Documentation, Unit Testing, Frontend-Backend Integration, New Features
**Team:** Frontend (Angular) + Backend (Go)

---

## Work Completed in Sprint 2

### Backend

#### 1. **User Logout Feature**
- Implemented token blacklisting system
- Created POST `/api/auth/logout` endpoint
- Updated authentication middleware to check blacklisted tokens
- Added `token_blacklist` database table

#### 2. **Budget Tracking Feature**
- Complete budget management system with CRUD operations
- Expense tracking with full CRUD operations
- Automatic budget calculations (spent amount, remaining budget, percentage used)
- Support for multiple currencies and date ranges
- Added `budgets` and `expenses` database tables

#### 3. **Destination Management**
- CRUD operations for destinations
- Public endpoints for browsing destinations
- Destination suggestions based on budget and preferences
- Search and filter capabilities
 
#### 4. **Bookmark Feature**
- Save/bookmark favorite destinations
- View all bookmarked destinations
- Remove bookmarks
- User-specific bookmark management

#### 5. **Bug Fixes and Improvements**
- Fixed empty token validation in authentication middleware
- Enhanced error handling and validation across all endpoints
- Improved JWT token verification and expiration handling

---

## Backend API Documentation

### Base URL
```
http://localhost:8080
```

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Table of Contents
1. [Public Endpoints](#public-endpoints)
   - Health Check
   - User Registration
   - User Login
   - Get Destinations (Public)
   - Get Destination by ID
   - Get Destination Suggestions
2. [Protected Endpoints](#protected-endpoints)
   - User Logout
   - User Profile
   - Destinations Management
   - Bookmarks Management
   - Budget Management
   - Expense Management

---

## Public Endpoints

### 1. Health Check

**GET** `/health`

Check if the server is running.

**Request:**
```bash
GET /health
```

**Response (200 OK):**
```json
{
  "status": "healthy"
}
```

---

### 2. User Registration

**POST** `/api/auth/register`

Register a new user account.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Success Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user_id": 1
}
```

**Error Responses:**

*400 Bad Request - Invalid payload:*
```json
{
  "error": "bad_request",
  "message": "Invalid request payload"
}
```

*400 Bad Request - Missing fields:*
```json
{
  "error": "validation_error",
  "message": "All fields are required"
}
```

*400 Bad Request - User already exists:*
```json
{
  "error": "user_exists",
  "message": "User with this email already exists"
}
```

---

### 3. User Login

**POST** `/api/auth/login`

Login with email and password to receive JWT token.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwiZXhwIjoxNzA1MzI1NDAwLCJuYmYiOjE3MDUyMzkwMDAsImlhdCI6MTcwNTIzOTAwMH0.abc123...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "expires_at": 1705325400
}
```

**Token Details:**
- Token expires in 24 hours
- `expires_at` is a Unix timestamp
- Store the token securely for subsequent requests

**Error Responses:**

*400 Bad Request - Invalid payload:*
```json
{
  "error": "bad_request",
  "message": "Invalid request payload"
}
```

*400 Bad Request - Missing fields:*
```json
{
  "error": "validation_error",
  "message": "Email and password are required"
}
```

*401 Unauthorized - Invalid credentials:*
```json
{
  "error": "unauthorized",
  "message": "Invalid email or password"
}
```

---

### 4. Get All Destinations (Public)

**GET** `/api/auth/destinations`

Get a list of all available destinations.

**Request:**
```bash
GET /api/auth/destinations
```

**Response (200 OK):**
```json
{
  "destinations": [
    {
      "id": 1,
      "name": "Paris",
      "country": "France",
      "budget": 2000.0,
      "description": "The City of Light - known for art, fashion, and culture",
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-10T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Tokyo",
      "country": "Japan",
      "budget": 3000.0,
      "description": "Vibrant metropolis blending tradition and modernity",
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-10T10:00:00Z"
    }
  ]
}
```

---

### 5. Get Destination by ID

**GET** `/api/auth/destinations/:id`

Get details of a specific destination.

**URL Parameters:**
- `id` (integer, required) - Destination ID

**Request:**
```bash
GET /api/auth/destinations/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Paris",
  "country": "France",
  "budget": 2000.0,
  "description": "The City of Light - known for art, fashion, and culture",
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T10:00:00Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Destination not found"
}
```

---

### 6. Get Destination Suggestions

**GET** `/api/auth/destinations/suggest`

Get personalized destination suggestions based on query parameters.

**Query Parameters:**
- `budget` (float, optional) - Maximum budget
- `country` (string, optional) - Filter by country
- `limit` (integer, optional) - Number of results to return

**Request:**
```bash
GET /api/auth/destinations/suggest?budget=3000&country=France
```

**Response (200 OK):**
```json
{
  "suggestions": [
    {
      "id": 1,
      "name": "Paris",
      "country": "France",
      "budget": 2000.0,
      "description": "The City of Light",
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-10T10:00:00Z"
    }
  ]
}
```

---

## Protected Endpoints

All protected endpoints require authentication via JWT token in the Authorization header.

### Authentication Errors

All protected endpoints may return these authentication errors:

**401 Unauthorized - Missing token:**
```json
{
  "error": "unauthorized",
  "message": "Authorization header is required"
}
```

**401 Unauthorized - Invalid format:**
```json
{
  "error": "unauthorized",
  "message": "Invalid authorization header format. Expected: Bearer <token>"
}
```

**401 Unauthorized - Empty token:**
```json
{
  "error": "unauthorized",
  "message": "Token cannot be empty"
}
```

**401 Unauthorized - Blacklisted token:**
```json
{
  "error": "unauthorized",
  "message": "Token has been invalidated"
}
```

**401 Unauthorized - Invalid/expired token:**
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token"
}
```

---

### 7. User Logout

**POST** `/api/auth/logout`

Logout the current user by blacklisting their JWT token.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```bash
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Notes:**
- After logout, the token is added to a blacklist
- Any future requests with this token will be rejected
- User must login again to get a new token

---

### 8. Get User Profile

**GET** `/api/profile`

Get the current user's profile information.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```bash
GET /api/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### 9. Update User Profile

**PUT** `/api/profile`

Update the current user's profile information.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "newemail@example.com"
}
```

**Note:** All fields are optional. Only include fields you want to update.

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "email": "newemail@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T14:20:00Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "bad_request",
  "message": "Invalid request payload"
}
```

---

### 10. Create Destination

**POST** `/api/destinations`

Create a new destination (Admin functionality - available to authenticated users).

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Bali",
  "country": "Indonesia",
  "budget": 1500.0,
  "description": "Tropical paradise with beautiful beaches and rich culture"
}
```

**Response (201 Created):**
```json
{
  "message": "Destination created successfully",
  "destination_id": 10
}
```

---

### 11. Update Destination

**PUT** `/api/destinations/:id`

Update an existing destination.

**URL Parameters:**
- `id` (integer, required) - Destination ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Bali",
  "country": "Indonesia",
  "budget": 1800.0,
  "description": "Updated description"
}
```

**Note:** All fields are optional. Only include fields you want to update.

**Response (200 OK):**
```json
{
  "message": "Destination updated successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Destination not found"
}
```

---

### 12. Delete Destination

**DELETE** `/api/destinations/:id`

Delete a destination.

**URL Parameters:**
- `id` (integer, required) - Destination ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "Destination deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Destination not found"
}
```

---

### 13. Save Bookmark

**POST** `/api/bookmarks`

Bookmark a destination for the current user.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "destination": "Paris, France"
}
```

**Response (201 Created):**
```json
{
  "message": "Destination bookmarked successfully",
  "bookmark_id": 15
}
```

**Error Response (400 Bad Request - Already bookmarked):**
```json
{
  "error": "already_exists",
  "message": "Destination already bookmarked"
}
```

---

### 14. Get User Bookmarks

**GET** `/api/bookmarks`

Get all bookmarked destinations for the current user.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "bookmarks": [
    {
      "id": 15,
      "user_id": 1,
      "destination": "Paris, France",
      "created_at": "2024-01-20T15:00:00Z"
    },
    {
      "id": 16,
      "user_id": 1,
      "destination": "Tokyo, Japan",
      "created_at": "2024-01-21T10:00:00Z"
    }
  ]
}
```

---

### 15. Delete Bookmark

**DELETE** `/api/bookmarks/:id`

Remove a bookmark.

**URL Parameters:**
- `id` (integer, required) - Bookmark ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "Bookmark removed successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Bookmark not found"
}
```

---

## Budget Management Endpoints

### 16. Create Budget

**POST** `/api/budgets`

Create a new budget for a trip.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "trip_name": "Paris Summer Vacation",
  "total_budget": 3000.0,
  "currency": "USD",
  "start_date": "2024-06-01",
  "end_date": "2024-06-10",
  "notes": "Budget for 10-day Paris trip including flights and accommodation"
}
```

**Field Descriptions:**
- `trip_name` (string, required) - Name of the trip
- `total_budget` (float, required) - Total budget amount (must be greater than 0)
- `currency` (string, optional) - Currency code (default: "USD")
- `start_date` (string, optional) - Trip start date in YYYY-MM-DD format
- `end_date` (string, optional) - Trip end date in YYYY-MM-DD format
- `notes` (string, optional) - Additional notes about the budget

**Response (201 Created):**
```json
{
  "message": "Budget created successfully",
  "budget_id": 5
}
```

**Error Responses:**

*400 Bad Request - Invalid payload:*
```json
{
  "error": "bad_request",
  "message": "Invalid request payload"
}
```

*400 Bad Request - Validation error:*
```json
{
  "error": "validation_error",
  "message": "Total budget must be greater than 0"
}
```

---

### 17. Get All Budgets

**GET** `/api/budgets`

Get all budgets for the authenticated user with summary calculations.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "budgets": [
    {
      "id": 5,
      "user_id": 1,
      "trip_name": "Paris Summer Vacation",
      "total_budget": 3000.0,
      "spent_amount": 1250.0,
      "currency": "USD",
      "start_date": "2024-06-01T00:00:00Z",
      "end_date": "2024-06-10T00:00:00Z",
      "notes": "Budget for 10-day Paris trip",
      "created_at": "2024-01-20T10:00:00Z",
      "updated_at": "2024-01-22T15:30:00Z",
      "remaining_budget": 1750.0,
      "percentage_used": 41.67
    },
    {
      "id": 6,
      "user_id": 1,
      "trip_name": "Tokyo Adventure",
      "total_budget": 5000.0,
      "spent_amount": 0.0,
      "currency": "USD",
      "start_date": "2024-09-15T00:00:00Z",
      "end_date": "2024-09-25T00:00:00Z",
      "notes": "",
      "created_at": "2024-01-22T09:00:00Z",
      "updated_at": "2024-01-22T09:00:00Z",
      "remaining_budget": 5000.0,
      "percentage_used": 0.0
    }
  ]
}
```

**Budget Summary Fields:**
- `remaining_budget` - Calculated as `total_budget - spent_amount`
- `percentage_used` - Calculated as `(spent_amount / total_budget) * 100`

---

### 18. Get Budget by ID

**GET** `/api/budgets/:id`

Get a specific budget with summary information.

**URL Parameters:**
- `id` (integer, required) - Budget ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "id": 5,
  "user_id": 1,
  "trip_name": "Paris Summer Vacation",
  "total_budget": 3000.0,
  "spent_amount": 1250.0,
  "currency": "USD",
  "start_date": "2024-06-01T00:00:00Z",
  "end_date": "2024-06-10T00:00:00Z",
  "notes": "Budget for 10-day Paris trip",
  "created_at": "2024-01-20T10:00:00Z",
  "updated_at": "2024-01-22T15:30:00Z",
  "remaining_budget": 1750.0,
  "percentage_used": 41.67
}
```

**Error Responses:**

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Budget not found"
}
```

*400 Bad Request - Invalid ID:*
```json
{
  "error": "bad_request",
  "message": "Invalid budget ID"
}
```

---

### 19. Update Budget

**PUT** `/api/budgets/:id`

Update an existing budget.

**URL Parameters:**
- `id` (integer, required) - Budget ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "trip_name": "Paris Summer Vacation 2024",
  "total_budget": 3500.0,
  "currency": "EUR",
  "notes": "Updated budget with euro conversion"
}
```

**Note:** All fields are optional. Only include fields you want to update.

**Response (200 OK):**
```json
{
  "message": "Budget updated successfully"
}
```

**Error Responses:**

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Budget not found"
}
```

*400 Bad Request:*
```json
{
  "error": "bad_request",
  "message": "Invalid request payload"
}
```

---

### 20. Delete Budget

**DELETE** `/api/budgets/:id`

Delete a budget and all associated expenses.

**URL Parameters:**
- `id` (integer, required) - Budget ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "Budget deleted successfully"
}
```

**Note:** Deleting a budget will also delete all associated expenses (CASCADE).

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Budget not found"
}
```

---

## Expense Management Endpoints

### 21. Add Expense

**POST** `/api/budgets/:id/expenses`

Add an expense to a budget. The budget's spent_amount is automatically updated.

**URL Parameters:**
- `id` (integer, required) - Budget ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "category": "Accommodation",
  "amount": 800.0,
  "description": "Hotel booking for 5 nights",
  "expense_date": "2024-06-01"
}
```

**Field Descriptions:**
- `category` (string, required) - Expense category (e.g., "Food", "Transport", "Accommodation", "Entertainment")
- `amount` (float, required) - Expense amount (must be greater than 0)
- `description` (string, optional) - Details about the expense
- `expense_date` (string, optional) - Date of expense in YYYY-MM-DD format (defaults to current date)

**Response (201 Created):**
```json
{
  "message": "Expense added successfully",
  "expense_id": 25
}
```

**Automatic Updates:**
- Budget's `spent_amount` is increased by the expense amount
- Budget's `updated_at` timestamp is updated

**Error Responses:**

*404 Not Found - Budget doesn't exist:*
```json
{
  "error": "not_found",
  "message": "Budget not found"
}
```

*400 Bad Request - Invalid payload:*
```json
{
  "error": "bad_request",
  "message": "Invalid request payload"
}
```

---

### 22. Get All Expenses

**GET** `/api/budgets/:id/expenses`

Get all expenses for a specific budget.

**URL Parameters:**
- `id` (integer, required) - Budget ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "expenses": [
    {
      "id": 25,
      "budget_id": 5,
      "category": "Accommodation",
      "amount": 800.0,
      "description": "Hotel booking for 5 nights",
      "expense_date": "2024-06-01T00:00:00Z",
      "created_at": "2024-01-20T10:30:00Z"
    },
    {
      "id": 26,
      "budget_id": 5,
      "category": "Food",
      "amount": 250.0,
      "description": "Restaurants and cafes",
      "expense_date": "2024-06-03T00:00:00Z",
      "created_at": "2024-01-20T11:00:00Z"
    },
    {
      "id": 27,
      "budget_id": 5,
      "category": "Transport",
      "amount": 200.0,
      "description": "Metro passes and taxi",
      "expense_date": "2024-06-02T00:00:00Z",
      "created_at": "2024-01-20T11:15:00Z"
    }
  ]
}
```

**Note:** Expenses are ordered by expense_date in descending order (most recent first).

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Budget not found"
}
```

---

### 23. Update Expense

**PUT** `/api/budgets/:id/expenses/:expenseId`

Update an existing expense. The budget's spent_amount is automatically recalculated.

**URL Parameters:**
- `id` (integer, required) - Budget ID
- `expenseId` (integer, required) - Expense ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "category": "Accommodation",
  "amount": 900.0,
  "description": "Updated: Hotel booking for 5 nights (premium room)",
  "expense_date": "2024-06-01"
}
```

**Response (200 OK):**
```json
{
  "message": "Expense updated successfully"
}
```

**Automatic Updates:**
- Budget's `spent_amount` is recalculated: `spent_amount = spent_amount - old_amount + new_amount`
- Budget's `updated_at` timestamp is updated

**Example:**
- Original expense: $800
- Updated expense: $900
- Budget spent_amount increases by $100

**Error Responses:**

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Expense not found"
}
```

*400 Bad Request - Invalid ID:*
```json
{
  "error": "bad_request",
  "message": "Invalid expense ID"
}
```

---

### 24. Delete Expense

**DELETE** `/api/budgets/:id/expenses/:expenseId`

Delete an expense. The budget's spent_amount is automatically updated.

**URL Parameters:**
- `id` (integer, required) - Budget ID
- `expenseId` (integer, required) - Expense ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "Expense deleted successfully"
}
```

**Automatic Updates:**
- Budget's `spent_amount` is decreased by the deleted expense amount
- Budget's `updated_at` timestamp is updated

**Example:**
- Deleted expense: $800
- Budget spent_amount decreases by $800

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Expense not found"
}
```

---

## Error Codes Reference

| Status Code | Error Type | Description |
|------------|------------|-------------|
| 400 | bad_request | Invalid request payload or format |
| 400 | validation_error | Missing required fields or invalid data |
| 400 | user_exists | User with email already exists |
| 400 | already_exists | Resource already exists (e.g., bookmark) |
| 401 | unauthorized | Missing, invalid, expired, or blacklisted JWT token |
| 404 | not_found | Resource not found |
| 500 | server_error | Internal server error |

---

## Complete API Endpoint Summary

### Public Endpoints (No Authentication)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/destinations` | Get all destinations |
| GET | `/api/auth/destinations/:id` | Get destination by ID |
| GET | `/api/auth/destinations/suggest` | Get destination suggestions |

### Protected Endpoints (Require Authentication)

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/logout` | Logout user (blacklist token) |

#### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update user profile |

#### Destinations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/destinations` | Create destination |
| PUT | `/api/destinations/:id` | Update destination |
| DELETE | `/api/destinations/:id` | Delete destination |

#### Bookmarks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookmarks` | Save bookmark |
| GET | `/api/bookmarks` | Get user bookmarks |
| DELETE | `/api/bookmarks/:id` | Delete bookmark |

#### Budget Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/budgets` | Create budget |
| GET | `/api/budgets` | Get all user budgets |
| GET | `/api/budgets/:id` | Get budget by ID with summary |
| PUT | `/api/budgets/:id` | Update budget |
| DELETE | `/api/budgets/:id` | Delete budget |

#### Expense Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/budgets/:id/expenses` | Add expense to budget |
| GET | `/api/budgets/:id/expenses` | Get all expenses for budget |
| PUT | `/api/budgets/:id/expenses/:expenseId` | Update expense |
| DELETE | `/api/budgets/:id/expenses/:expenseId` | Delete expense |

---

## Summary of Sprint 2 Work

### Issues Completed
- User Logout
- View basic information about a destination
- Bookmark destinations and activities
- Track trip budget and expenses

### Features Delivered
1. Token blacklisting system for secure logout
2. Complete budget CRUD operations
3. Complete expense CRUD operations
4. Automatic budget calculations
5. Destination management with CRUD operations
6. Destination search and suggestions
7. Bookmark management system
8. Comprehensive API documentation

### API Endpoints Added
- 1 logout endpoint
- 5 budget management endpoints
- 4 expense management endpoints
- 3 destination CRUD endpoints
- 3 bookmark management endpoints
**Total: 16 new endpoints**
---