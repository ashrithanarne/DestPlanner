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

#### 3. **Trip Timeline View Feature**
- DB-backed itinerary items per trip stored in `itinerary_items` table
- Five activity types with colour-coding support: `travel`, `accommodation`, `activity`, `dining`, `other`
- `GET /api/trips/:id/timeline` returns all items grouped by day in chronological order (`date ASC`, `start_time ASC`, `sort_order ASC`)
- Each `TimelineDay` includes a `day_number` calculated relative to the trip's start date
- Create timeline items with automatic `sort_order` assignment per date
- Partial update — only fields sent in the body are changed
- Drag-and-drop reorder endpoint shifts sibling items to make room and moves the item to a new date and position
- Itinerary change notifications fired to group collaborators on item creation (goroutine, non-blocking)
- `ON DELETE CASCADE` from `trips` to `itinerary_items`
- Added `itinerary_items` database table

#### 4. **In-App Notifications Feature**
- DB-backed notifications stored in `notifications` table
- Seven notification types: `trip_reminder_7day`, `trip_reminder_1day`, `trip_updated`, `itinerary_changed`, `collaborator_added`, `expense_added`, `expense_settled`
- `GET /api/notifications` returns full history with `unread_count`; supports `?unread_only=true` filter
- `GET /api/notifications/unread-count` — lightweight badge-count endpoint designed for polling
- Mark single notification as read (`PUT /api/notifications/:id/read`)
- Mark all notifications as read in one call (`PUT /api/notifications/read-all`)
- Delete individual notifications from history (`DELETE /api/notifications/:id`)
- Per-user notification preferences stored in `notification_preferences` table — five independent toggles: `email_enabled`, `trip_reminders`, `itinerary_changes`, `expense_updates`, `collaborator_updates`
- `GET /api/notifications/preferences` and `PUT /api/notifications/preferences` — partial update, only sent fields change
- `POST /api/notifications/reminders/check` — checks for trips departing in exactly 7 or 1 day and creates reminder notifications; designed to be called by a cron job
- Notifications respect user preferences before inserting — disabled types produce no row
- `upsert` logic on preferences (INSERT OR REPLACE) — idempotent
- Internal `CreateNotification` helper silently no-ops on DB error so notification failures never block the triggering operation
- Notifications auto-fired from trip handler (create/update), group handler (member added, expense added), and timeline handler (item created)
- Added `notifications` and `notification_preferences` database tables

---

## Backend API Documentation

### Base URL
```
http://localhost:8080
```

### Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Review Endpoints

### 1. Create Review

**POST** `/api/destinations/:id/reviews`

Submit a rating and review for a destination.

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
```
Authorization: Bearer <jwt_token>
```

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
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

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
```
Authorization: Bearer <jwt_token>
```

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
```
Authorization: Bearer <jwt_token>
```

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
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

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
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

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
```
Authorization: Bearer <jwt_token>
```

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

## Timeline Endpoints

### 9. Get Trip Timeline

**GET** `/api/trips/:id/timeline`

Returns all itinerary items for a trip grouped by day in chronological order.

**URL Parameters:**
- `id` (integer, required) - Trip ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "trip_id": 1,
  "trip_name": "Hawaii Vacation",
  "start_date": "2026-06-01",
  "end_date": "2026-06-05",
  "days": [
    {
      "date": "2026-06-01",
      "day_number": 1,
      "items": [
        {
          "id": 1,
          "trip_id": 1,
          "user_id": 1,
          "title": "Flight to Honolulu",
          "activity_type": "travel",
          "date": "2026-06-01",
          "start_time": "08:00",
          "end_time": "14:00",
          "location": "LAX → HNL",
          "notes": "Check in 2 hours early",
          "sort_order": 1,
          "created_at": "2026-05-01T10:00:00Z",
          "updated_at": "2026-05-01T10:00:00Z"
        }
      ]
    }
  ]
}
```

**Notes:**
- Items are ordered `date ASC`, `start_time ASC`, `sort_order ASC` within each day
- `day_number` is calculated relative to the trip's `start_date` (day 1 = start date)
- Returns empty `days` array when no items exist

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Trip not found"
}
```

---

### 10. Create Timeline Item

**POST** `/api/trips/:id/timeline/items`

Add a new item to the trip timeline.

**URL Parameters:**
- `id` (integer, required) - Trip ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Hotel Check-in",
  "activity_type": "accommodation",
  "date": "2026-06-01",
  "start_time": "14:00",
  "end_time": "15:00",
  "location": "Hotel Le Marais, Paris",
  "notes": "Confirmation #ABC123"
}
```

**Field Descriptions:**
- `title` (string, required) - Name of the activity or event
- `activity_type` (string, required) - One of: `travel`, `accommodation`, `activity`, `dining`, `other`
- `date` (string, required) - Date in `YYYY-MM-DD` format
- `start_time` (string, optional) - Time in `HH:MM` 24-hour format
- `end_time` (string, optional) - Time in `HH:MM` 24-hour format
- `location` (string, optional) - Location or address
- `notes` (string, optional) - Additional notes

**Response (201 Created):**
```json
{
  "message": "Timeline item created successfully",
  "item_id": 1
}
```

**Error Responses:**

*400 Bad Request - Invalid activity type:*
```json
{
  "error": "validation_error",
  "message": "activity_type must be one of: travel, accommodation, activity, dining, other"
}
```

*400 Bad Request - Invalid date format:*
```json
{
  "error": "validation_error",
  "message": "date must be in YYYY-MM-DD format"
}
```

*404 Not Found:*
```json
{
  "error": "not_found",
  "message": "Trip not found"
}
```

---

### 11. Update Timeline Item

**PUT** `/api/trips/:id/timeline/items/:itemId`

Update an existing timeline item. All fields are optional — only sent fields are changed.

**URL Parameters:**
- `id` (integer, required) - Trip ID
- `itemId` (integer, required) - Item ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Eiffel Tower + Dinner",
  "end_time": "21:00",
  "notes": "Reservation at Le Jules Verne restaurant"
}
```

**Response (200 OK):**
```json
{
  "message": "Timeline item updated successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Timeline item not found"
}
```

---

### 12. Delete Timeline Item

**DELETE** `/api/trips/:id/timeline/items/:itemId`

Delete a timeline item.

**URL Parameters:**
- `id` (integer, required) - Trip ID
- `itemId` (integer, required) - Item ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "Timeline item deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Timeline item not found"
}
```

---

### 13. Reorder Timeline Item

**PUT** `/api/trips/:id/timeline/items/:itemId/reorder`

Move a timeline item to a new date and/or sort position. Supports drag-and-drop — shifts sibling items at the target position automatically.

**URL Parameters:**
- `id` (integer, required) - Trip ID
- `itemId` (integer, required) - Item ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "date": "2026-06-02",
  "sort_order": 1
}
```

**Field Descriptions:**
- `date` (string, required) - Target date in `YYYY-MM-DD` format
- `sort_order` (integer, required) - New position within the target date (1-based)

**Response (200 OK):**
```json
{
  "message": "Timeline item reordered successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Timeline item not found"
}
```

---

## Notification Endpoints

### 14. Get Notifications

**GET** `/api/notifications`

Returns all notifications for the authenticated user, newest first.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `unread_only` (boolean, optional) - Pass `true` to return only unread notifications

**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": 1,
      "user_id": 1,
      "type": "trip_reminder_7day",
      "title": "Trip in 7 days",
      "message": "Your trip \"Hawaii Vacation\" to Hawaii is coming up soon. Make sure you're ready!",
      "trip_id": 1,
      "is_read": false,
      "created_at": "2026-05-25T10:00:00Z"
    }
  ],
  "unread_count": 1
}
```

**Notification Types:**
| Type | Trigger |
|------|---------|
| `trip_reminder_7day` | Trip departing in 7 days |
| `trip_reminder_1day` | Trip departing tomorrow |
| `trip_updated` | Trip created or updated |
| `itinerary_changed` | Collaborator added a timeline item |
| `collaborator_added` | User added to a group |
| `expense_added` | New expense added to user's group |
| `expense_settled` | Expense split marked as settled |

---

### 15. Get Unread Count

**GET** `/api/notifications/unread-count`

Returns only the unread badge count. Lightweight endpoint designed for polling.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "unread_count": 3
}
```

---

### 16. Mark Notification as Read

**PUT** `/api/notifications/:id/read`

Mark a single notification as read.

**URL Parameters:**
- `id` (integer, required) - Notification ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "Notification marked as read"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Notification not found"
}
```

---

### 17. Mark All Notifications as Read

**PUT** `/api/notifications/read-all`

Mark every unread notification for the user as read in one call.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "All notifications marked as read",
  "updated": 5
}
```

---

### 18. Delete Notification

**DELETE** `/api/notifications/:id`

Remove a notification from the user's history.

**URL Parameters:**
- `id` (integer, required) - Notification ID

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "Notification deleted"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Notification not found"
}
```

---

### 19. Get Notification Preferences

**GET** `/api/notifications/preferences`

Get the user's current notification preferences. Returns safe defaults if preferences have never been set.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "user_id": 1,
  "email_enabled": false,
  "trip_reminders": true,
  "itinerary_changes": true,
  "expense_updates": true,
  "collaborator_updates": true
}
```

---

### 20. Update Notification Preferences

**PUT** `/api/notifications/preferences`

Update notification preferences. Only fields present in the body are changed.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email_enabled": true,
  "expense_updates": false
}
```

**Response (200 OK):**
```json
{
  "message": "Preferences updated successfully",
  "preferences": {
    "user_id": 1,
    "email_enabled": true,
    "trip_reminders": true,
    "itinerary_changes": true,
    "expense_updates": false,
    "collaborator_updates": true
  }
}
```

---

### 21. Check Trip Reminders

**POST** `/api/notifications/reminders/check`

Scans for trips departing in exactly 7 or 1 day and creates reminder notifications for users who have `trip_reminders` enabled. Designed to be called by a cron job.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "reminders_7day": 2,
  "reminders_1day": 1
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

#### Trip Timeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trips/:id/timeline` | Get full timeline grouped by day |
| POST | `/api/trips/:id/timeline/items` | Add a new timeline item |
| PUT | `/api/trips/:id/timeline/items/:itemId` | Update a timeline item |
| DELETE | `/api/trips/:id/timeline/items/:itemId` | Delete a timeline item |
| PUT | `/api/trips/:id/timeline/items/:itemId/reorder` | Reorder / move item to new date |

#### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications with unread count |
| GET | `/api/notifications/unread-count` | Get badge count only |
| PUT | `/api/notifications/:id/read` | Mark single notification as read |
| PUT | `/api/notifications/read-all` | Mark all notifications as read |
| DELETE | `/api/notifications/:id` | Delete a notification |
| GET | `/api/notifications/preferences` | Get notification preferences |
| PUT | `/api/notifications/preferences` | Update notification preferences |
| POST | `/api/notifications/reminders/check` | Trigger trip reminder check (cron) |

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

### `itinerary_items`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-incremented item ID |
| `trip_id` | INTEGER FK | References `trips.id` ON DELETE CASCADE |
| `user_id` | INTEGER FK | References `users.id` |
| `title` | TEXT | Name of the event or activity |
| `activity_type` | TEXT | One of: travel, accommodation, activity, dining, other |
| `date` | TEXT | Date in YYYY-MM-DD format |
| `start_time` | TEXT | Start time in HH:MM format (optional) |
| `end_time` | TEXT | End time in HH:MM format (optional) |
| `location` | TEXT | Location or address (optional) |
| `notes` | TEXT | Additional notes (optional) |
| `sort_order` | INTEGER | Position within the same date slot |
| `created_at` | DATETIME | Timestamp of creation |
| `updated_at` | DATETIME | Timestamp of last update |

### `notifications`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-incremented notification ID |
| `user_id` | INTEGER FK | References `users.id` ON DELETE CASCADE |
| `type` | TEXT | Notification type constant |
| `title` | TEXT | Short notification title |
| `message` | TEXT | Full notification message |
| `trip_id` | INTEGER FK | References `trips.id` ON DELETE SET NULL (optional) |
| `is_read` | INTEGER | 0 = unread, 1 = read |
| `created_at` | DATETIME | Timestamp of creation |

### `notification_preferences`
| Column | Type | Description |
|--------|------|-------------|
| `user_id` | INTEGER PK | References `users.id` ON DELETE CASCADE |
| `email_enabled` | INTEGER | 0/1 — email notifications on/off (default 0) |
| `trip_reminders` | INTEGER | 0/1 — trip reminder notifications (default 1) |
| `itinerary_changes` | INTEGER | 0/1 — itinerary change notifications (default 1) |
| `expense_updates` | INTEGER | 0/1 — group expense notifications (default 1) |
| `collaborator_updates` | INTEGER | 0/1 — collaborator added notifications (default 1) |

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

---

#### Timeline Handler Tests (`timeline_test.go`)
 
**Total Tests: 22**
 
| Test | Description | Status |
|------|-------------|--------|
| `TestGetTimeline_EmptyTrip` | Returns 200 with empty days array and trip metadata | ✅ Pass |
| `TestGetTimeline_NotFound` | Trip 9999 returns 404 | ✅ Pass |
| `TestGetTimeline_WithItems_GroupedByDay` | Items on two dates returned in two separate day groups | ✅ Pass |
| `TestGetTimeline_ChronologicalOrder` | Items sorted by start_time within a day | ✅ Pass |
| `TestGetTimeline_ActivityTypeInResponse` | activity_type field correctly mapped in response | ✅ Pass |
| `TestCreateTimelineItem_Success` | All fields accepted, returns 201 with item_id | ✅ Pass |
| `TestCreateTimelineItem_MissingTitle` | Missing title returns 400 | ✅ Pass |
| `TestCreateTimelineItem_MissingDate` | Missing date returns 400 | ✅ Pass |
| `TestCreateTimelineItem_InvalidActivityType` | Unknown type returns 400 validation_error | ✅ Pass |
| `TestCreateTimelineItem_InvalidDateFormat` | DD/MM/YYYY format returns 400 | ✅ Pass |
| `TestCreateTimelineItem_TripNotFound` | Trip 9999 returns 404 | ✅ Pass |
| `TestCreateTimelineItem_SortOrderAutoIncrement` | Two items on same date get sort_order 1 and 2 | ✅ Pass |
| `TestUpdateTimelineItem_Success` | Partial update changes title and location in DB | ✅ Pass |
| `TestUpdateTimelineItem_NotFound` | Item 9999 returns 404 | ✅ Pass |
| `TestUpdateTimelineItem_InvalidActivityType` | Invalid type returns 400 | ✅ Pass |
| `TestDeleteTimelineItem_Success` | Returns 200 and row is gone from DB | ✅ Pass |
| `TestDeleteTimelineItem_NotFound` | Item 9999 returns 404 | ✅ Pass |
| `TestReorderTimelineItem_Success` | Item moved to position 2 on same date | ✅ Pass |
| `TestReorderTimelineItem_MoveToNewDate` | Item date changes to new date in DB | ✅ Pass |
| `TestReorderTimelineItem_NotFound` | Item 9999 returns 404 | ✅ Pass |
| `TestReorderTimelineItem_InvalidDate` | Bad date format returns 400 | ✅ Pass |
| `TestReorderTimelineItem_MissingBody` | Empty body returns 400 | ✅ Pass |
| `TestCreateTimelineItem_AllActivityTypes` | All 5 valid types each return 201 (sub-tests) | ✅ Pass |
 
---
 
#### Notification Handler Tests (`notification_test.go`)
 
**Total Tests: 37**
 
| Test | Description | Status |
|------|-------------|--------|
| `TestGetNotifications_Empty` | Returns 200 with empty list and unread_count 0 | ✅ Pass |
| `TestGetNotifications_ReturnsList` | Returns all notifications with correct unread_count | ✅ Pass |
| `TestGetNotifications_UnreadCountCorrect` | Mixed read/unread — count reflects only unread | ✅ Pass |
| `TestGetNotifications_UnreadOnlyFilter` | `?unread_only=true` returns only unread notifications | ✅ Pass |
| `TestGetNotifications_NewestFirst` | Notifications returned newest first by timestamp | ✅ Pass |
| `TestGetNotifications_TypeFieldMapped` | `type` field correctly deserialised from DB | ✅ Pass |
| `TestGetNotifications_TripIDIncluded` | `trip_id` present and correct when notification is trip-linked | ✅ Pass |
| `TestGetUnreadCount_Zero` | Returns `unread_count: 0` when all read | ✅ Pass |
| `TestGetUnreadCount_NonZero` | Returns correct count ignoring read notifications | ✅ Pass |
| `TestMarkNotificationRead_Success` | Returns 200 and `is_read` = 1 in DB | ✅ Pass |
| `TestMarkNotificationRead_NotFound` | Notification 9999 returns 404 | ✅ Pass |
| `TestMarkNotificationRead_InvalidID` | Non-numeric ID returns 400 | ✅ Pass |
| `TestMarkNotificationRead_AlreadyRead` | Marking already-read notification still returns 200 | ✅ Pass |
| `TestMarkAllNotificationsRead_Success` | Returns 200, updated count = 3, DB shows 0 unread | ✅ Pass |
| `TestMarkAllNotificationsRead_NoneUnread` | Returns 200 with updated = 0 when nothing to mark | ✅ Pass |
| `TestDeleteNotification_Success` | Returns 200 and row is gone from DB | ✅ Pass |
| `TestDeleteNotification_NotFound` | Notification 9999 returns 404 | ✅ Pass |
| `TestDeleteNotification_InvalidID` | Non-numeric ID returns 400 | ✅ Pass |
| `TestGetNotificationPreferences_DefaultsWhenNoneSet` | Returns safe defaults when user has no saved prefs | ✅ Pass |
| `TestGetNotificationPreferences_ReturnsStoredValues` | Returns exact values stored in DB | ✅ Pass |
| `TestUpdateNotificationPreferences_EnableEmail` | `email_enabled: true` persisted to DB | ✅ Pass |
| `TestUpdateNotificationPreferences_DisableTripReminders` | `trip_reminders: false` persisted, other prefs unchanged | ✅ Pass |
| `TestUpdateNotificationPreferences_MultipleFields` | Three fields updated in one call | ✅ Pass |
| `TestUpdateNotificationPreferences_Idempotent` | Same PUT called 3 times — final state unchanged | ✅ Pass |
| `TestUpdateNotificationPreferences_InvalidPayload` | Malformed JSON returns 400 | ✅ Pass |
| `TestCreateNotification_InsertsRow` | Internal helper inserts exactly one row | ✅ Pass |
| `TestCreateNotification_WithTripID` | `trip_id` stored correctly on notification row | ✅ Pass |
| `TestCreateNotification_NilDBDoesNotPanic` | Helper silently returns when DB is nil | ✅ Pass |
| `TestCheckTripReminders_NoTrips` | Returns 0 for both reminder counts when no trips | ✅ Pass |
| `TestCheckTripReminders_RespectsPreferenceOff` | No notification created when `trip_reminders = 0` | ✅ Pass |
| `TestNotifPrefs_ExpenseUpdateDisabled_NoNotifCreated` | Disabled preference gates notification creation | ✅ Pass |
| `TestNotifPrefs_AllTypesStored` | All five preference fields correctly stored and retrieved | ✅ Pass |
 
---

### Running the Tests

```bash
cd backend
go test ./handlers/... -v

# Run specific feature tests
go test ./handlers/ -run TestReviewFlow -v
go test ./handlers/ -run TestActivityFlow -v
go test ./handlers/ -run TestGetTimeline -v
go test ./handlers/ -run TestCreateTimelineItem -v
go test ./handlers/ -run TestGetNotifications -v
go test ./handlers/ -run TestNotifPrefs -v

# Run with coverage
go test ./handlers/... -cover
```

### Test Output
```
=== RUN   TestReviewFlow
--- PASS: TestReviewFlow (0.01s)
=== RUN   TestActivityFlow
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
- Trip timeline view (#35)
- Notifications for trip updates (#36)

---

## Summary

### Features Delivered
1. Destination reviews and ratings with full CRUD, ownership checks, and average rating calculation
2. Destination activities with full CRUD and category support
3. Trip timeline view with DB-backed itinerary items, chronological grouping by day, and drag-and-drop reorder support
4. In-app notification system with per-user preferences, unread badge count, and auto-fired notifications from trip, group, and timeline events

### API Endpoints Added
- 4 review management endpoints
- 4 activity management endpoints
- 5 timeline management endpoints
- 8 notification endpoints
- **Total: 21 new endpoints**

### Backend Unit Tests Summary
| File | Tests | Status |
|------|-------|--------|
| `review_test.go` | 14 | ✅ All Pass |
| `activity_test.go` | 13 | ✅ All Pass |
| `timeline_test.go` | 22 | ✅ All Pass |
| `notification_test.go` | 37 | ✅ All Pass |
| **Total** | **86** | **✅ All Pass** |
