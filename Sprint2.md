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

### Features Delivered
1. Token blacklisting system for secure logout
2. Complete budget CRUD operations
3. Complete expense CRUD operations with automatic calculations
4. Destination management with CRUD and suggestions
5. Bookmark management system
6. Complete trip management with status tracking
7. Packing list with climate-based auto-populate and item tracking
8. Group expense splitting with balance calculation and settle flow
9. Comprehensive API documentation
10. Unit tests for all backend handlers (80 tests total, all passing)

### API Endpoints Added
- 1 logout endpoint
- 5 budget management endpoints
- 4 expense management endpoints
- 3 destination CRUD endpoints
- 3 bookmark management endpoints
- 5 trip management endpoints
- 7 packing list endpoints
- 8 group & expense splitting endpoints
**Total: 36 new endpoints**

### Unit Tests Summary
| File | Tests | Status |
|------|-------|--------|
| `auth_test.go` | 11 | ✅ All Pass |
| `profile_test.go` | 7 | ✅ All Pass |
| `budget_test.go` | 10 | ✅ All Pass |
| `expense_test.go` | 11 | ✅ All Pass |
| `trip_test.go` | 12 | ✅ All Pass |
| `packing_test.go` | 12 | ✅ All Pass |
| `group_test.go` | 18 | ✅ All Pass |
| **Total** | **80** | **✅ All Pass** |

---