# Sprint 3 - DestPlanner

## Sprint Overview
**Duration:** Sprint 3  
**Focus:** New Features, Extended API, Unit Testing  
**Team:** Frontend (Angular) + Backend (Go)

---

## Work Completed in Sprint 3

### Backend

#### 1. **Destination Reviews & Ratings Feature**
- Users can submit a rating (1–5 stars) and written review for a destination
- Duplicate review prevention — one review per user per destination
- Users can edit and delete only their own reviews
- Get all reviews for a destination with average rating and total count
- Reviewer name included in response (first name + last name)
- Ownership validation — forbidden response when editing/deleting another user's review
- Added `reviews` database table

#### 2. **Destination Activities Feature**
- View all popular activities and attractions for a destination
- Add new activities to a destination
- Update existing activity details (name, description, category)
- Delete activities
- Friendly empty list response when no activities exist
- Destination existence validation on all endpoints
- Added `activities` database table

---

## Backend API Documentation

### Base URL

http://localhost:8080

### Authentication
All review endpoints require JWT authentication via the Authorization header:

Authorization: Bearer <your_jwt_token>

---

## Review Endpoints

### 1. Create Review

**POST** `/api/destinations/:id/reviews`

Submit a rating and review for a destination.

**URL Parameters:**
- `id` (integer, required) - Destination ID

**Request Headers:**
Authorization: Bearer <jwt_token>
Content-Type: application/json

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Amazing place, would visit again!"
}
```

**Field Descriptions:**
- `rating` (integer, required) - Rating from 1 to 5
- `comment` (string, required) - Written review text

**Response (201 Created):**
```json
{
  "message": "Review created successfully",
  "review_id": 1
}
```

**Error Responses:**

*400 Bad Request - Invalid rating:*
```json
{
  "error": "validation_error",
  "message": "Rating must be between 1 and 5"
}
```

*400 Bad Request - Missing comment:*
```json
{
  "error": "validation_error",
  "message": "Comment is required"
}
```

*400 Bad Request - Already reviewed:*
```json
{
  "error": "already_exists",
  "message": "You have already reviewed this destination"
}
```

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Destination not found"
}
```

---

### 2. Get Reviews for a Destination

**GET** `/api/destinations/:id/reviews`

Get all reviews for a destination including average rating.

**URL Parameters:**
- `id` (integer, required) - Destination ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "destination_id": 1,
  "average_rating": 4.5,
  "total_reviews": 2,
  "reviews": [
    {
      "id": 1,
      "destination_id": 1,
      "user_id": 1,
      "reviewer_name": "Alice Smith",
      "rating": 5,
      "comment": "Amazing place, would visit again!",
      "created_at": "2026-04-08T10:00:00Z",
      "updated_at": "2026-04-08T10:00:00Z"
    },
    {
      "id": 2,
      "destination_id": 1,
      "user_id": 2,
      "reviewer_name": "Bob Jones",
      "rating": 4,
      "comment": "Great city, a bit expensive.",
      "created_at": "2026-04-08T11:00:00Z",
      "updated_at": "2026-04-08T11:00:00Z"
    }
  ]
}
```

**Notes:**
- Reviews are ordered by `created_at` descending (most recent first)
- `average_rating` returns `0.0` when no reviews exist
- `reviews` returns an empty array when no reviews exist

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Destination not found"
}
```

---

### 3. Update Review

**PUT** `/api/destinations/:id/reviews/:reviewId`

Update your own review for a destination.

**URL Parameters:**
- `id` (integer, required) - Destination ID
- `reviewId` (integer, required) - Review ID

**Request Headers:**
Authorization: Bearer <jwt_token>
Content-Type: application/json

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Great place, updated my thoughts after a second visit."
}
```

**Response (200 OK):**
```json
{
  "message": "Review updated successfully"
}
```

**Error Responses:**

*400 Bad Request - Invalid rating:*
```json
{
  "error": "validation_error",
  "message": "Rating must be between 1 and 5"
}
```

*403 Forbidden - Not your review:*
```json
{
  "error": "forbidden",
  "message": "You can only edit your own reviews"
}
```

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Review not found"
}
```

---

### 4. Delete Review

**DELETE** `/api/destinations/:id/reviews/:reviewId`

Delete your own review.

**URL Parameters:**
- `id` (integer, required) - Destination ID
- `reviewId` (integer, required) - Review ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "message": "Review deleted successfully"
}
```

**Error Responses:**

*403 Forbidden - Not your review:*
```json
{
  "error": "forbidden",
  "message": "You can only delete your own reviews"
}
```

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Review not found"
}
```
---

## Activity Endpoints

### 5. Get Activities for a Destination

**GET** `/api/destinations/:id/activities`

Get all activities and attractions for a destination.

**URL Parameters:**
- `id` (integer, required) - Destination ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "destination_id": 1,
  "total_activities": 2,
  "activities": [
    {
      "id": 1,
      "destination_id": 1,
      "name": "Eiffel Tower Visit",
      "description": "Visit the iconic tower",
      "category": "Sightseeing",
      "created_at": "2026-04-08T10:00:00Z",
      "updated_at": "2026-04-08T10:00:00Z"
    },
    {
      "id": 2,
      "destination_id": 1,
      "name": "Louvre Museum",
      "description": "World famous art museum",
      "category": "Culture",
      "created_at": "2026-04-08T11:00:00Z",
      "updated_at": "2026-04-08T11:00:00Z"
    }
  ]
}
```

**Notes:**
- Activities are ordered alphabetically by name
- Returns empty array with `total_activities: 0` when none exist

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Destination not found"
}
```

---

### 6. Create Activity

**POST** `/api/destinations/:id/activities`

Add a new activity or attraction for a destination.

**URL Parameters:**
- `id` (integer, required) - Destination ID

**Request Headers:**
Authorization: Bearer <jwt_token>
Content-Type: application/json

**Request Body:**
```json
{
  "name": "Eiffel Tower Visit",
  "description": "Visit the iconic tower",
  "category": "Sightseeing"
}
```

**Field Descriptions:**
- `name` (string, required) - Name of the activity
- `description` (string, optional) - Brief description
- `category` (string, optional) - Category e.g. Sightseeing, Culture, Food, Adventure

**Response (201 Created):**
```json
{
  "message": "Activity created successfully",
  "activity_id": 1
}
```

**Error Responses:**

*400 Bad Request - Missing name:*
```json
{
  "error": "validation_error",
  "message": "Activity name is required"
}
```

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Destination not found"
}
```

---

### 7. Update Activity

**PUT** `/api/destinations/:id/activities/:activityId`

Update an existing activity.

**URL Parameters:**
- `id` (integer, required) - Destination ID
- `activityId` (integer, required) - Activity ID

**Request Headers:**
Authorization: Bearer <jwt_token>
Content-Type: application/json

**Request Body:**
```json
{
  "name": "Eiffel Tower Night Visit",
  "description": "Visit the tower at night for stunning views",
  "category": "Sightseeing"
}
```

**Response (200 OK):**
```json
{
  "message": "Activity updated successfully"
}
```

**Error Responses:**

*400 Bad Request - Missing name:*
```json
{
  "error": "validation_error",
  "message": "Activity name is required"
}
```

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Activity not found"
}
```

---

### 8. Delete Activity

**DELETE** `/api/destinations/:id/activities/:activityId`

Delete an activity.

**URL Parameters:**
- `id` (integer, required) - Destination ID
- `activityId` (integer, required) - Activity ID

**Request Headers:**
Authorization: Bearer <jwt_token>

**Response (200 OK):**
```json
{
  "message": "Activity deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Activity not found"
}
```

---

## Complete API Endpoint Summary (Sprint 3 Additions)

### Protected Endpoints (Require Authentication)

#### Destination Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/destinations/:id/reviews` | Submit a review for a destination |
| GET | `/api/destinations/:id/reviews` | Get all reviews and average rating |
| PUT | `/api/destinations/:id/reviews/:reviewId` | Update your own review |
| DELETE | `/api/destinations/:id/reviews/:reviewId` | Delete your own review |

#### Destination Activities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/destinations/:id/activities` | Get all activities for a destination |
| POST | `/api/destinations/:id/activities` | Add a new activity |
| PUT | `/api/destinations/:id/activities/:activityId` | Update an activity |
| DELETE | `/api/destinations/:id/activities/:activityId` | Delete an activity |

---

## Unit Tests

### Test Framework
- **Testing Library:** Go's built-in `testing` package
- **Assertions:** `github.com/stretchr/testify/assert`
- **HTTP Testing:** `net/http/httptest`
- **Framework:** Gin in test mode
- **Database:** In-memory SQLite (`:memory:`)

### Test Coverage

#### Review Handler Tests (`review_test.go`)

**Total Tests: 14**

| Test | Description | Status |
|------|-------------|--------|
| Create Review - Success | Valid rating and comment returns 201 | ✅ Pass |
| Create Duplicate Review | Same user reviewing same destination returns 400 | ✅ Pass |
| Create Review - Invalid Rating | Rating of 6 returns 400 | ✅ Pass |
| Create Review - Missing Comment | Empty comment returns 400 | ✅ Pass |
| Create Review - Non-existent Destination | Destination 999 returns 404 | ✅ Pass |
| Get Reviews - Success | Returns reviews with average rating | ✅ Pass |
| Get Reviews - Non-existent Destination | Destination 999 returns 404 | ✅ Pass |
| Update Review - Success | Valid update returns 200 | ✅ Pass |
| Update Review - Invalid Rating | Rating of 0 returns 400 | ✅ Pass |
| Update Review - Wrong User | User 2 editing user 1's review returns 403 | ✅ Pass |
| Delete Review - Wrong User | User 2 deleting user 1's review returns 403 | ✅ Pass |
| Delete Review - Non-existent | Review 999 returns 404 | ✅ Pass |
| Delete Review - Success | Valid delete returns 200 | ✅ Pass |
| Verify Deletion | Get reviews after delete shows 0 total | ✅ Pass |

#### Activity Handler Tests (`activity_test.go`)

**Total Tests: 13**

| Test | Description | Status |
|------|-------------|--------|
| Get Activities - Empty List | Returns 200 with 0 total when no activities exist | ✅ Pass |
| Get Activities - Non-existent Destination | Destination 999 returns 404 | ✅ Pass |
| Create Activity - Success | Valid name and category returns 201 | ✅ Pass |
| Create Activity - Missing Name | Empty name returns 400 | ✅ Pass |
| Create Activity - Non-existent Destination | Destination 999 returns 404 | ✅ Pass |
| Get Activities - Has 1 | Returns correct name and category after create | ✅ Pass |
| Update Activity - Success | Valid update returns 200 | ✅ Pass |
| Update Activity - Missing Name | Empty name returns 400 | ✅ Pass |
| Update Activity - Non-existent | Activity 999 returns 404 | ✅ Pass |
| Verify Update | Get activities confirms name was changed | ✅ Pass |
| Delete Activity - Non-existent | Activity 999 returns 404 | ✅ Pass |
| Delete Activity - Success | Valid delete returns 200 | ✅ Pass |
| Verify Deletion | Get activities shows empty list after delete | ✅ Pass |

### Running the Tests

```bash
cd backend
go test ./handlers/ -run TestReviewFlow -v
go test ./handlers/ -run TestActivityFlow -v

# Run with coverage
go test ./handlers/... -cover
```

### Test Output
=== RUN   TestReviewFlow
--- PASS: TestReviewFlow (0.01s)
PASS
ok      backend/handlers    0.233s

=== Run   TestActivityFlow
--- PASS: TestActivityFlow (0.01s)
PASS
ok      backend/handlers
---

## New Database Tables

### `reviews`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-incremented review ID |
| `destination_id` | INTEGER FK | References `destinations.id` |
| `user_id` | INTEGER FK | References `users.id` |
| `rating` | INTEGER | Rating value 1–5 |
| `comment` | TEXT | Written review text |
| `created_at` | DATETIME | Timestamp of creation |
| `updated_at` | DATETIME | Timestamp of last update |

### `activities`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-incremented activity ID |
| `destination_id` | INTEGER FK | References `destinations.id` |
| `name` | TEXT | Name of the activity |
| `description` | TEXT | Optional description |
| `category` | TEXT | Optional category e.g. Sightseeing, Culture |
| `created_at` | DATETIME | Timestamp of creation |
| `updated_at` | DATETIME | Timestamp of last update |

---

## Issues Completed in Sprint 3

- Destination reviews and ratings (#34)
- View popular activities and attractions for a destination (#21)

---

## Summary

### Features Delivered
1. Destination reviews and ratings with full CRUD, ownership checks, and average rating calculation
2. Destination activities with full CRUD and category support

### API Endpoints Added
- 4 review management endpoints
- 4 activity management endpoints
- **Total: 8 new endpoints**

### Backend Unit Tests
| File | Tests | Status |
|------|-------|--------|
| `review_test.go` | 14 | ✅ All Pass |
| `activity_test.go` | 13 | ✅ All Pass |
| **Total** | **27** | **✅ All Pass** |