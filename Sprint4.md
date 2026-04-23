# Sprint 4 - DestPlanner

## Sprint Overview
**Duration:** Sprint 4  
**Focus:** New Features, Extended API, Unit Testing  
**Team:** Frontend (Angular) + Backend (Go)

---

## Work Completed in Sprint 4

### Backend

#### 1. **Travel and Accommodation Options Feature**
- Users can view simulated travel options for any destination
- Users can view simulated accommodation options for any destination
- Travel options include flights, trains, and buses with estimated costs
- Accommodation options include hotels, apartments, and hostels
- Each option includes name, type, estimated cost, currency, and booking link
- Booking links redirect to real external platforms (Skyscanner, Booking.com, Airbnb etc.)
- Destination name dynamically included in each option
- Returns 404 if destination does not exist
- Uses simulated data as per issue specification — in production
  these would be replaced with real booking API calls

  #### 2. **Analytics Dashboard Feature**
- Users can view a summary of their total trips, total spent, total budgets and average spent per trip
- Users can view a full list of their past and upcoming trips with destination, dates, status and total cost
- Users can view expense breakdown by category ordered by highest spend
- All endpoints return graceful empty state when user has no data
- Uses existing trips, budgets and expenses tables — no new tables required

---

## Backend API Documentation

### Base URL
http://localhost:8080

### Authentication
All endpoints require JWT authentication via the Authorization header:
Authorization: Bearer <your_jwt_token>

---

## Travel and Accommodation Endpoints

### 1. Get Travel Options

**GET** `/api/destinations/:id/travel`

Returns simulated travel options for a destination including
flights, trains and buses.

**URL Parameters:**
- `id` (integer, required) - Destination ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Example Request:**
GET /api/destinations/1/travel

**Response (200 OK):**
```json
{
  "destination_id": 1,
  "destination_name": "Paris",
  "total_options": 4,
  "travel_options": [
    {
      "id": 1,
      "type": "Flight",
      "name": "Direct Flight to Paris",
      "description": "Round trip direct flight with standard luggage included",
      "estimated_cost": 450.00,
      "currency": "USD",
      "booking_link": "https://www.skyscanner.com"
    },
    {
      "id": 2,
      "type": "Flight",
      "name": "Connecting Flight to Paris",
      "description": "Round trip connecting flight, budget option",
      "estimated_cost": 280.00,
      "currency": "USD",
      "booking_link": "https://www.kayak.com"
    },
    {
      "id": 3,
      "type": "Train",
      "name": "Express Train to Paris",
      "description": "High speed rail service, scenic route",
      "estimated_cost": 120.00,
      "currency": "USD",
      "booking_link": "https://www.raileurope.com"
    },
    {
      "id": 4,
      "type": "Bus",
      "name": "Coach Bus to Paris",
      "description": "Comfortable coach service, most affordable option",
      "estimated_cost": 45.00,
      "currency": "USD",
      "booking_link": "https://www.busbud.com"
    }
  ]
}
```

**Error Responses:**

*400 Bad Request - Invalid ID:*
```json
{
  "error": "bad_request",
  "message": "Invalid destination ID"
}
```

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Destination not found"
}
```
```

**Error Responses:**

*400 Bad Request - Invalid ID:*
```json
{
  "error": "bad_request",
  "message": "Invalid destination ID"
}
```

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Destination not found"
}

---

### 2. Get Accommodation Options

**GET** `/api/destinations/:id/accommodations`

Returns simulated accommodation options for a destination
including hotels, apartments and hostels.

**URL Parameters:**
- `id` (integer, required) - Destination ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Example Request:**
GET /api/destinations/1/accommodations

**Response (200 OK):**
```json
{
  "destination_id": 1,
  "destination_name": "Paris",
  "total_options": 4,
  "accommodation_options": [
    {
      "id": 1,
      "name": "Luxury Hotel Paris",
      "type": "Hotel",
      "description": "5-star hotel with pool, spa, and breakfast included",
      "estimated_cost": 350.00,
      "currency": "USD",
      "booking_link": "https://www.booking.com"
    },
    {
      "id": 2,
      "name": "Boutique Hotel Paris",
      "type": "Hotel",
      "description": "Charming 3-star boutique hotel in city center",
      "estimated_cost": 150.00,
      "currency": "USD",
      "booking_link": "https://www.hotels.com"
    },
    {
      "id": 3,
      "name": "Airbnb Apartment Paris",
      "type": "Apartment",
      "description": "Entire apartment, great for families or groups",
      "estimated_cost": 95.00,
      "currency": "USD",
      "booking_link": "https://www.airbnb.com"
    },
    {
      "id": 4,
      "name": "Budget Hostel Paris",
      "type": "Hostel",
      "description": "Clean and friendly hostel, shared or private rooms available",
      "estimated_cost": 30.00,
      "currency": "USD",
      "booking_link": "https://www.hostelworld.com"
    }
  ]
}

---

## Analytics Endpoints

### 3. Get Analytics Summary

**GET** `/api/analytics/summary`

Returns a high level summary of the user's trip and spending statistics.

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "user_id": 1,
  "summary": {
    "total_trips": 2,
    "total_spent": 2300.00,
    "total_budgets": 2,
    "average_spent_per_trip": 1150.00
  }
}
```

**Empty State Response (200 OK):**
```json
{
  "user_id": 1,
  "summary": {
    "total_trips": 0,
    "total_spent": 0,
    "total_budgets": 0,
    "average_spent_per_trip": 0
  }
}
```

---

### 4. Get Analytics Trips

**GET** `/api/analytics/trips`

Returns a list of all the user's trips with cost details.

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "user_id": 1,
  "total_trips": 2,
  "trips": [
    {
      "id": 1,
      "trip_name": "Paris Trip",
      "destination": "Paris",
      "start_date": "2026-06-01",
      "end_date": "2026-06-10",
      "status": "completed",
      "total_cost": 1500.00
    },
    {
      "id": 2,
      "trip_name": "Tokyo Trip",
      "destination": "Tokyo",
      "start_date": "2026-09-01",
      "end_date": "2026-09-15",
      "status": "planning",
      "total_cost": 800.00
    }
  ]
}
```

**Notes:**
- Trips are ordered by `created_at` descending (most recent first)
- `total_cost` is pulled from the linked budget's `spent_amount`
- Returns empty trips array when user has no trips

---

### 5. Get Analytics Expenses

**GET** `/api/analytics/expenses`

Returns expense breakdown by category across all of the user's budgets.

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "user_id": 1,
  "total_spent": 2300.00,
  "categories": [
    {
      "category": "Accommodation",
      "total_amount": 1300.00,
      "count": 2
    },
    {
      "category": "Food",
      "total_amount": 700.00,
      "count": 2
    },
    {
      "category": "Transport",
      "total_amount": 300.00,
      "count": 1
    }
  ]
}
```

**Notes:**
- Categories are ordered by `total_amount` descending (highest spend first)
- `count` is the number of individual expenses in that category
- Returns empty categories array when user has no expenses
```

---

## Complete API Endpoint Summary (Sprint 4 Additions)

### Protected Endpoints (Require Authentication)

#### Travel and Accommodation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/destinations/:id/travel` | Get travel options for a destination |
| GET | `/api/destinations/:id/accommodations` | Get accommodation options for a destination |

#### Travel and Accommodation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/destinations/:id/travel` | Get travel options for a destination |
| GET | `/api/destinations/:id/accommodations` | Get accommodation options for a destination |

#### Analytics Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/summary` | Get trip and spending summary |
| GET | `/api/analytics/trips` | Get all trips with cost details |
| GET | `/api/analytics/expenses` | Get expense breakdown by category |

---

## Unit Tests

### Test Framework
- **Testing Library:** Go's built-in `testing` package
- **Assertions:** `github.com/stretchr/testify/assert`
- **HTTP Testing:** `net/http/httptest`
- **Framework:** Gin in test mode
- **Database:** In-memory SQLite (`:memory:`)

### Test Coverage

#### Travel Handler Tests (`travel_test.go`)

**Total Tests: 12**

| Test | Description | Status |
|------|-------------|--------|
| Get Travel Options - Success | Returns 200 with 4 options for valid destination | ✅ Pass |
| Verify Travel Options Content | Checks type, booking link, and cost fields | ✅ Pass |
| Get Travel Options - Different Destination | Returns correct destination name for Tokyo | ✅ Pass |
| Get Travel Options - Non-existent Destination | ID 999 returns 404 | ✅ Pass |
| Get Travel Options - Invalid ID | Non-integer ID returns 400 | ✅ Pass |
| Get Accommodation Options - Success | Returns 200 with 4 options for valid destination | ✅ Pass |
| Verify Accommodation Options Content | Checks type, booking link, and cost fields | ✅ Pass |
| Get Accommodation Options - Different Destination | Returns correct destination name for Tokyo | ✅ Pass |
| Get Accommodation Options - Non-existent Destination | ID 999 returns 404 | ✅ Pass |
| Get Accommodation Options - Invalid ID | Non-integer ID returns 400 | ✅ Pass |
| Verify Travel Options Have All Required Fields | All 4 options have name, type, cost, link | ✅ Pass |
| Verify Accommodation Options Have All Required Fields | All 4 options have name, type, cost, link | ✅ Pass |

#### Analytics Handler Tests (`analytics_test.go`)

**Total Tests: 10**

| Test | Description | Status |
|------|-------------|--------|
| Get Summary - Success | Returns correct trip count, total spent and average | ✅ Pass |
| Get Summary - Empty User | Returns zeros when user has no data | ✅ Pass |
| Get Trips - Success | Returns list of 2 trips with correct fields | ✅ Pass |
| Verify Trip Fields | Trip name, status and destination all present | ✅ Pass |
| Get Trips - Empty User | Returns 0 total trips for unknown user | ✅ Pass |
| Get Expenses - Success | Returns correct total spent and categories | ✅ Pass |
| Verify Expense Categories | Category, total amount and count all present | ✅ Pass |
| Verify Categories Ordered by Amount | Highest spend category comes first | ✅ Pass |
| Verify Accommodation is Top Category | Accommodation has highest total spend | ✅ Pass |
| Get Expenses - Empty User | Returns 0 total spent for unknown user | ✅ Pass |

### Running the Tests

```bash
cd backend
go test ./handlers/ -run TestTravelFlow -v

# Run with coverage
go test ./handlers/... -cover
```

### Test Output
=== RUN   TestTravelFlow
--- PASS: TestTravelFlow (0.01s)
PASS
ok      backend/handlers        0.392s

---

## Issues Completed in Sprint 4

- View travel and accommodation options for a destination (#23)
- Analytics dashboard (#36)

---

## Summary

### Features Delivered
1. Travel options per destination with flights, trains and buses
2. Accommodation options per destination with hotels, apartments and hostels
3. Analytics summary showing total trips, total spent and averages
4. Analytics trips list with destination, dates, status and cost
5. Analytics expense breakdown by category ordered by highest spend

### API Endpoints Added
- 2 travel and accommodation endpoints
- 3 analytics dashboard endpoints
- **Total: 5 new endpoints**

### Backend Unit Tests
| File | Tests | Status |
|------|-------|--------|
| `travel_test.go` | 12 | ✅ All Pass |
| `analytics_test.go` | 10 | ✅ All Pass |
| **Total** | **22** | **✅ All Pass** |