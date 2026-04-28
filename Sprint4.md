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

#### 3. **Trip Collaboration — Invite by Email**
- Trip owners can invite one or more users to collaborate on a trip by email address
- Each invite generates a unique UUID token stored in the `trip_invites` table
- Invite tokens expire after 7 days; expiry is enforced on both accept and list endpoints
- Duplicate pending invites to the same email for the same trip are prevented at the DB level
- Users who are already collaborators are identified and skipped with a clear status
- Invite acceptance adds the user to the trip's group members and itinerary collaborators
- A `collaborator_added` notification is fired to the trip owner on acceptance
- Invite statuses (pending / accepted / expired) are visible to the trip owner
- Token values are never exposed in list responses
- Email dispatch is stubbed and ready to connect to SendGrid or any SMTP provider

#### 4. **Destination Category Filtering**
- Destinations can be tagged with a category (e.g. friends, family, couples)
- Category column added to destinations table via a safe `ALTER TABLE` migration on startup
- New destinations can be created with a category via the existing create endpoint
- Users can filter destinations by category using the `category` query parameter
- Category filter composes with existing `budget` and `country` filters
- Omitting the category parameter returns all destinations as before — no breaking change
- Category is included in all destination response objects

#### 5. **Social Follow System**
- Users can follow and unfollow other users
- User profiles show follower count, following count, and whether the caller is following them
- Users can view the full list of their followers and the accounts they follow
- Trip owners can toggle any trip between public and private visibility
- Public trips are visible to all users; private trips are never exposed outside the owner's own endpoints
- Users have a social feed showing recent public trips from accounts they follow
- Feed is paginated (page and limit query parameters, default page 1 limit 20)
- A user's own trips never appear in their own feed
- `visibility` column added to trips table via a safe `ALTER TABLE` migration, defaulting to private
- New `user_follows` table added with a unique constraint on (follower_id, following_id)

### Frontend
 
#### 1. **Category Destinations Component** *(Issue #31)*
- Users can browse popular destinations filtered by trip category (Friends, Family, Couples, Solo, Adventure, Cultural)
- First category is auto-selected on load; switching tabs fetches new results immediately
- Selecting the same category a second time is a no-op (no redundant API call)
- Empty state message shown when no destinations match the selected category
- Error state shown with retry option on API failure
- Each destination card shows name, country, rating (star display), budget, and description
- Stars are calculated from rating value and rendered as filled/empty icons
- Category banner with gradient updates when active tab changes
- Gradient colours are assigned per card index for visual variety
#### 2. **Trip Invite Component** *(Issue #134)*
- Trip owners can type or paste one or more email addresses to invite collaborators
- Emails are staged as removable chips before sending; Enter and comma keys both add a chip
- Duplicate and invalid emails are rejected client-side before submission
- Send button dispatches all staged emails in a single API call
- Per-email result statuses (`invited`, `already_invited`, `already_collaborator`, `invalid_email`, `error`) are displayed after sending
- Invite list table shows all existing invites with status badge (pending / accepted / expired)
- Table reloads automatically after a successful send
- Sending state disables the button and shows a spinner
#### 3. **Accept Invite Component** *(Issue #134)*
- Reads the invite token from the URL query parameter on load
- Calls the accept endpoint and displays one of five outcome states: success, expired, already accepted, already collaborator, not found, or generic error
- Redirects to `/login` if the user is not authenticated (401)
- Navigation buttons let the user go to My Trips or directly to the accepted trip
#### 4. **Feed Component** *(Issue #140)*
- Displays a paginated feed of public trips from followed users
- Loads page 1 on init; Load More button appends subsequent pages
- Trip cards show destination, dates, owner name/initials, status badge, and time-ago label
- Status badge colour and icon vary by trip status (planning, ongoing, completed, cancelled)
- Clicking a trip card navigates to the trip detail page
- Clicking an owner avatar/name navigates to that user's public profile
- Error snack bar shown on feed load failure
#### 5. **Public Profile Component** *(Issue #140)*
- Loads a user's public profile, public trips, followers, and following lists on init
- Follow / Unfollow button updates follower count and `is_following` flag optimistically
- Shows error snack on follow/unfollow failure with the server-provided message
- Navigates to `/feed` on 404 (user not found)
- Detects own profile (`isOwnProfile`) and hides follow button accordingly
- Trip cards and follower/following lists are rendered inline
#### 6. **User Search Component** *(Issue #140)*
- Debounced search input (350 ms) prevents excessive API calls while the user types
- Searches only when query is 2 or more characters; shorter queries clear results immediately
- Whitespace is trimmed before querying
- Results show user name, email, and initials avatar
- Clicking a result navigates to that user's public profile
- Error snack bar shown on search failure

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

---

## Trip Invite Endpoints

### 6. Send Trip Invites

**POST** `/api/trips/:id/invite`

Sends collaboration invites to one or more email addresses for a trip. Only the trip owner can send invites.

**URL Parameters:**
- `id` (integer, required) - Trip ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Request Body:**
```json
{ "emails": ["alice@example.com", "bob@example.com"] }
```

**Response (200 OK):**
```json
{
  "message": "Invites processed",
  "results": [
    { "email": "alice@example.com", "status": "invited" },
    { "email": "bob@example.com",   "status": "already_collaborator" }
  ]
}
```

**Per-email status values:** `invited` | `already_invited` | `already_collaborator` | `invalid_email`

**Error Responses:**

*400 Bad Request:*
```json
{ "error": "validation_error", "message": "emails array is required and must not be empty" }
```

*403 Forbidden:*
```json
{ "error": "forbidden", "message": "Only the trip owner can send invites" }
```

*404 Not Found:*
```json
{ "error": "not_found", "message": "Trip not found" }
```

---

### 7. Accept Trip Invite

**POST** `/api/invites/:token/accept`

Accepts an invite using the token from the invite link. No request body required.

**URL Parameters:**
- `token` (string, required) - Invite token from the invite link

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{ "message": "Invite accepted successfully", "trip_id": 1 }
```

**Error Responses:**

*404 Not Found:*
```json
{ "error": "not_found", "message": "Invite not found" }
```

*410 Gone:*
```json
{ "error": "invite_expired", "message": "This invite link has expired" }
```

*409 Conflict:*
```json
{ "error": "already_accepted", "message": "This invite has already been accepted" }
```

---

### 8. Get Trip Invites

**GET** `/api/trips/:id/invites`

Returns all invites for a trip with their current statuses. Only accessible by the trip owner.

**URL Parameters:**
- `id` (integer, required) - Trip ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "trip_id": 1,
  "invites": [
    {
      "id": 1,
      "trip_id": 1,
      "email": "alice@example.com",
      "status": "pending",
      "expires_at": "2026-05-03T10:00:00Z",
      "created_at": "2026-04-26T10:00:00Z"
    },
    {
      "id": 2,
      "trip_id": 1,
      "email": "bob@example.com",
      "status": "accepted",
      "expires_at": "2026-05-03T09:00:00Z",
      "created_at": "2026-04-26T09:00:00Z"
    }
  ]
}
```

**Notes:**
- Expired pending invites are automatically marked on this request
- Token values are never included in the response

**Error Responses:**

*403 Forbidden:*
```json
{ "error": "forbidden", "message": "Only the trip owner can view invites" }
```

*404 Not Found:*
```json
{ "error": "not_found", "message": "Trip not found" }
```

---

## Destination Category Endpoints

### 9. Get Destinations Filtered by Category

**GET** `/api/auth/destinations?category=<value>`

Returns destinations filtered by travel category. Composes with existing `budget` and `country` filters.

**Query Parameters:**
- `category` (string, optional) - e.g. `friends`, `family`, `couples`
- `budget` (number, optional) - Maximum budget filter
- `country` (string, optional) - Country filter

**Request Headers:**
Authorization: Bearer <jwt_token>

**Example Requests:**
```
GET /api/auth/destinations?category=friends
GET /api/auth/destinations?category=couples&budget=6000
GET /api/auth/destinations?category=family&country=USA
GET /api/auth/destinations  (no filter — returns all)
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Bali",
    "country": "Indonesia",
    "budget": 2000.00,
    "description": "Island paradise",
    "is_bookmarked": false,
    "category": "friends"
  },
  {
    "id": 4,
    "name": "Ibiza",
    "country": "Spain",
    "budget": 2500.00,
    "description": "Party island",
    "is_bookmarked": false,
    "category": "friends"
  }
]
```

**Notes:**
- Returns empty array `[]` when no destinations match — not an error
- Omitting `category` returns all destinations (no breaking change to existing behaviour)
- `category` is also returned in all destination response objects including `GetDestinationByID`

### 10. Create Destination with Category

**POST** `/api/destinations`

Category field added to the existing create destination endpoint.

**Request Body:**
```json
{
  "name": "Bali",
  "country": "Indonesia",
  "budget": 2000,
  "description": "Island paradise",
  "category": "friends"
}
```

**Response (200 OK):**
```json
{ "message": "Destination created successfully" }
```

**Notes:**
- `category` is optional — omitting it stores NULL and the destination appears in unfiltered results only

---

## Social Follow Endpoints

### 11. Follow a User

**POST** `/api/users/:id/follow`

Follow another user.

**URL Parameters:**
- `id` (integer, required) - ID of the user to follow

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{ "message": "User followed successfully" }
```

**Error Responses:**

*400 Bad Request:*
```json
{ "error": "bad_request", "message": "Cannot follow yourself" }
```

*404 Not Found:*
```json
{ "error": "not_found", "message": "User not found" }
```

*409 Conflict:*
```json
{ "error": "conflict", "message": "Already following this user" }
```

---

### 12. Unfollow a User

**DELETE** `/api/users/:id/follow`

Unfollow a user you currently follow.

**URL Parameters:**
- `id` (integer, required) - ID of the user to unfollow

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{ "message": "User unfollowed successfully" }
```

**Error Responses:**

*404 Not Found:*
```json
{ "error": "not_found", "message": "Follow relationship not found" }
```

---

### 13. Get Public Profile

**GET** `/api/users/:id/profile`

Returns a user's public profile including follower and following counts and whether the caller follows them.

**URL Parameters:**
- `id` (integer, required) - User ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "id": 2,
  "first_name": "Bob",
  "last_name": "B",
  "follower_count": 3,
  "following_count": 1,
  "is_following": true
}
```

**Error Responses:**

*404 Not Found:*
```json
{ "error": "not_found", "message": "User not found" }
```

---

### 14. Get Followers

**GET** `/api/users/:id/followers`

Returns the list of users who follow the given user.

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "followers": [
    { "id": 1, "first_name": "Alice", "last_name": "A" },
    { "id": 3, "first_name": "Carol", "last_name": "C" }
  ]
}
```

---

### 15. Get Following

**GET** `/api/users/:id/following`

Returns the list of users that the given user follows.

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "following": [
    { "id": 2, "first_name": "Bob",   "last_name": "B" },
    { "id": 3, "first_name": "Carol", "last_name": "C" }
  ]
}
```

---

### 16. Update Trip Visibility

**PUT** `/api/trips/:id/visibility`

Toggle a trip between public and private. Only the trip owner can change visibility.

**URL Parameters:**
- `id` (integer, required) - Trip ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Request Body:**
```json
{ "visibility": "public" }
```

**Response (200 OK):**
```json
{ "message": "Visibility updated", "visibility": "public" }
```

**Error Responses:**

*400 Bad Request:*
```json
{ "error": "validation_error", "message": "visibility must be 'public' or 'private'" }
```

*404 Not Found:*
```json
{ "error": "not_found", "message": "Trip not found" }
```

---

### 17. Get Public Trips for a User

**GET** `/api/users/:id/trips`

Returns only the public trips for a given user. Private trips are never included regardless of the caller.

**URL Parameters:**
- `id` (integer, required) - User ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "trips": [
    {
      "trip_id": 3,
      "trip_name": "Bob Public Trip",
      "destination": "Tokyo",
      "start_date": "",
      "end_date": "",
      "status": "planning",
      "visibility": "public",
      "created_at": "2026-04-26T19:00:00Z",
      "updated_at": "2026-04-26T19:00:00Z",
      "owner_id": 2,
      "owner_name": "Bob B"
    }
  ]
}
```

**Error Responses:**

*404 Not Found:*
```json
{ "error": "not_found", "message": "User not found" }
```

---

### 18. Get Social Feed

**GET** `/api/feed`

Returns a paginated list of public trips from users the caller follows, ordered by most recently created.

**Query Parameters:**
- `page` (integer, optional) - Page number, default 1
- `limit` (integer, optional) - Results per page, default 20, max 100

**Request Headers:**
Authorization: Bearer <jwt_token>

**Example Request:**
```
GET /api/feed?page=1&limit=20
```

**Response (200 OK):**
```json
{
  "feed": [
    {
      "trip_id": 3,
      "trip_name": "Bob Public Trip",
      "destination": "Tokyo",
      "start_date": "",
      "end_date": "",
      "status": "planning",
      "visibility": "public",
      "created_at": "2026-04-26T19:00:00Z",
      "updated_at": "2026-04-26T19:00:00Z",
      "owner_id": 2,
      "owner_name": "Bob B"
    }
  ],
  "page": 1,
  "limit": 20
}
```

**Notes:**
- Returns empty feed array when not following anyone or followed users have no public trips
- A user's own trips never appear in their own feed
- Private trips are never included regardless of follow status

---

## Complete API Endpoint Summary (Sprint 4 Additions)

### Protected Endpoints (Require Authentication)

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

#### Trip Invites
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trips/:id/invite` | Send collaboration invites by email |
| POST | `/api/invites/:token/accept` | Accept an invite via token |
| GET | `/api/trips/:id/invites` | Get all invites for a trip (owner only) |

#### Destination Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/destinations?category=` | Filter destinations by category |
| POST | `/api/destinations` | Create destination (now includes category field) |

#### Social Follow System
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/:id/follow` | Follow a user |
| DELETE | `/api/users/:id/follow` | Unfollow a user |
| GET | `/api/users/:id/profile` | Get public profile with follow counts |
| GET | `/api/users/:id/followers` | Get list of followers |
| GET | `/api/users/:id/following` | Get list of following |
| PUT | `/api/trips/:id/visibility` | Set trip public or private |
| GET | `/api/users/:id/trips` | Get public trips for a user |
| GET | `/api/feed` | Get paginated social feed |

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

#### Invite Handler Tests (`invite_test.go`)

**Total Tests: 20**

| Test | Description | Status |
|------|-------------|--------|
| Send Invites - Success | Returns 200 with invited status for new email | ✅ Pass |
| Send Invites - Multiple Emails | All emails processed and returned in results | ✅ Pass |
| Send Invites - Trip Not Found | Returns 404 for non-existent trip | ✅ Pass |
| Send Invites - Not Owner | Returns 403 when caller does not own the trip | ✅ Pass |
| Send Invites - Empty Emails Array | Returns 400 for empty array | ✅ Pass |
| Send Invites - Missing Body | Returns 400 for missing request body | ✅ Pass |
| Send Invites - Invalid Email Format | Returns invalid_email status per entry | ✅ Pass |
| Send Invites - Duplicate Prevented | Returns already_invited on second attempt | ✅ Pass |
| Send Invites - Already Collaborator | Returns already_collaborator status | ✅ Pass |
| Send Invites - Mixed Results | Correctly handles mix of valid, invalid, duplicate emails | ✅ Pass |
| Accept Invite - Success | Returns 200 and trip_id | ✅ Pass |
| Accept Invite - Status Updated | DB row status becomes accepted | ✅ Pass |
| Accept Invite - Token Not Found | Returns 404 for unknown token | ✅ Pass |
| Accept Invite - Expired Token | Returns 410 for stored expired status | ✅ Pass |
| Accept Invite - Expired by Time | Returns 410 when past expiry timestamp | ✅ Pass |
| Accept Invite - Already Accepted | Returns 409 for already accepted invite | ✅ Pass |
| Accept Invite - Already Collaborator | Returns 409 if user is already a collaborator | ✅ Pass |
| Accept Invite - Notification Fired | Owner receives collaborator_added notification | ✅ Pass |
| Get Trip Invites - Success | Returns all invites for the trip | ✅ Pass |
| Get Trip Invites - Empty List | Returns empty array when no invites exist | ✅ Pass |
| Get Trip Invites - Trip Not Found | Returns 404 for non-existent trip | ✅ Pass |
| Get Trip Invites - Not Owner | Returns 403 for non-owner caller | ✅ Pass |
| Get Trip Invites - Expired Auto Marked | Stale pending invites marked expired on read | ✅ Pass |
| Get Trip Invites - Token Not Exposed | Token value absent from response body | ✅ Pass |

#### Destination Category Tests (`destination_test.go` — additions)

**Total New Tests: 7**

| Test | Description | Status |
|------|-------------|--------|
| Filter by Category - Friends | Returns only friends-category destinations | ✅ Pass |
| Filter by Category - Couples | Returns only couples-category destinations | ✅ Pass |
| Filter by Category - Family | Returns only family-category destinations | ✅ Pass |
| Filter by Category - No Match | Returns empty array for unknown category | ✅ Pass |
| No Category - Returns All | Omitting filter returns all destinations | ✅ Pass |
| Category and Country Combined | Correctly combines two filters | ✅ Pass |
| Category and Budget Combined | Correctly combines category and budget filters | ✅ Pass |

#### Social Handler Tests (`social_test.go`)

**Total Tests: 28**

| Test | Description | Status |
|------|-------------|--------|
| Follow User - Success | Returns 200 and inserts row | ✅ Pass |
| Follow User - Row Inserted | Confirms DB row created | ✅ Pass |
| Follow User - Cannot Follow Self | Returns 400 | ✅ Pass |
| Follow User - User Not Found | Returns 404 | ✅ Pass |
| Follow User - Already Following | Returns 409 | ✅ Pass |
| Unfollow User - Success | Returns 200 and removes row | ✅ Pass |
| Unfollow User - Row Removed | Confirms DB row deleted | ✅ Pass |
| Unfollow User - Not Following | Returns 404 | ✅ Pass |
| Get Public Profile - Success | Returns name, correct counts, is_following true | ✅ Pass |
| Get Public Profile - Is Following False | Returns is_following false when not following | ✅ Pass |
| Get Public Profile - Not Found | Returns 404 | ✅ Pass |
| Get Public Profile - Zero Counts | Returns 0 for both counts when no follows exist | ✅ Pass |
| Get Followers - Success | Returns correct list of followers | ✅ Pass |
| Get Followers - Empty | Returns empty array | ✅ Pass |
| Get Following - Success | Returns correct list of following | ✅ Pass |
| Get Following - Empty | Returns empty array | ✅ Pass |
| Update Visibility - Set Public | DB value updated to public | ✅ Pass |
| Update Visibility - Set Private | DB value updated to private | ✅ Pass |
| Update Visibility - Invalid Value | Returns 400 | ✅ Pass |
| Update Visibility - Missing Body | Returns 400 | ✅ Pass |
| Update Visibility - Not Owner | Returns 404 | ✅ Pass |
| Update Visibility - Trip Not Found | Returns 404 | ✅ Pass |
| Get Public Trips - Only Public | Private trips excluded from response | ✅ Pass |
| Get Public Trips - Private Trip Hidden | Private trip name absent from response | ✅ Pass |
| Get Public Trips - Empty When All Private | Returns empty array | ✅ Pass |
| Get Public Trips - User Not Found | Returns 404 | ✅ Pass |
| Get Feed - Shows Public Trips From Followed | Returns correct trip in feed | ✅ Pass |
| Get Feed - Empty When Not Following | Returns empty feed | ✅ Pass |
| Get Feed - Private Trip Not In Feed | Private trips excluded from feed | ✅ Pass |
| Get Feed - Multiple Followed | Returns trips from all followed users | ✅ Pass |
| Get Feed - Pagination Default Values | Returns page 1 and limit 20 | ✅ Pass |
| Get Feed - Own Trip Not In Feed | Caller's own trips absent from feed | ✅ Pass |

### Running the Tests

```bash
cd backend
go test ./handlers/... -v

# Run with coverage
go test ./handlers/... -cover
```

---

## Frontend Unit Tests
 
### Test Framework
- **Testing Library:** Vitest + Angular Testing Utilities
- **Component Testing:** `TestBed`, `ComponentFixture`
- **Async:** `async/await` with `fixture.whenStable()`
- **Timers:** `vi.useFakeTimers()` for debounce tests
- **Mocking:** `vi.fn()`, `vi.spyOn()`
### Test Coverage
 
#### Accept Invite Component Tests (`accept-invite.spec.ts`)
 
**Total Tests: 11**
 
| Test | Description | Status |
|------|-------------|--------|
| should show success state when invite accepted | Renders success UI after 200 response | ✅ Pass |
| should call acceptInvite with token from route | Token extracted from URL query param | ✅ Pass |
| should show expired state on 410 invite_expired | Expired state shown on 410 | ✅ Pass |
| should show already_accepted state on 409 already_accepted | Conflict state shown correctly | ✅ Pass |
| should show already_collaborator state on 409 already_collaborator | Already collaborator state shown | ✅ Pass |
| should show not_found state on 404 | Not found state shown on 404 | ✅ Pass |
| should show error state on generic 500 | Generic error state on 500 | ✅ Pass |
| should show error state when no token in URL | Error shown when token missing | ✅ Pass |
| should redirect to /login on 401 | Navigates to login on unauthenticated | ✅ Pass |
| goToMyTrips navigates to /my-trips | Navigation helper works | ✅ Pass |
| goToTrip navigates to /my-trips when tripId is set | Trip-specific navigation works | ✅ Pass |
 
#### Category Destinations Component Tests (`category-destinations.spec.ts`)
 
**Total Tests: 29**
 
| Test | Description | Status |
|------|-------------|--------|
| should create | Component initialises | ✅ Pass |
| should expose all 6 TRIP_CATEGORIES | All categories present | ✅ Pass |
| should pre-select the first category on init | Default selection correct | ✅ Pass |
| should call getDestinationsByCategory with first category key on init | Init fetch triggered | ✅ Pass |
| should populate destinations after init | Destinations populated from API | ✅ Pass |
| should set loading=false after successful load | Loading cleared on success | ✅ Pass |
| should set error=false after successful load | Error cleared on success | ✅ Pass |
| selectCategory: should update selectedCategory | Tab selection updates state | ✅ Pass |
| selectCategory: should call getDestinationsByCategory with new key | Fetch triggered on tab change | ✅ Pass |
| selectCategory: should NOT re-fetch if same category is selected | Duplicate fetch prevented | ✅ Pass |
| selectCategory: should replace destinations with new results | Results replaced on tab change | ✅ Pass |
| should set destinations=[] when API returns empty array | Empty state handled | ✅ Pass |
| should render empty-state element when no destinations | Empty state UI shown | ✅ Pass |
| should set error=true on HTTP error | Error flag set on failure | ✅ Pass |
| should set loading=false on HTTP error | Loading cleared on failure | ✅ Pass |
| should render error-state element on failure | Error UI shown | ✅ Pass |
| should render destination cards in the grid | Cards rendered | ✅ Pass |
| should render correct destination name in card | Card content correct | ✅ Pass |
| should render category banner for selected category | Banner updates on selection | ✅ Pass |
| should render all category tabs | All tabs rendered | ✅ Pass |
| getStars: should return 5 elements | Star array length correct | ✅ Pass |
| getStars: should fill correct number of stars for rating 4 | 4 filled stars for rating 4 | ✅ Pass |
| getStars: should round rating for star fill (4.6 → 5 filled) | Rounding works | ✅ Pass |
| getStars: should return 0 filled for rating 0 | Zero rating handled | ✅ Pass |
| getStars: defaults to 0 when no rating provided | Missing rating handled | ✅ Pass |
| getCategoryGradient: should return gradient for known key | Gradient returned correctly | ✅ Pass |
| getCategoryGradient: should return fallback for unknown key | Fallback gradient used | ✅ Pass |
| getCardGradient: should cycle through gradient array | Gradient cycling works | ✅ Pass |
| getCardGradient: should return different gradients for different indices | Different indices get different gradients | ✅ Pass |
 
#### Feed Component Tests (`feed.spec.ts`)
 
**Total Tests: 20**
 
| Test | Description | Status |
|------|-------------|--------|
| should create the component | Component initialises | ✅ Pass |
| should load feed on init | getFeed called with page 1 limit 20 | ✅ Pass |
| should set loading to false after feed loads | Loading cleared on success | ✅ Pass |
| should show error snack on feed load failure | Snack shown on error | ✅ Pass |
| should set loading to false on error | Loading cleared on failure | ✅ Pass |
| should set hasMore true when feed length equals limit | Pagination flag set | ✅ Pass |
| should set hasMore false when feed length is less than limit | No more pages flagged | ✅ Pass |
| loadMore should increment page and append trips | Page increments, trips appended | ✅ Pass |
| viewTrip navigates to trip detail | Navigation to trip page works | ✅ Pass |
| viewProfile navigates to user profile | Navigation to profile works | ✅ Pass |
| getStatusColor returns correct color for planning | Status colour correct | ✅ Pass |
| getStatusColor returns warn for cancelled | Cancelled colour correct | ✅ Pass |
| getStatusIcon returns correct icon for ongoing | Ongoing icon correct | ✅ Pass |
| getStatusIcon returns check_circle for completed | Completed icon correct | ✅ Pass |
| getInitials returns correct initials | Initials computed correctly | ✅ Pass |
| formatDate returns empty string for empty input | Empty date handled | ✅ Pass |
| timeAgo returns "Today" for recent date | Today label shown | ✅ Pass |
| timeAgo returns "Yesterday" for yesterday | Yesterday label shown | ✅ Pass |
| loadFeed with reset clears existing feed | Reset replaces feed | ✅ Pass |
| currentUserId is set from auth service | Auth user ID wired correctly | ✅ Pass |
 
#### Public Profile Component Tests (`public-profile.spec.ts`)
 
**Total Tests: 20**
 
| Test | Description | Status |
|------|-------------|--------|
| should create | Component initialises | ✅ Pass |
| should load profile on init | getPublicProfile called with user ID | ✅ Pass |
| should load public trips on init | getPublicTripsForUser called | ✅ Pass |
| should load followers and following on init | Both lists fetched | ✅ Pass |
| should set loading to false after load | Loading cleared on success | ✅ Pass |
| should detect own profile correctly | isOwnProfile false when IDs differ | ✅ Pass |
| should navigate to feed on 404 | Redirects to /feed on not found | ✅ Pass |
| should show snack on generic load error | Snack shown on 500 | ✅ Pass |
| toggleFollow should call followUser when not following | Follow API called | ✅ Pass |
| toggleFollow should call unfollowUser when following | Unfollow API called | ✅ Pass |
| toggleFollow increments follower_count when following | Count incremented optimistically | ✅ Pass |
| toggleFollow decrements follower_count when unfollowing | Count decremented optimistically | ✅ Pass |
| toggleFollow shows snack on error | Error message from server shown | ✅ Pass |
| getInitials returns correct value | Two-letter initials correct | ✅ Pass |
| getInitials handles empty strings | Empty input returns empty string | ✅ Pass |
| formatDate returns empty for empty input | Empty date handled | ✅ Pass |
| getStatusClass returns correct class | CSS class correct per status | ✅ Pass |
| viewTrip navigates correctly | Trip navigation uses owner ID | ✅ Pass |
| navigateToProfile navigates correctly | Profile navigation works | ✅ Pass |
| goToMyProfile navigates to /profile | Own profile link works | ✅ Pass |
 
#### Trip Invite Component Tests (`trip-invite.spec.ts`)
 
**Total Tests: 25**
 
| Test | Description | Status |
|------|-------------|--------|
| should create the component | Component initialises | ✅ Pass |
| should call getInvites on init | Invite list fetched on load | ✅ Pass |
| should show empty state when no invites returned | Empty table state shown | ✅ Pass |
| should render pending invite row with correct status badge | Pending badge displayed | ✅ Pass |
| should render accepted invite | Accepted badge displayed | ✅ Pass |
| should render expired invite | Expired badge displayed | ✅ Pass |
| should add valid email to stagedEmails | Email chip added | ✅ Pass |
| should not add duplicate email to stagedEmails | Duplicate rejected | ✅ Pass |
| should not add invalid email | Invalid format rejected | ✅ Pass |
| should remove email chip on removeEmail() | Chip removed correctly | ✅ Pass |
| should add email on Enter keydown | Enter key adds chip | ✅ Pass |
| should add email on comma keydown | Comma key adds chip | ✅ Pass |
| should call sendInvites with staged emails | API called with email array | ✅ Pass |
| should clear stagedEmails after successful send | Chips cleared after send | ✅ Pass |
| should populate lastResults after send | Per-email results shown | ✅ Pass |
| should not call sendInvites when no staged emails and input empty | Empty send prevented | ✅ Pass |
| should set sending=false on HTTP error | Sending flag cleared on error | ✅ Pass |
| should reload invites after successful send | Invite list refreshed | ✅ Pass |
| getStatusIcon returns correct icons | Icon per status correct | ✅ Pass |
| getStatusLabel returns correct labels | Label per status correct | ✅ Pass |
| getResultLabel maps all result statuses | All result labels mapped | ✅ Pass |
| isResultSuccess returns true only for invited | Success predicate correct | ✅ Pass |
| isResultWarning returns true for already_invited and already_collaborator | Warning predicate correct | ✅ Pass |
| isResultError returns true for invalid_email and error | Error predicate correct | ✅ Pass |
| formatExpiry returns localized date string | Expiry date formatted | ✅ Pass |
 
#### User Search Component Tests (`user-search.spec.ts`)
 
**Total Tests: 24**
 
| Test | Description | Status |
|------|-------------|--------|
| should create | Component initialises | ✅ Pass |
| should start with empty query | Initial query is empty | ✅ Pass |
| should start with empty results | Initial results array empty | ✅ Pass |
| should start with loading=false | Loading false initially | ✅ Pass |
| should start with searched=false | Searched false initially | ✅ Pass |
| runSearch: calls searchUsers with trimmed query | API called with trimmed string | ✅ Pass |
| runSearch: sets results from response | Results populated | ✅ Pass |
| runSearch: sets loading=false after success | Loading cleared on success | ✅ Pass |
| runSearch: sets searched=true after call | Searched flag set | ✅ Pass |
| runSearch: sets loading=true at start (synchronous mock resolves immediately) | Service invoked | ✅ Pass |
| runSearch: sets loading=false on HTTP error | Loading cleared on error | ✅ Pass |
| runSearch: shows snack on error | Error snack shown | ✅ Pass |
| runSearch: returns empty results on empty response | Empty results handled | ✅ Pass |
| onQueryChange: does not search immediately (debounced) | No call before 350 ms | ✅ Pass |
| onQueryChange: does not search when query < 2 chars after debounce | Short query skipped | ✅ Pass |
| onQueryChange: clears results when query < 2 chars after debounce | Results cleared for short query | ✅ Pass |
| onQueryChange: fires search after 350ms debounce with valid query | Search fires exactly at 350 ms | ✅ Pass |
| onQueryChange: trims whitespace before searching | Whitespace trimmed | ✅ Pass |
| viewProfile: navigates to /users/:id/profile | Profile navigation works | ✅ Pass |
| goToFeed: navigates to /feed | Feed navigation works | ✅ Pass |
| getInitials: returns uppercase two-letter initials | Initials computed correctly | ✅ Pass |
| getInitials: returns single letter when last name missing | Single initial handled | ✅ Pass |
| getInitials: returns empty string for both empty | Empty input handled | ✅ Pass |
| getInitials: handles undefined gracefully | Undefined input handled | ✅ Pass |
 
#### Social Service Tests (`social.service.spec.ts`)
 
**Total Tests: 18**
 
| Test | Description | Status |
|------|-------------|--------|
| followUser sends POST to correct URL | Follow endpoint called | ✅ Pass |
| followUser passes empty body | Empty body sent | ✅ Pass |
| unfollowUser sends DELETE to correct URL | Unfollow endpoint called | ✅ Pass |
| unfollowUser uses correct user id in URL | User ID in URL correct | ✅ Pass |
| getPublicProfile sends GET to correct URL | Profile endpoint called | ✅ Pass |
| getPublicProfile returns is_following flag | is_following returned | ✅ Pass |
| getFollowers sends GET to correct URL | Followers endpoint called | ✅ Pass |
| getFollowers returns empty array when no followers | Empty followers handled | ✅ Pass |
| getFollowing sends GET to correct URL | Following endpoint called | ✅ Pass |
| getFollowing returns list of followed users | Following list returned | ✅ Pass |
| getPublicTripsForUser sends GET to correct URL | Public trips endpoint called | ✅ Pass |
| getPublicTripsForUser returns empty list when no public trips | Empty trips handled | ✅ Pass |
| getFeed sends GET with default pagination | Default page/limit sent | ✅ Pass |
| getFeed sends GET with custom pagination | Custom page/limit sent | ✅ Pass |
| getFeed returns trip cards with owner info | Feed trip shape correct | ✅ Pass |
| updateTripVisibility sends PUT to correct URL | Visibility endpoint called | ✅ Pass |
| updateTripVisibility sends correct body for private | Private body correct | ✅ Pass |
| updateTripVisibility sends correct body for public | Public body correct | ✅ Pass |
 
### Frontend Unit Test Summary
 
| File | Tests | Status |
|------|-------|--------|
| `accept-invite.spec.ts` | 11 | ✅ All Pass |
| `category-destinations.spec.ts` | 29 | ✅ All Pass |
| `feed.spec.ts` | 20 | ✅ All Pass |
| `public-profile.spec.ts` | 20 | ✅ All Pass |
| `trip-invite.spec.ts` | 25 | ✅ All Pass |
| `user-search.spec.ts` | 24 | ✅ All Pass |
| `social.service.spec.ts` | 18 | ✅ All Pass |
| **Total** | **147** | **✅ All Pass** |

### Running Frontend Unit Tests
```bash
cd frontend/destplanner-frontend

# Run all unit tests
ng test
```

----

## Issues Completed in Sprint 4
 
### Backend
- View travel and accommodation options for a destination (#23)
- Analytics dashboard (#36)
- Trip collaboration — invite members by email (#134)
- Destination category filtering (#31)
- Social follow system with public trip feed (#140)
### Frontend
- View popular destinations by trip type — Category Destinations component (#31)
- Trip collaboration: invite members by email — Trip Invite + Accept Invite components (#134)
- Follow other travelers and view their public trips — Feed, Public Profile, User Search components (#140)
---

## Summary

### Features Delivered

#### Backend
1. Travel options per destination with flights, trains and buses
2. Accommodation options per destination with hotels, apartments and hostels
3. Analytics summary showing total trips, total spent and averages
4. Analytics trips list with destination, dates, status and cost
5. Analytics expense breakdown by category ordered by highest spend
6. Trip collaboration invites with token-based email flow and expiry
7. Destination category filtering composable with existing filters
8. Social follow system with public profiles, follow lists, visibility control and paginated feed

#### Frontend
1. Category Destinations — browse and filter destinations by trip type with star ratings and gradients
2. Trip Invite — stage and send email invitations with per-result status feedback and invite table
3. Accept Invite — token-based accept flow with five outcome states and redirect logic
4. Feed — paginated public trip feed from followed users with status badges and time-ago labels
5. Public Profile — follow/unfollow with optimistic count updates and public trip display
6. User Search — debounced search with result cards and profile navigation

### API Endpoints Added
- 2 travel and accommodation endpoints
- 3 analytics dashboard endpoints
- 3 trip invite endpoints
- 2 destination category endpoints
- 8 social follow endpoints
- **Total: 18 new endpoints**

### Backend Unit Tests
| File | Tests | Status |
|------|-------|--------|
| `travel_test.go` | 12 | ✅ All Pass |
| `analytics_test.go` | 10 | ✅ All Pass |
| `invite_test.go` | 20 | ✅ All Pass |
| `destination_test.go` (additions) | 7 | ✅ All Pass |
| `social_test.go` | 28 | ✅ All Pass |
| **Total** | **77** | **✅ All Pass** |

### Frontend Unit Tests
| File | Tests | Status |
|------|-------|--------|
| `accept-invite.spec.ts` | 11 | ✅ All Pass |
| `category-destinations.spec.ts` | 29 | ✅ All Pass |
| `feed.spec.ts` | 20 | ✅ All Pass |
| `public-profile.spec.ts` | 20 | ✅ All Pass |
| `trip-invite.spec.ts` | 25 | ✅ All Pass |
| `user-search.spec.ts` | 24 | ✅ All Pass |
| `social.service.spec.ts` | 18 | ✅ All Pass |
| **Total** | **147** | **✅ All Pass** |
 

### Database Changes
| Change | Type | Safe on Existing DB |
|--------|------|-------------------|
| `trip_invites` table | New table | ✅ CREATE IF NOT EXISTS |
| `user_follows` table | New table | ✅ CREATE IF NOT EXISTS |
| `destinations.category` | New column | ✅ ALTER TABLE (silent if exists) |
| `trips.visibility` | New column | ✅ ALTER TABLE (silent if exists) |