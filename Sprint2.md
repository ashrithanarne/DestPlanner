# Sprint 2 - DestPlanner

## Sprint Overview
**Duration:** Sprint 2  
**Focus:** Backend API Documentation, Unit Testing, Frontend-Backend Integration, New Features (Trip Management, Packing List, Group Expense Splitting)
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
#### 6. **Trip Management**
- Complete trip CRUD operations
- Trip status tracking (planning, ongoing, completed, cancelled)
- Optional date range support with duration calculation
- Packing list progress included in trip summary response
- Added `trips` database table

#### 7. **Packing List Feature**
- Create packing list per trip with optional auto-populate based on climate
- Climate-based smart item suggestions (tropical, cold, rainy, default)
- Duration-based suggestions (e.g. laundry detergent for trips > 7 days)
- Add, update (check/uncheck), and delete individual items
- Packing progress tracking (checked items / total items %)
- Preview suggested items without creating a list
- Fixed NULL scan bug where auto-populated items with no notes were silently dropped
- Added `packing_lists` and `packing_items` database tables

#### 8. **Group Expense Splitting**
- Create travel groups optionally linked to a trip
- Creator is automatically added as the first member
- Add/remove members (creator only)
- Add group expenses paid by one member with automatic equal split or custom split
- Validation that all users in a custom split are group members
- Get all group expenses with split details per member
- Balance calculation — who owes whom using greedy debt simplification algorithm
- Settle individual splits, balances update automatically
- Added `groups`, `group_members`, `group_expenses`, `expense_splits` database tables

#### 9. **Itinerary Feature**
- Create itineraries with a name and owner
- Add and remove destinations from an itinerary
- Add and remove collaborators from an itinerary
- Get itinerary by ID
- Delete itinerary
- In-memory storage (map-based); endpoints registered under `/api/itineraries`
- Unit tested via `itinary_test.go` with isolated router setup


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
   - Trip Management
   - Packing List Management
   - Group & Expense Splitting
   -Itinerary Management

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
 
## Unit Tests for Backend
 
### Overview
Comprehensive unit tests have been written for all backend handlers to ensure reliability and correctness. Tests use an in-memory SQLite database for isolation and follow the Arrange-Act-Assert (AAA) pattern.
 
### Test Framework
- **Testing Library:** Go's built-in `testing` package
- **Assertions:** `github.com/stretchr/testify/assert`
- **HTTP Testing:** `net/http/httptest`
- **Framework:** Gin in test mode
- **Database:** In-memory SQLite (`:memory:`)
 
### Test Coverage Summary
 
#### 1. Authentication Handler Tests (`auth_test.go`)
 
**Total Tests: 11**
 
| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestRegister_Success` | Valid user registration | ✅ Pass |
| `TestRegister_MissingFields` | Registration with missing required fields | ✅ Pass |
| `TestRegister_DuplicateEmail` | Registration with existing email | ✅ Pass |
| `TestRegister_InvalidPayload` | Registration with malformed JSON | ✅ Pass |
| `TestLogin_Success` | Valid login credentials | ✅ Pass |
| `TestLogin_InvalidEmail` | Login with non-existent email | ✅ Pass |
| `TestLogin_InvalidPassword` | Login with incorrect password | ✅ Pass |
| `TestLogin_MissingFields` | Login with missing email or password | ✅ Pass |
| `TestLogout_Success` | Successful logout with token blacklisting | ✅ Pass |
| `TestLogout_Unauthorized` | Logout without authentication | ✅ Pass |
| `TestLogout_InvalidToken` | Logout with invalid token | ✅ Pass |
 
**Coverage:**
- ✅ User registration with validation
- ✅ User login with JWT token generation
- ✅ User logout with token blacklisting
- ✅ Password hashing and verification
- ✅ Error handling for all edge cases
 
---
 
#### 2. Profile Handler Tests (`profile_test.go`)
 
**Total Tests: 7**
 
| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestGetProfile_Success` | Retrieve user profile successfully | ✅ Pass |
| `TestGetProfile_Unauthorized` | Get profile without authentication | ✅ Pass |
| `TestGetProfile_UserNotFound` | Get profile for deleted user | ✅ Pass |
| `TestUpdateProfile_Success` | Update all profile fields | ✅ Pass |
| `TestUpdateProfile_PartialUpdate` | Update only some fields | ✅ Pass |
| `TestUpdateProfile_Unauthorized` | Update without authentication | ✅ Pass |
| `TestUpdateProfile_InvalidPayload` | Update with malformed JSON | ✅ Pass |
 
**Coverage:**
- ✅ Profile retrieval with authentication
- ✅ Profile updates (full and partial)
- ✅ Authorization checks
- ✅ Error handling
 
---
 
#### 3. Budget Handler Tests (`budget_test.go`)
 
**Total Tests: 10**
 
| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestCreateBudget_Success` | Create budget with all fields | ✅ Pass |
| `TestCreateBudget_MissingRequiredFields` | Create without required fields | ✅ Pass |
| `TestCreateBudget_Unauthorized` | Create without authentication | ✅ Pass |
| `TestGetBudgets_Success` | Retrieve all user budgets | ✅ Pass |
| `TestGetBudgetByID_Success` | Get specific budget with summary | ✅ Pass |
| `TestGetBudgetByID_NotFound` | Get non-existent budget | ✅ Pass |
| `TestUpdateBudget_Success` | Update budget fields | ✅ Pass |
| `TestUpdateBudget_NotFound` | Update non-existent budget | ✅ Pass |
| `TestDeleteBudget_Success` | Delete budget successfully | ✅ Pass |
| `TestDeleteBudget_NotFound` | Delete non-existent budget | ✅ Pass |
 
**Coverage:**
- ✅ Budget CRUD operations
- ✅ Budget summary calculations (remaining, percentage)
- ✅ Date parsing and validation
- ✅ Currency support
- ✅ User ownership validation
 
---
 
#### 4. Expense Handler Tests (`expense_test.go`)
 
**Total Tests: 11**
 
| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestAddExpense_Success` | Add expense to budget | ✅ Pass |
| `TestAddExpense_BudgetNotFound` | Add expense to non-existent budget | ✅ Pass |
| `TestAddExpense_MissingRequiredFields` | Add expense without category | ✅ Pass |
| `TestGetExpenses_Success` | Retrieve all budget expenses | ✅ Pass |
| `TestGetExpenses_BudgetNotFound` | Get expenses for non-existent budget | ✅ Pass |
| `TestUpdateExpense_Success` | Update expense amount and description | ✅ Pass |
| `TestUpdateExpense_NotFound` | Update non-existent expense | ✅ Pass |
| `TestDeleteExpense_Success` | Delete expense successfully | ✅ Pass |
| `TestDeleteExpense_NotFound` | Delete non-existent expense | ✅ Pass |
| `TestExpense_BudgetCalculations` | Verify budget spent_amount updates | ✅ Pass |
 
**Coverage:**
- ✅ Expense CRUD operations
- ✅ Automatic budget spent_amount updates
- ✅ Add expense → increases spent_amount
- ✅ Update expense → recalculates spent_amount
- ✅ Delete expense → decreases spent_amount
- ✅ Budget summary accuracy
 
---

#### 5. Trip Handler Tests (`trip_test.go`)

**Total Tests: 10**

| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestCreateTrip_Success` | Create trip with all fields | ✅ Pass |
| `TestCreateTrip_MissingTripName` | Create trip without required name | ✅ Pass |
| `TestCreateTrip_Unauthorized` | Create trip without authentication | ✅ Pass |
| `TestGetTrips_Success` | Retrieve all user trips | ✅ Pass |
| `TestGetTrips_EmptyList` | Get trips when none exist | ✅ Pass |
| `TestGetTripByID_Success` | Get specific trip with summary | ✅ Pass |
| `TestGetTripByID_NotFound` | Get non-existent trip | ✅ Pass |
| `TestUpdateTrip_Success` | Update trip fields and status | ✅ Pass |
| `TestUpdateTrip_NotFound` | Update non-existent trip | ✅ Pass |
| `TestDeleteTrip_Success` | Delete trip successfully | ✅ Pass |
| `TestDeleteTrip_NotFound` | Delete non-existent trip | ✅ Pass |
| `TestDeleteTrip_Unauthorized` | Delete without authentication | ✅ Pass |

**Coverage:**
- ✅ Trip CRUD operations
- ✅ Status management
- ✅ Date parsing
- ✅ Authorization checks

---

#### 6. Packing Handler Tests (`packing_test.go`)

**Total Tests: 12**

| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestCreatePackingList_Success` | Create packing list for a trip | ✅ Pass |
| `TestCreatePackingList_AutoPopulate` | Create with auto-populate and verify items exist | ✅ Pass |
| `TestCreatePackingList_DuplicateTripID` | Create second packing list for same trip | ✅ Pass |
| `TestCreatePackingList_TripNotFound` | Create for non-existent trip | ✅ Pass |
| `TestGetPackingList_Success` | Retrieve packing list with items | ✅ Pass |
| `TestGetPackingList_NotFound` | Get list for trip with no list | ✅ Pass |
| `TestAddPackingItem_Success` | Add custom item to list | ✅ Pass |
| `TestAddPackingItem_MissingItemName` | Add item without required name | ✅ Pass |
| `TestUpdatePackingItem_CheckItem` | Check/uncheck an item | ✅ Pass |
| `TestUpdatePackingItem_NotFound` | Update non-existent item | ✅ Pass |
| `TestDeletePackingItem_Success` | Delete an item | ✅ Pass |
| `TestDeletePackingList_Success` | Delete entire packing list | ✅ Pass |
| `TestDeletePackingList_NotFound` | Delete non-existent list | ✅ Pass |

**Coverage:**
- ✅ Packing list CRUD
- ✅ Auto-populate with climate-based suggestions
- ✅ Item check/uncheck
- ✅ Duplicate list prevention
- ✅ NULL notes scan bug fix verified

---

#### 7. Group Handler Tests (`group_test.go`)

**Total Tests: 18**

| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestCreateGroup_Success` | Create group successfully | ✅ Pass |
| `TestCreateGroup_MissingGroupName` | Create group without name | ✅ Pass |
| `TestCreateGroup_Unauthorized` | Create group without authentication | ✅ Pass |
| `TestCreateGroup_CreatorIsAutoMember` | Verify creator auto-added as member | ✅ Pass |
| `TestGetGroups_Success` | Retrieve all user groups | ✅ Pass |
| `TestAddMember_Success` | Add member to group | ✅ Pass |
| `TestAddMember_AlreadyMember` | Add user who is already a member | ✅ Pass |
| `TestAddMember_NotCreator` | Non-creator tries to add member | ✅ Pass |
| `TestRemoveMember_Success` | Remove member from group | ✅ Pass |
| `TestRemoveMember_CannotRemoveSelf` | Creator tries to remove themselves | ✅ Pass |
| `TestAddGroupExpense_EqualSplit` | Add expense with auto equal split | ✅ Pass |
| `TestAddGroupExpense_CustomSplit` | Add expense with custom split amounts | ✅ Pass |
| `TestAddGroupExpense_SplitAmountMismatch` | Custom splits don't sum to total | ✅ Pass |
| `TestAddGroupExpense_NonMemberInSplit` | Split includes non-member user | ✅ Pass |
| `TestAddGroupExpense_NotMember` | Non-member tries to add expense | ✅ Pass |
| `TestGetGroupExpenses_Success` | Get all group expenses with splits | ✅ Pass |
| `TestGetGroupBalances_Success` | Verify correct balance calculation | ✅ Pass |
| `TestSettleExpense_Success` | Settle a split successfully | ✅ Pass |
| `TestSettleExpense_AlreadySettled` | Try to settle already settled split | ✅ Pass |
| `TestSettleExpense_BalancesAfterSettle` | Balances go to zero after all settle | ✅ Pass |

**Coverage:**
- ✅ Group CRUD
- ✅ Member management with permission checks
- ✅ Equal and custom expense splits
- ✅ Non-member split validation
- ✅ Balance calculation accuracy
- ✅ Settle flow end-to-end

---

### Running the Tests
 
To run all unit tests:
 
```bash
# Run all tests
cd backend
go mod tidy
go test ./handlers/... -v
 
# Run with coverage
go test ./handlers/... -cover
 
# Run specific test file
go test ./handlers/auth_test.go -v
 
# Run specific test
go test ./handlers/auth_test.go -run TestLogin_Success -v
```
 
### Test Output Example
 
```bash
$ go test ./handlers/... -v
 
=== RUN   TestRegister_Success
--- PASS: TestRegister_Success (0.01s)
=== RUN   TestRegister_MissingFields
--- PASS: TestRegister_MissingFields (0.01s)
=== RUN   TestLogin_Success
--- PASS: TestLogin_Success (0.02s)
=== RUN   TestLogout_Success
--- PASS: TestLogout_Success (0.02s)
...
PASS
ok      backend/handlers    0.234s
```
 
### Test Design Principles
 
1. **Isolation:** Each test uses an in-memory database that is created and destroyed per test
2. **AAA Pattern:** Arrange (setup), Act (execute), Assert (verify)
3. **Comprehensive Coverage:** Tests cover success cases, error cases, and edge cases
4. **Realistic Scenarios:** Tests simulate actual API usage patterns
5. **Clear Naming:** Test names clearly describe what is being tested
6. **Independent:** Tests don't depend on each other and can run in any order
 
### Key Testing Features
 
✅ **Database Setup/Teardown:** Each test gets a fresh database  
✅ **JWT Token Testing:** Validates token generation and expiration  
✅ **Authentication Simulation:** Sets user claims in context for protected routes  
✅ **Error Response Validation:** Verifies correct error codes and messages  
✅ **Budget Calculations:** Tests automatic spent_amount updates  
✅ **CRUD Operations:** Full create, read, update, delete coverage  
 
---

#### 8. Bookmark Handler Tests (`bookmark_test.go`)

**Total Tests: 6**

| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestSaveBookmark_Success` | Save a bookmark for a valid destination | ✅ Pass |
| `TestSaveBookmark_Duplicate` | Saving the same bookmark twice returns 400 | ✅ Pass |
| `TestSaveBookmark_InvalidDestination` | Bookmark a non-existent destination returns 400 | ✅ Pass |
| `TestGetBookmarks_Success` | Retrieve all bookmarks for the user | ✅ Pass |
| `TestDeleteBookmark_Success` | Delete a bookmark by ID | ✅ Pass |
| `TestDeleteBookmark_NotFound` | Delete a non-existent bookmark returns 404 | ✅ Pass |

**Coverage:**
- ✅ Save bookmark with destination validation
- ✅ Duplicate bookmark prevention
- ✅ User-scoped bookmark retrieval
- ✅ Safe deletion with ownership check

---

#### 9. Destination Handler Tests (`destination_test.go`)

**Total Tests: 11**

| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestCreateDestination_Success` | Create a new destination | ✅ Pass |
| `TestGetDestinations_Success` | Retrieve all destinations | ✅ Pass |
| `TestGetDestinations_FilterByCountry` | Filter destinations by country | ✅ Pass |
| `TestGetDestinations_FilterByBudget` | Filter destinations by budget | ✅ Pass |
| `TestGetDestinationByID_Success` | Get a destination by ID | ✅ Pass |
| `TestGetDestinationByID_NotFound` | Get a non-existent destination returns 404 | ✅ Pass |
| `TestSuggestDestinations_Success` | Suggest destinations by query string | ✅ Pass |
| `TestUpdateDestination_Success` | Update a destination | ✅ Pass |
| `TestUpdateDestination_NotFound` | Update a non-existent destination returns 404 | ✅ Pass |
| `TestDeleteDestination_Success` | Delete a destination | ✅ Pass |
| `TestDeleteDestination_NotFound` | Delete a non-existent destination returns 404 | ✅ Pass |

**Coverage:**
- ✅ Full CRUD operations
- ✅ Public and protected access paths
- ✅ Country and budget filtering
- ✅ Autocomplete suggestions

---

#### 10. Itinerary Handler Tests (`itinary_test.go`)

**Total Tests: 8**

| Test Name | Description | Status |
|-----------|-------------|--------|
| `TestCreateItinerary_Success` | Create a new itinerary | ✅ Pass |
| `TestGetItinerary_Success` | Get an itinerary by ID | ✅ Pass |
| `TestAddDestination_Success` | Add a destination to an itinerary | ✅ Pass |
| `TestRemoveDestination_Success` | Remove a destination from an itinerary | ✅ Pass |
| `TestAddCollaborator_Success` | Add a collaborator to an itinerary | ✅ Pass |
| `TestRemoveCollaborator_Success` | Remove a collaborator from an itinerary | ✅ Pass |
| `TestDeleteItinerary_Success` | Delete an itinerary | ✅ Pass |
| `TestGetItinerary_AfterDelete_NotFound` | Verify itinerary is gone after deletion | ✅ Pass |

**Coverage:**
- ✅ Create and retrieve itineraries
- ✅ Add and remove destinations
- ✅ Add and remove collaborators
- ✅ Delete and verify deletion (404 after delete)

---

---

## Trip Management Endpoints

### 25. Create Trip

**POST** `/api/trips`

Create a new trip for the authenticated user.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "trip_name": "Hawaii Vacation",
  "destination": "Hawaii",
  "start_date": "2026-06-01",
  "end_date": "2026-06-10",
  "notes": "Summer trip"
}
```

**Field Descriptions:**
- `trip_name` (string, required) - Name of the trip
- `destination` (string, optional) - Destination name
- `start_date` (string, optional) - Trip start date in YYYY-MM-DD format
- `end_date` (string, optional) - Trip end date in YYYY-MM-DD format
- `notes` (string, optional) - Additional notes

**Response (201 Created):**
```json
{
  "message": "Trip created successfully",
  "trip_id": 1
}
```

---

### 26. Get All Trips

**GET** `/api/trips`

Get all trips for the authenticated user. Optionally filter by status.

**Query Parameters:**
- `status` (string, optional) - Filter by status: `planning`, `ongoing`, `completed`, `cancelled`

**Request:**
```bash
GET /api/trips?status=planning
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "trips": [
    {
      "id": 1,
      "user_id": 1,
      "trip_name": "Hawaii Vacation",
      "destination": "Hawaii",
      "start_date": "2026-06-01T00:00:00Z",
      "end_date": "2026-06-10T00:00:00Z",
      "notes": "Summer trip",
      "status": "planning",
      "created_at": "2026-03-21T10:00:00Z",
      "updated_at": "2026-03-21T10:00:00Z",
      "duration_days": 9,
      "packing_progress": 45.5
    }
  ]
}
```

---

### 27. Get Trip by ID

**GET** `/api/trips/:id`

**Response (200 OK):** Returns a single trip summary with `duration_days` and `packing_progress`.

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Trip not found"
}
```

---

### 28. Update Trip

**PUT** `/api/trips/:id`

**Request Body (all fields optional):**
```json
{
  "trip_name": "Updated Name",
  "destination": "Tokyo",
  "start_date": "2026-07-01",
  "end_date": "2026-07-14",
  "notes": "Updated notes",
  "status": "ongoing"
}
```

**Status values:** `planning`, `ongoing`, `completed`, `cancelled`

**Response (200 OK):**
```json
{
  "message": "Trip updated successfully"
}
```

---

### 29. Delete Trip

**DELETE** `/api/trips/:id`

Deletes the trip and cascades to packing lists and items.

**Response (200 OK):**
```json
{
  "message": "Trip deleted successfully"
}
```

---

## Packing List Endpoints

### 30. Create Packing List

**POST** `/api/trips/:id/packing-list`

Creates a packing list for a trip. Optionally auto-populates with climate-based suggestions.

**Request Body:**
```json
{
  "trip_id": 1,
  "destination": "Hawaii",
  "climate": "tropical",
  "duration_days": 9,
  "auto_populate": true
}
```

**Climate values:** `tropical`, `hot`, `summer`, `cold`, `winter`, `snow`, `rainy`, `monsoon`

**Response (201 Created):**
```json
{
  "message": "Packing list created successfully",
  "packing_list_id": 1
}
```

**Error (409 Conflict):** A packing list already exists for this trip.

---

### 31. Get Packing List

**GET** `/api/trips/:id/packing-list`

**Response (200 OK):**
```json
{
  "id": 1,
  "trip_id": 1,
  "user_id": 1,
  "destination": "Hawaii",
  "climate": "tropical",
  "duration_days": 9,
  "created_at": "2026-03-21T10:00:00Z",
  "updated_at": "2026-03-21T10:00:00Z",
  "items": [
    {
      "id": 1,
      "packing_list_id": 1,
      "item_name": "Sunscreen",
      "category": "Personal Care",
      "quantity": 1,
      "is_checked": false,
      "is_suggested": true,
      "notes": "",
      "created_at": "2026-03-21T10:00:00Z"
    }
  ],
  "total_items": 12,
  "checked_items": 3,
  "percent_complete": 25.0
}
```

---

### 32. Add Packing Item

**POST** `/api/trips/:id/packing-list/items`

**Request Body:**
```json
{
  "item_name": "Laptop",
  "category": "Electronics",
  "quantity": 1,
  "notes": "Work laptop"
}
```

- `item_name` (string, required)
- `category`, `quantity`, `notes` (optional, quantity defaults to 1)

**Response (201 Created):**
```json
{
  "message": "Item added successfully",
  "item_id": 5
}
```

---

### 33. Update Packing Item

**PUT** `/api/packing-items/:itemId`

**Request Body (all fields optional):**
```json
{
  "item_name": "Laptop",
  "category": "Electronics",
  "quantity": 2,
  "is_checked": true,
  "notes": "Updated notes"
}
```

**Response (200 OK):**
```json
{
  "message": "Item updated successfully"
}
```

---

### 34. Delete Packing Item

**DELETE** `/api/packing-items/:itemId`

**Response (200 OK):**
```json
{
  "message": "Item deleted successfully"
}
```

---

### 35. Delete Packing List

**DELETE** `/api/trips/:id/packing-list`

Deletes the packing list and all its items (CASCADE).

**Response (200 OK):**
```json
{
  "message": "Packing list deleted successfully"
}
```

---

### 36. Get Suggested Items (Preview)

**GET** `/api/packing-list/suggest?climate=tropical&duration_days=9`

Returns suggested items without creating anything. Useful for previewing suggestions before creating a list.

**Response (200 OK):**
```json
{
  "suggestions": [
    { "item_name": "Sunscreen", "category": "Personal Care", "quantity": 1, "is_suggested": true },
    { "item_name": "Swimsuit", "category": "Clothing", "quantity": 1, "is_suggested": true }
  ]
}
```

---

## Group & Expense Splitting Endpoints

### 37. Create Group

**POST** `/api/groups`

Creates a group. Creator is automatically added as the first member.

**Request Body:**
```json
{
  "group_name": "Hawaii Crew",
  "trip_id": 1
}
```

- `group_name` (string, required)
- `trip_id` (integer, optional) - Link group to an existing trip

**Response (201 Created):**
```json
{
  "message": "Group created successfully",
  "group_id": 1
}
```

---

### 38. Get Groups

**GET** `/api/groups`

Returns all groups the authenticated user belongs to, including member details.

**Response (200 OK):**
```json
{
  "groups": [
    {
      "id": 1,
      "group_name": "Hawaii Crew",
      "created_by": 1,
      "trip_id": 1,
      "created_at": "2026-03-21T10:00:00Z",
      "updated_at": "2026-03-21T10:00:00Z",
      "members": [
        { "user_id": 1, "first_name": "John", "last_name": "Doe", "email": "john@example.com" },
        { "user_id": 2, "first_name": "Jane", "last_name": "Smith", "email": "jane@example.com" }
      ]
    }
  ]
}
```

---

### 39. Add Member

**POST** `/api/groups/:id/members`

Only the group creator can add members.

**Request Body:**
```json
{
  "user_id": 2
}
```

**Response (201 Created):**
```json
{
  "message": "Member added successfully"
}
```

**Error (400):** User already a member.
**Error (403):** Only the group creator can add members.

---

### 40. Remove Member

**DELETE** `/api/groups/:id/members/:userId`

Only the group creator can remove members. Creator cannot remove themselves.

**Response (200 OK):**
```json
{
  "message": "Member removed successfully"
}
```

---

### 41. Add Group Expense

**POST** `/api/groups/:id/expenses`

The authenticated user is recorded as the payer. Splits equally among all members if no `splits` array is provided.

**Request Body (equal split):**
```json
{
  "amount": 150.00,
  "category": "Food & Dining",
  "description": "Dinner at restaurant",
  "expense_date": "2026-03-21"
}
```

**Request Body (custom split):**
```json
{
  "amount": 150.00,
  "category": "Hotel",
  "description": "Hotel booking",
  "expense_date": "2026-03-21",
  "splits": [
    { "user_id": 1, "amount_owed": 50.00 },
    { "user_id": 2, "amount_owed": 100.00 }
  ]
}
```

**Notes:**
- `description` and `expense_date` are optional
- If `splits` is provided, amounts must sum exactly to `amount`
- All user IDs in `splits` must be group members

**Response (201 Created):**
```json
{
  "message": "Expense added successfully",
  "expense_id": 4
}
```

**Error (400):** Split amounts don't sum to total, or a user in splits is not a group member.
**Error (403):** Caller is not a group member.

---

### 42. Get Group Expenses

**GET** `/api/groups/:id/expenses`

Returns all expenses with split details per member.

**Response (200 OK):**
```json
{
  "expenses": [
    {
      "id": 4,
      "group_id": 1,
      "paid_by": 1,
      "paid_by_name": "John Doe",
      "amount": 150.00,
      "category": "Hotel",
      "description": "Hotel booking",
      "expense_date": "2026-03-21T00:00:00Z",
      "created_at": "2026-03-21T10:00:00Z",
      "splits": [
        { "user_id": 1, "first_name": "John", "last_name": "Doe", "amount_owed": 50.00, "is_settled": false },
        { "user_id": 2, "first_name": "Jane", "last_name": "Smith", "amount_owed": 100.00, "is_settled": false }
      ]
    }
  ]
}
```

---

### 43. Get Group Balances

**GET** `/api/groups/:id/balances`

Calculates who owes whom across all unsettled expenses using a greedy debt simplification algorithm.

**How it works:**
1. For each member: `net = total amount paid - total amount owed (unsettled only)`
2. Members with negative net are debtors, positive net are creditors
3. Greedy algorithm produces the minimum number of transactions to settle all debts

**Response (200 OK):**
```json
{
  "balances": [
    {
      "from_user_id": 2,
      "from_name": "Jane Smith",
      "to_user_id": 1,
      "to_name": "John Doe",
      "amount": 100.00
    }
  ]
}
```

Returns empty array `[]` when all splits are settled.

---

### 44. Settle Expense

**PUT** `/api/groups/:id/expenses/:expenseId/settle`

Marks the authenticated user's own split on a specific expense as settled. No request body needed.

**Response (200 OK):**
```json
{
  "message": "Expense settled successfully"
}
```

**Error (400):** Split already settled or not found.

---

## Itinerary Management Endpoints

### 45. Create Itinerary

**POST** `/api/itineraries`

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Trip to NYC",
  "owner": 1
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Trip to NYC",
  "owner": 1,
  "destinations": [],
  "collaborators": []
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid input"
}
```

---

### 46. Get Itinerary by ID

**GET** `/api/itineraries/:id`

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Trip to NYC",
  "owner": 1,
  "destinations": [101],
  "collaborators": [5]
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Not found"
}
```

---

### 47. Add Destination to Itinerary

**POST** `/api/itineraries/:id/destinations`

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "destination_id": 101
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Trip to NYC",
  "owner": 1,
  "destinations": [101],
  "collaborators": []
}
```

---

### 48. Remove Destination from Itinerary

**DELETE** `/api/itineraries/:id/destinations/:dest_id`

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Trip to NYC",
  "owner": 1,
  "destinations": [],
  "collaborators": []
}
```

---

### 49. Add Collaborator to Itinerary

**POST** `/api/itineraries/:id/collaborators`

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": 5
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Trip to NYC",
  "owner": 1,
  "destinations": [],
  "collaborators": [5]
}
```

---

### 50. Remove Collaborator from Itinerary

**DELETE** `/api/itineraries/:id/collaborators/:user_id`

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Trip to NYC",
  "owner": 1,
  "destinations": [],
  "collaborators": []
}
```

---

### 51. Delete Itinerary

**DELETE** `/api/itineraries/:id`

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "Deleted"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Not found"
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
| GRT | `api/destinations` | Get destination |
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

#### Trip Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trips` | Create trip |
| GET | `/api/trips` | Get all user trips |
| GET | `/api/trips/:id` | Get trip by ID with summary |
| PUT | `/api/trips/:id` | Update trip |
| DELETE | `/api/trips/:id` | Delete trip |

#### Packing List Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trips/:id/packing-list` | Create packing list |
| GET | `/api/trips/:id/packing-list` | Get packing list with items |
| DELETE | `/api/trips/:id/packing-list` | Delete packing list |
| POST | `/api/trips/:id/packing-list/items` | Add item to list |
| GET | `/api/packing-list/suggest` | Preview suggested items |
| PUT | `/api/packing-items/:itemId` | Update/check item |
| DELETE | `/api/packing-items/:itemId` | Delete item |

#### Group & Expense Splitting
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups` | Create group |
| GET | `/api/groups` | Get user groups |
| POST | `/api/groups/:id/members` | Add member |
| DELETE | `/api/groups/:id/members/:userId` | Remove member |
| POST | `/api/groups/:id/expenses` | Add group expense |
| GET | `/api/groups/:id/expenses` | Get group expenses |
| GET | `/api/groups/:id/balances` | Get balances (who owes whom) |
| PUT | `/api/groups/:id/expenses/:expenseId/settle` | Settle a split |

#### Itinerary Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/itineraries` | Create itinerary |
| GET | `/api/itineraries/:id` | Get itinerary by ID |
| POST | `/api/itineraries/:id/destinations` | Add destination to itinerary |
| DELETE | `/api/itineraries/:id/destinations/:dest_id` | Remove destination from itinerary |
| POST | `/api/itineraries/:id/collaborators` | Add collaborator |
| DELETE | `/api/itineraries/:id/collaborators/:user_id` | Remove collaborator |
| DELETE | `/api/itineraries/:id` | Delete itinerary |

---

## Summary of Sprint 2 Work

### Issues Completed
- User Logout (#14)
- View basic information about a destination (#22)
- Bookmark destinations and activities (#24)
- Track trip budget and expenses (#26)
- Create and manage a trip itinerary (#25)
- Create and manage packing list (#15)
- Expense splitting for group trips (#18)
- Trip Management (#58)
- View destination recommendations based on budget (#20)
- Collaborative trip itinerary (#33)


### Features Delivered
1. Token blacklisting system for secure logout
2. Complete budget CRUD operations
3. Complete expense CRUD operations with automatic calculations
4. Destination management with CRUD and suggestions
5. Bookmark management system
6. Complete trip management with status tracking
7. Packing list with climate-based auto-populate and item tracking
8. Group expense splitting with balance calculation and settle flow
9. Itinerary management with destinations and collaborators
10. Comprehensive API documentation
11. Unit tests for all backend handlers (80 tests total, all passing)

### API Endpoints Added
- 1 logout endpoint
- 5 budget management endpoints
- 4 expense management endpoints
- 3 destination CRUD endpoints
- 3 bookmark management endpoints
- 5 trip management endpoints
- 7 packing list endpoints
- 8 group & expense splitting endpoints
- 9 itinerary management endpoints
**Total: 43 new endpoints**

### Backend Unit Tests Summary
| File | Tests | Status |
|------|-------|--------|
| `auth_test.go` | 11 | ✅ All Pass |
| `profile_test.go` | 7 | ✅ All Pass |
| `budget_test.go` | 10 | ✅ All Pass |
| `expense_test.go` | 10 | ✅ All Pass |
| `trip_test.go` | 12 | ✅ All Pass |
| `packing_test.go` | 13 | ✅ All Pass |
| `group_test.go` | 20 | ✅ All Pass |
| `bookmark_test.go` | 6 | ✅ All Pass |
| `destination_test.go` | 11 | ✅ All Pass |
| `itinary_test.go` | 8 | ✅ All Pass |
| **Total** | **108** | **✅ All Pass** |

---

## Frontend Work Completed in Sprint 2

### Framework
- **Framework:** Angular (with Angular Material)
- **Language:** TypeScript
- **Test Runner:** Vitest (via `@analogjs/vitest-angular`) + Jasmine/Karma for some service tests
- **E2E Testing:** Cypress

---

### Features Delivered

#### 1. **Authentication Integration (Login & Register)**
- Login component with reactive form, JWT token stored in `sessionStorage`
- Register component with password strength checker
- Auth guard (`auth.guard.ts`) to protect routes requiring login
- Auth interceptor (`auth-interceptor.ts`) to attach JWT `Bearer` token to all outgoing requests

#### 2. **Navigation**
- Responsive navigation bar with mobile hamburger menu
- Shows authenticated vs unauthenticated links dynamically via `AuthService.isLoggedIn$`
- Logout button triggers `AuthService.logout()` and redirects to landing page

#### 3. **Landing Page**
- Hero section with call-to-action buttons
- Features grid (6 features: Trip Management, Budget Tracking, Packing List, Expense Splitting, Discover Destinations, Profile)
- Benefits section and how-it-works walkthrough

#### 4. **Profile**
- View and edit user profile (first name, last name, email)
- Displays join date (formatted) and user initials avatar
- 401 error handling redirects to login

#### 5. **My Trips**
- List all trips with status filter
- Create trip modal form
- Inline edit trip form with status dropdown
- Delete trip with confirm dialog
- Packing progress bar per trip

#### 6. **Budget Tracking**
- List all user budgets
- Create budget form
- Add, edit, and delete expenses
- Spent percentage progress bar

#### 7. **Packing List**
- Route: `/packing-list/:tripId`
- Create a packing list with climate selection and auto-populate toggle
- Category tabs for filtering items
- Check/uncheck items with optimistic UI updates
- Add custom items and delete items or the entire list

#### 8. **Group Expense Splitting**
- List groups the user belongs to
- Add expense with equal, custom, and percentage split modes
- Settle individual expense splits
- Balance summary (who owes whom)

#### 9. **Destinations**
- Browse and search destinations with filters
- Destination cards with image, name, description, and rating
- Bookmark/favourite destinations
- Navigate to destination detail page

#### 10. **Destination Detail**
- Route: `/destinations/:id`
- Detailed destination information including description, highlights, and best time to visit
- Option to add destination to a trip
- Bookmark toggle for logged-in users

#### 11. **Itinerary**
- Route: `/itinerary/:tripId`
- Day-wise itinerary planning for each trip
- Add, edit, and delete itinerary items (activity, time, notes, location)
- Save and update itinerary via API
- Handles empty state

#### 12. **Frontend-Backend Integration**
- All services call the live Go backend at `http://localhost:8080/api`
- `AuthInterceptor` attaches JWT from `sessionStorage` to all API requests
- 401 responses trigger automatic logout and redirect to `/login`

---

## Frontend Unit Tests

### Test Framework
- **Jasmine/Karma** for `AuthService` and `BudgetService`
- **Vitest** (`@analogjs/vitest-angular`) for all component and remaining service tests
- **HTTP Mocking:** `provideHttpClientTesting()` + `HttpTestingController`
- **Service Mocking:** `vi.fn()` / `vi.spyOn()` stubs

### Unit Test Summary

| File | Tests | Description |
|------|-------|-------------|
| `app.spec.ts` | 2 | App component creation and render |
| `services/auth.spec.ts` | 12 | AuthService: register, login, logout, token mgmt |
| `services/budget.spec.ts` | 16 | BudgetService: CRUD, category totals, percentage helpers |
| `services/group.service.spec.ts` | 24 | GroupService: CRUD, expense splits, balances, settle |
| `services/destination.spec.ts` | 10 | DestinationService: fetch destinations, filters, get by ID |
| `services/user-profile.service.spec.ts` | 10 | UserProfileService: get/update profile, formatters |
| `services/itinerary.spec.ts` | 8 | ItineraryService: CRUD itinerary items, trip-based fetch |
| `services/bookmark.spec.ts` | 7 | BookmarkService: add, remove, list bookmarks |
| `interceptors/auth-interceptor.spec.ts` | 1 | Auth interceptor creation |
| `auth/login/login.spec.ts` | 11 | LoginComponent: form validation, submit |
| `auth/register/register.spec.ts` | 14 | RegisterComponent: form validation, submit, password strength |
| `components/navigation/navigation.spec.ts` | 10 | NavigationComponent: auth state, toggle, logout |
| `components/landing-page/landing-page.spec.ts` | 10 | LandingPageComponent: features, benefits, nav methods |
| `components/profile/profile.spec.ts` | 17 | ProfileComponent: load, edit mode, save, logout |
| `components/mytrips/mytrips.spec.ts` | 32 | MyTripsComponent: CRUD, filter, status, date helpers |
| `components/budget/budget.spec.ts` | 26 | BudgetComponent: CRUD, expense mgmt, formatters |
| `components/packing-list/packing-list.spec.ts` | 61 | PackingListComponent: create, items, toggle, grouping |
| `components/expense-split/expense-split.spec.ts` | 76 | ExpenseSplitComponent: groups, expenses, splits, settle |
| `components/destinations/destinations.spec.ts` | 11 | DestinationsComponent: list, filter, bookmark, navigation |
| `components/destination-detail/destination-detail.spec.ts` | 7 | DestinationDetailComponent: load by ID, bookmark toggle |
| `components/itinerary/itinerary.spec.ts` | 15 | ItineraryComponent: CRUD, day-wise organization |
| **Total** | **380** | **All Passing ✅** |

### Running Frontend Unit Tests
```bash
cd frontend/destplanner-frontend

# Run all unit tests
ng test
```

---

### Detailed Unit Test Listings

#### `app.spec.ts` — App Component (2 tests)


| Test | Description |
|------|-------------|
| `should create the app` | AppComponent instantiates successfully |
| `should render title` | nativeElement is truthy after detectChanges |

---

#### `services/auth.spec.ts` — AuthService (12 tests)

| Test | Description |
|------|-------------|
| `should be created` | Service instantiates |
| `register: should POST to /auth/register` | Sends POST with correct body |
| `login: should POST to /auth/login and store token` | Stores token in sessionStorage |
| `login: should update isLoggedIn$ to true on success` | BehaviorSubject emits true |
| `login: should update currentUser$ with user data` | BehaviorSubject emits user |
| `logout: should clear sessionStorage and update isLoggedIn$` | Clears token, emits false |
| `logout: should set currentUser$ to null` | Emits null user |
| `getToken: should return token from sessionStorage` | Returns stored token |
| `getToken: should return null when no token` | Returns null |
| `isLoggedIn: should return true when token exists` | Returns true |
| `isLoggedIn: should return false when no token` | Returns false |
| `getCurrentUser: should return null when not logged in` | Returns null |

---

#### `services/budget.spec.ts` — BudgetService (16 tests)

| Test | Description |
|------|-------------|
| `should be created` | Service instantiates |
| `createBudget: should POST to /budgets` | Sends correct POST body |
| `getBudgets: should GET /budgets and update budgets$` | Updates observable |
| `getBudgetById: should GET /budgets/:id and update selectedBudget$` | Updates observable |
| `updateBudget: should PUT to /budgets/:id` | Sends PUT with correct body |
| `deleteBudget: should DELETE /budgets/:id` | Sends DELETE request |
| `addExpense: should POST to /budgets/:id/expenses` | Sends expense payload |
| `getExpenses: should GET /budgets/:id/expenses` | Returns expenses array |
| `updateExpense: should PUT to /budgets/:id/expenses/:expenseId` | Updates expense |
| `deleteExpense: should DELETE /budgets/:id/expenses/:expenseId` | Deletes expense |
| `getCategoryTotals: should sum amounts per category and sort descending` | Aggregates categories |
| `getCategoryTotals: should return empty array for no expenses` | Empty input |
| `getSpentPercentage: should return correct percentage` | Math is correct |
| `getSpentPercentage: should cap at 100 when overspent` | Caps at 100 |
| `getSpentPercentage: should return 0 when total_budget is 0` | Zero division guard |
| `setSelectedBudget: should update selectedBudget$` | Updates observable |

---

#### `services/group.service.spec.ts` — GroupService (24 tests)


| Test | Description |
|------|-------------|
| `should be created` | Service instantiates |
| `getGroups: should GET /groups` | HTTP method verified |
| `getGroups: should update groups$ with response` | Observable updated |
| `getGroups: should set groups$ to empty array on empty response` | Empty list handled |
| `getGroupById: should GET /groups/:id` | HTTP method verified |
| `getGroupById: should update selectedGroup$` | Observable updated |
| `createGroup: should POST to /groups with payload` | Correct request body |
| `createGroup: should return group_id in response` | Response shape correct |
| `addMember: should POST to /groups/:id/members with user_id` | Correct body |
| `removeMember: should DELETE /groups/:id/members/:userId` | DELETE sent |
| `getGroupExpenses: should GET /groups/:id/expenses` | Returns expenses |
| `addGroupExpense: should POST to /groups/:id/expenses with payload` | Equal split |
| `addGroupExpense: should send custom splits when provided` | Custom splits |
| `addGroupExpense: should return expense_id in response` | Response shape |
| `getGroupBalances: should GET /groups/:id/balances` | HTTP method verified |
| `getGroupBalances: should update balances$` | Observable updated |
| `getGroupBalances: should set balances$ to empty on no balances` | Empty list handled |
| `settleExpense: should PUT to /groups/:id/expenses/:expenseId/settle` | PUT sent |
| `settleExpense: should return success message` | Response shape |
| `getMemberFullName: should return first + last name` | Formatting |
| `formatAmount: should format as USD currency` | Currency symbol |
| `formatAmount: should format with two decimal places` | Decimal precision |
| `setSelectedGroup: should update selectedGroup$` | Observable updated |
| `setSelectedGroup: should allow setting null` | Null allowed |

---

#### `services/destination.spec.ts` — DestinationService (10 tests)

| Test | Description |
|------|-------------|
| `should be created` | Service instantiates |
| `getDestinations: should GET /auth/destinations with no filters` | Fetches all destinations |
| `getDestinations: should return array of destinations` | Emits array |
| `getDestinations: should include budget param when provided` | Budget query param |
| `getDestinations: should include country param when provided` | Country query param |
| `getDestinations: should include both params when provided` | Both params |
| `getDestinationById: should GET /auth/destinations/:id` | Fetches by ID |
| `getDestinationById: should return the destination` | Emits destination |
| `suggestDestinations: should GET /auth/destinations/suggest?q=` | Suggest endpoint |
| `suggestDestinations: should return suggestions array` | Emits suggestions |

---

#### `services/itinerary.spec.ts` — ItineraryService (8 tests)

| Test | Description |
|------|-------------|
| `should be created` | Service instantiates |
| `createItinerary: should POST to /itineraries` | POST request sent |
| `createItinerary: should return itinerary on success` | Emits created itinerary |
| `getItinerary: should GET /itineraries/:id` | GET request sent |
| `getItinerary: should return itinerary with items` | Emits itinerary |
| `updateItinerary: should PUT to /itineraries/:id` | PUT request sent |
| `updateItinerary: should send correct payload` | Correct request body |
| `deleteItineraryItem: should DELETE /itineraries/:id/items/:itemId` | DELETE sent |

---

#### `services/bookmark.spec.ts` — BookmarkService (7 tests)

| Test | Description |
|------|-------------|
| `should be created` | Service instantiates |
| `addBookmark: should POST to /bookmarks with destination_id` | POST request sent |
| `addBookmark: should return message on success` | Emits success message |
| `getBookmarks: should GET /bookmarks` | GET request sent |
| `getBookmarks: should return array of bookmarks` | Emits bookmarks array |
| `removeBookmark: should DELETE /bookmarks/:id` | DELETE sent |
| `removeBookmark: should return message on success` | Emits success message |

---

#### `services/user-profile.service.spec.ts` — UserProfileService (10 tests)

| Test | Description |
|------|-------------|
| `should be created` | Service instantiates |
| `getProfile: should GET /profile` | HTTP method verified |
| `getProfile: should update profile$ with user data` | Observable updated |
| `updateProfile: should PUT to /profile with payload` | Correct body sent |
| `updateProfile: should update profile$ after update` | Observable updated |
| `formatJoinDate: should format date string nicely` | Contains year and month |
| `formatJoinDate: should return original string on invalid date` | Graceful fallback |
| `getInitials: should return uppercase initials` | Returns "JD" |
| `getInitials: should handle empty strings` | Returns "" |
| `getInitials: should handle single name` | Returns "J" |

---

#### `auth/login/login.spec.ts` — LoginComponent (11 tests)

| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `should initialise loginForm with email, password and rememberMe controls` | Form controls exist |
| `should be invalid when form is empty` | Form invalid by default |
| `should mark email as invalid when not an email format` | Email format validated |
| `should mark form as valid with correct email and password` | Valid form |
| `should have loading as false initially` | Loading initialized false |
| `submit: should not call auth.login when form is invalid` | Guard on invalid |
| `submit: should call auth.login with email and password` | Calls service |
| `submit: should set loading to false after success` | Loading reset |
| `submit: should set loading to false after error` | Loading reset on error |
| `navigateToRegister: should be a defined method` | Method exists |

---

#### `auth/register/register.spec.ts` — RegisterComponent (14 tests)

| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `registerForm: should be invalid when empty` | Validation active |
| `registerForm: should be valid with all required fields` | Valid form |
| `submit: should show snack and not call register when form is invalid` | Guards bad submission |
| `submit: should call register on valid form` | Calls service |
| `submit: should navigate to /login on success` | Redirect on success |
| `submit: should show success snack on register success` | Success message |
| `submit: should show error snack on registration failure` | Error message |
| `submit: should reset loading to false on error` | Loading state reset |
| `checkStrength: should return empty string for empty password` | Empty input |
| `checkStrength: should return "Weak" for short password` | Weak detection |
| `checkStrength: should return "Strong" for valid strong password` | Strong detection |
| `checkStrength: should return "Medium" for medium password` | Medium detection |
| `navigateToLogin: should navigate to /login` | Route navigation |


---

#### `components/navigation/navigation.spec.ts` — NavigationComponent (10 tests)

| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `ngOnInit: should set isAuthenticated to false when not logged in` | Auth state |
| `ngOnInit: should set userName to empty when no user` | Empty user |
| `toggleMobileMenu: should toggle isMobileMenuOpen` | Toggle behavior |
| `logout: should call authService.logout` | Calls service |
| `navigateToProfile: should exist as a method` | Method exists |
| `navigateToMyTrips: should exist as a method` | Method exists |
| `navigateToLogin: should exist as a method` | Method exists |
| `navigateToRegister: should exist as a method` | Method exists |
| `navigateToHome: should exist as a method` | Method exists |

---

#### `components/landing-page/landing-page.spec.ts` — LandingPageComponent (10 tests)

| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `should have 6 features defined` | Feature count |
| `should include Budget Tracking feature` | Specific feature present |
| `should have 4 benefits defined` | Benefits count |
| `navigateToRegister: should exist as a method` | Method exists |
| `navigateToLogin: should exist as a method` | Method exists |
| `scrollToFeatures: should exist as a method` | Method exists |
| `scrollToHowItWorks: should exist as a method` | Method exists |
| `navigateToFeature: should exist as a method` | Method exists |
| `navigateToFeature: should not throw for non-budget features` | No throw |

---

#### `components/profile/profile.spec.ts` — ProfileComponent (17 tests)

| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `ngOnInit: should load profile on init` | Service called |
| `ngOnInit: should set profile after load` | Profile populated |
| `ngOnInit: should set loading to false after load` | Loading state |
| `loadProfile: should handle 401 error and navigate to login` | Auth redirect |
| `loadProfile: should set loading false on non-401 error` | Error handling |
| `enterEditMode: should set editMode to true and patch form` | Edit form populated |
| `enterEditMode: should do nothing if no profile` | Null guard |
| `cancelEdit: should set editMode to false and reset form` | Cancel behavior |
| `saveProfile: should not call updateProfile if form is invalid` | Validation guard |
| `saveProfile: should call updateProfile with form values` | Service called |
| `saveProfile: should set editMode to false after success` | State reset |
| `saveProfile: should set saving to false on error` | Error handling |
| `logout: should call authService.logout and navigate to /` | Logout behavior |
| `getInitials: should delegate to profileService` | Delegation |
| `getInitials: should return ? if no profile` | Null guard |
| `formatDate: should delegate to profileService` | Delegation |

---

#### `components/mytrips/mytrips.spec.ts` — MyTripsComponent (32 tests)

| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `ngOnInit: should load trips on init` | Trips loaded |
| `ngOnInit: should load budgets on init` | Budgets loaded |
| `loadTrips: should populate trips array` | Trips array filled |
| `loadTrips: should handle 401 error and redirect to login` | Auth redirect |
| `applyFilter: should filter trips by status` | Status filter |
| `applyFilter: should show all trips for "all" filter` | All filter |
| `toggleCreateForm: should toggle showCreateForm` | Toggle behavior |
| `submitCreate: should not call createTrip if form is invalid` | Validation guard |
| `submitCreate: should call createTrip with form values` | Service called |
| `submitCreate: should reset form and close after success` | Success state |
| `startEdit: should set editingTrip and patch form` | Edit initialized |
| `cancelEdit: should clear editingTrip` | Cancel behavior |
| `submitEdit: should not call updateTrip if no editingTrip` | Null guard |
| `submitEdit: should call updateTrip with correct payload` | Service called |
| `submitEdit: should clear editingTrip after success` | Success state |
| `deleteTrip: should call deleteTrip on service after confirm` | Confirmed delete |
| `deleteTrip: should not call deleteTrip if confirm cancelled` | Cancelled delete |
| `openBudget: should navigate to /budget with trip_id` | Navigation |
| `getStatusConfig: should return correct config for planning` | Planning config |
| `getStatusConfig: should return correct config for completed` | Completed config |
| `getStatusConfig: should return fallback for unknown status` | Fallback |
| `getStatusCounts: should return correct counts` | Count aggregation |
| `formatDateRange: should return "Dates TBD" if no start date` | Null guard |
| `formatDateRange: should return formatted date range` | Date formatting |
| `getDurationLabel: should return empty string if no duration` | Null guard |
| `getDurationLabel: should return "1 day" for single day` | Singular label |
| `getDurationLabel: should return "N days" for multiple days` | Plural label |
| `getPackingProgressColor: should return primary for >= 80` | Color threshold |
| `getPackingProgressColor: should return accent for 40-79` | Color threshold |
| `getPackingProgressColor: should return warn for < 40` | Color threshold |
| `trackByTripId: should return trip id` | Track by |

---

#### `components/budget/budget.spec.ts` — BudgetComponent (26 tests)


| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `ngOnInit: should load budgets on init` | Service called |
| `toggleCreateForm: should toggle showCreateForm` | Toggle behavior |
| `toggleExpenseForm: should toggle showExpenseForm` | Toggle behavior |
| `selectBudget: should set selectedBudget and load expenses` | Budget selection |
| `backToList: should clear selectedBudget and expenses` | Back behavior |
| `submitCreateBudget: should not call service if form is invalid` | Validation guard |
| `submitCreateBudget: should call createBudget and reload on success` | Create success |
| `deleteBudget: should call deleteBudget on service` | Delete called |
| `submitExpense: should not call service if form is invalid` | Validation guard |
| `submitExpense: should call addExpense on valid form` | Add expense |
| `submitExpense: should call updateExpense when editing` | Edit mode |
| `deleteExpense: should call deleteExpense on service` | Delete called |
| `startEditExpense: should set editingExpense and populate form` | Edit initialized |
| `getSpentPercentage: should return 0 when no selectedBudget` | Null guard |
| `getSpentPercentage: should delegate to service when budget selected` | Delegation |
| `getProgressColor: should return primary for < 70%` | Color threshold |
| `getProgressColor: should return accent for 70-89%` | Color threshold |
| `getProgressColor: should return warn for >= 90%` | Color threshold |
| `formatCurrency: should format as USD` | Currency format |
| `getCategoryIcon: should return correct icon` | Icon mapping |
| `getCategoryIcon: should return fallback for unknown` | Fallback |
| `getCategoryColor: should return correct color` | Color mapping |
| `getCategoryColor: should return fallback for unknown` | Fallback |
| `trackByExpenseId: should return expense id` | Track by |
| `trackByBudgetId: should return budget id` | Track by |
---

#### `components/packing-list/packing-list.spec.ts` — PackingListComponent (61 tests)

| Test | Description |
|------|-------------|
| `ngOnInit: should load trip and packing list on init` | Init loads data |
| `ngOnInit: should set tripId from route param` | Route param parsed |
| `ngOnInit: should set createDuration from trip duration_days` | Duration set |
| `ngOnInit: should redirect to /my-trips when tripId is missing` | Missing param guard |
| `ngOnInit: should not load data on server platform` | SSR guard |
| `load: should populate data on success` | Data populated |
| `load: should set loading to false after success` | Loading state |
| `load: should close create and add-item forms after success` | Forms closed |
| `load: should set data to null on error` | Error state |
| `load: should set loading to false on error` | Loading on error |
| `load: should show snack on non-404 error` | Error snack |
| `load: should NOT show snack on 404 error` | 404 silent |
| `submitCreate: should show snack when no climate selected` | Validation snack |
| `submitCreate: should NOT call service when climate is empty` | Guard |
| `submitCreate: should call create with correct payload` | Correct payload |
| `submitCreate: should show success snack and reload on success` | Success behavior |
| `submitCreate: should reset saving to false on success` | State reset |
| `submitCreate: should reload without error snack on 409 conflict` | 409 silent |
| `submitCreate: should show error snack on non-409 failure` | Error snack |
| `submitAddItem: should show snack when item name is empty` | Validation snack |
| `submitAddItem: should NOT call service when name is blank` | Guard |
| `submitAddItem: should call addItem with trimmed name and correct payload` | Payload |
| `submitAddItem: should reset form fields and close form on success` | Reset behavior |
| `submitAddItem: should show success snack and reload on success` | Success behavior |
| `submitAddItem: should show error snack on failure` | Error snack |
| `submitAddItem: should reset saving to false on error` | State reset |
| `toggleCheck: should optimistically toggle is_checked to true` | Optimistic update |
| `toggleCheck: should optimistically toggle is_checked to false` | Optimistic update |
| `toggleCheck: should update checked_items count optimistically` | Count update |
| `toggleCheck: should recalculate percent_complete optimistically` | Percent update |
| `toggleCheck: should call updateItem with new is_checked value` | API call |
| `toggleCheck: should revert is_checked on API error` | Error revert |
| `toggleCheck: should revert checked_items count on API error` | Count revert |
| `toggleCheck: should show snack on API error` | Error snack |
| `deleteItem: should call deleteItem service when confirmed` | Confirmed delete |
| `deleteItem: should NOT call service when user cancels confirm` | Cancel guard |
| `deleteItem: should reset deletingItemId to null after success` | State reset |
| `deleteItem: should show success snack and reload on success` | Success behavior |
| `deleteItem: should show error snack on failure` | Error snack |
| `deleteItem: should reset deletingItemId to null on error` | State reset |
| `deleteList: should call deleteList service with tripId` | Service called |
| `deleteList: should set data to null on success` | State cleared |
| `deleteList: should show success snack on success` | Success snack |
| `deleteList: should show error snack on failure` | Error snack |
| `groupedItems: should return empty array when data is null` | Null guard |
| `groupedItems: should group items by category` | Grouping |
| `groupedItems: should return all groups when activeCategory is "All"` | All filter |
| `groupedItems: should filter to one category when activeCategory is set` | Filter |
| `groupedItems: should fall back to "Other" for items with no category` | Fallback |
| `allCategories: should return empty array when data is null` | Null guard |
| `allCategories: should start with "All" followed by unique categories` | Category list |
| `allCategories: should deduplicate categories` | Deduplication |
| `checkedIn: should count only checked items` | Count checked |
| `checkedIn: should return 0 when no items are checked` | Zero count |
| `checkedIn: should return 0 for empty array` | Empty array |
| `catIcon: should return correct icon for all known categories` | Icon mapping |
| `catIcon: should return "category" fallback for unknown category` | Fallback |
| `progressColor: should return "warn" when percent < 40` | Color threshold |
| `progressColor: should return "accent" when percent is 40–79` | Color threshold |
| `progressColor: should return "primary" when percent is >= 80` | Color threshold |
| `progressColor: should return "warn" when data is null` | Null guard |

---

#### `components/expense-split/expense-split.spec.ts` — ExpenseSplitComponent (76 tests)

| Test | Description |
|------|-------------|
| `ngOnInit: should call loadGroups on browser platform` | Browser init |
| `ngOnInit: should populate groups after init` | Groups loaded |
| `ngOnInit: should NOT load groups on server platform` | SSR guard |
| `loadGroups: should set groups on success` | Data populated |
| `loadGroups: should set loadingGroups to false after success` | Loading state |
| `loadGroups: should show snack and navigate on 401` | Auth redirect |
| `loadGroups: should show generic snack on other errors` | Error snack |
| `loadGroups: should set loadingGroups to false on error` | Loading on error |
| `selectGroup: should set selectedGroup` | Selection set |
| `selectGroup: should call loadExpenses and loadBalances` | Data loaded |
| `selectGroup: should hide add expense form` | Form hidden |
| `backToGroups: should clear selectedGroup` | Group cleared |
| `backToGroups: should clear expenses and balances` | Data cleared |
| `backToGroups: should reload groups` | Groups reloaded |
| `toggleCreateGroupForm: should show form when hidden` | Show form |
| `toggleCreateGroupForm: should hide and reset when shown` | Hide and reset |
| `submitCreateGroup: should call createGroup with group_name` | Service called |
| `submitCreateGroup: should show snack and reload on success` | Success behavior |
| `submitCreateGroup: should show validation snack when form is invalid` | Validation snack |
| `submitCreateGroup: should NOT call service when form is invalid` | Guard |
| `submitCreateGroup: should show error snack on API failure` | Error snack |
| `submitCreateGroup: should reset savingGroup on error` | State reset |
| `loadExpenses: should populate expenses on success` | Data populated |
| `loadExpenses: should set loadingExpenses to false on success` | Loading state |
| `loadExpenses: should show snack on error` | Error snack |
| `loadExpenses: should do nothing when no selectedGroup` | Null guard |
| `loadBalances: should populate balances on success` | Data populated |
| `loadBalances: should set loadingBalances to false on success` | Loading state |
| `loadBalances: should do nothing when no selectedGroup` | Null guard |
| `toggleAddExpenseForm: should show form` | Show form |
| `toggleAddExpenseForm: should hide and reset form` | Hide and reset |
| `onSplitModeChange: should set splitMode to equal` | Mode set |
| `onSplitModeChange: should build splits array for custom mode` | Custom array |
| `onSplitModeChange: should build splits array for percentage mode` | Percentage array |
| `onSplitModeChange: should clear splits array when switching to equal` | Array cleared |
| `onSplitModeChange: should clear splitError` | Error cleared |
| `validateSplits: should return true for equal mode` | Equal valid |
| `validateSplits: should return false when custom amounts do not match total` | Custom invalid |
| `validateSplits: should return true when custom amounts match total` | Custom valid |
| `validateSplits: should return false when percentages do not add to 100` | Percentage invalid |
| `validateSplits: should return true when percentages sum to 100` | Percentage valid |
| `submitAddExpense: should call addGroupExpense with correct payload (equal split)` | Equal split payload |
| `submitAddExpense: should NOT send splits for equal mode` | No splits sent |
| `submitAddExpense: should send custom splits for custom mode` | Custom splits sent |
| `submitAddExpense: should convert percentages to amounts for percentage mode` | Percentage conversion |
| `submitAddExpense: should show success snack and reload on success` | Success behavior |
| `submitAddExpense: should show validation snack when form is invalid` | Validation snack |
| `submitAddExpense: should show split error snack when splits are invalid` | Split error |
| `submitAddExpense: should show error snack on API failure` | Error snack |
| `submitAddExpense: should reset savingExpense on error` | State reset |
| `settleExpense: should call settleExpense service` | Service called |
| `settleExpense: should show success snack and reload` | Success behavior |
| `settleExpense: should reset settlingId after success` | State reset |
| `settleExpense: should show error snack on failure` | Error snack |
| `settleExpense: should reset settlingId on error` | State reset |
| `settleExpense: should do nothing when no selectedGroup` | Null guard |
| `resetExpenseForm: should reset form to defaults` | Form reset |
| `resetExpenseForm: should clear the splits FormArray` | Array cleared |
| `isMySettled: should return true when my split is settled` | Settled check |
| `isMySettled: should return false when my split is not settled` | Unsettled check |
| `isMySettled: should return false when user has no split` | Missing user |
| `getTotalExpenses: should sum all expense amounts` | Sum calculation |
| `getTotalExpenses: should return 0 when no expenses` | Empty array |
| `getMemberName: should call groupService.getMemberFullName` | Delegation |
| `formatCurrency: should call groupService.formatAmount` | Delegation |
| `getCategoryIcon: should return correct icons for known categories` | Icon mapping |
| `getCategoryIcon: should return receipt fallback for unknown category` | Fallback |
| `isSplitBalanced: should return true when split total equals expense amount` | Balanced check |
| `isSplitBalanced: should return false when split total does not match` | Imbalanced check |
| `currentSplitTotal: should sum amount_owed from all splits controls` | Total calculation |
| `currentSplitTotal: should return 0 when no splits` | Empty |
| `expenseAmount: should return parsed number from form` | Parsing |
| `expenseAmount: should return 0 when amount is empty` | Empty input |
| `trackByGroupId: should return group id` | Track by |
| `trackByExpenseId: should return expense id` | Track by |
| `trackByBalanceIdx: should return index` | Track by |

---

#### `components/destinations/destinations.spec.ts` — DestinationsComponent (11 tests)

| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `ngOnInit: should call loadDestinations` | Calls loadDestinations on init |
| `ngOnInit: should set isLoggedIn from authService` | Sets isLoggedIn correctly |
| `loadDestinations: should populate destinations array` | Loads destinations into array |
| `loadDestinations: should set loading to false on success` | Resets loading flag |
| `loadDestinations: should set loading to false on error` | Resets loading on error |
| `loadDestinations: should load bookmarks when logged in` | Marks bookmarked destinations |
| `toggleBookmark: should not call addBookmark when not logged in` | Prevents if not logged in |
| `toggleBookmark: should call addBookmark when not bookmarked and logged in` | Adds bookmark |
| `toggleBookmark: should call removeBookmark when already bookmarked` | Removes bookmark |
| `viewDetails: should be a defined method` | Method exists |

---

#### `components/destination-detail/destination-detail.spec.ts` — DestinationDetailComponent (7 tests)

| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `loadDestination: should set loading to false on error` | Resets loading after error |
| `loadDestination: should check bookmarks when logged in` | Marks bookmarked destination |
| `toggleBookmark: should not call service when not logged in` | Prevents if not logged in |
| `toggleBookmark: should addBookmark when not bookmarked and logged in` | Adds bookmark |
| `toggleBookmark: should removeBookmark when already bookmarked` | Removes bookmark |
| `goBack: should be a defined method` | Method exists |

---

#### `components/itinerary/itinerary.spec.ts` — ItineraryComponent (15 tests)

| Test | Description |
|------|-------------|
| `should create` | Component instantiates |
| `loadItinerary: should use fallback items on error` | Fallback on error |
| `openForm: should set showForm to true` | Opens form modal |
| `openForm: should reset editingId when no item passed` | Resets editingId |
| `openForm: should set editingId when item passed` | Sets editingId |
| `closeForm: should set showForm to false` | Closes form modal |
| `closeForm: should reset editingId` | Resets editingId on close |
| `itemForm: should be invalid when empty` | Form validation fails |
| `itemForm: should be valid when time and activity filled` | Form valid |
| `saveItem: should add new item to itineraryItems` | Adds new item |
| `saveItem: should not save if form is invalid` | Prevents invalid save |
| `saveItem: should update existing item when editingId is set` | Updates item |
| `saveItem: should call updateItinerary on save` | Calls service |
| `deleteItem: should remove item from itineraryItems` | Removes item |
| `deleteItem: should call deleteItineraryItem on service` | Calls service |

---

## Cypress E2E Tests

### Test File
`frontend/destplanner-frontend/cypress/e2e/landing-page.cy.ts`

### Running the Cypress Tests
```bash
cd frontend/destplanner-frontend

# Open Cypress interactive runner
npx cypress open

# Run headlessly
npx cypress run
```

### Cypress Test Listing


| Test | Description |
|------|-------------|
| `should load the landing page` | Visits `/`, asserts "DestPlanner" text is visible |
| `should navigate to login page` | Visits `/login`, checks email and password inputs exist |
| `should navigate to register page` | Visits `/register`, checks form inputs exist |
| `should allow typing in login form fields` | Types into email and password fields, verifies values |
| `should show Login link in nav when not authenticated` | Landing page shows "Login" in nav |
| `should show Budget Tracking feature on landing page` | Budget Tracking feature card is visible |

---

## Frontend Test Design Principles

1. **Isolation:** Components tested with mock services via `vi.fn()` — no real HTTP calls
2. **AAA Pattern:** Arrange (setup/spy), Act (call method / detect changes), Assert (expect)
3. **Optimistic UI Testing:** `toggleCheck` tests verify both immediate UI update and API revert on failure
4. **Error Handling Coverage:** Every service call has at least one test for the error path
5. **SSR Guard Testing:** Components with `isPlatformBrowser` guards tested for both platforms
6. **Null Guards:** All components tested with null/undefined data to verify defensive coding
