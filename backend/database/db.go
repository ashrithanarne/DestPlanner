package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

// InitDB initializes the SQLite database connection and creates tables
func InitDB(dataSourceName string) error {
	// Close existing connection if any
	if DB != nil {
		DB.Close()
	}

	var err error
	DB, err = sql.Open("sqlite", dataSourceName)
	if err != nil {
		return err
	}

	// Test the connection
	if err = DB.Ping(); err != nil {
		return err
	}

	// Create users table if it doesn't exist
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err = DB.Exec(createTableQuery)
	if err != nil {
		return err
	}

	// Create destinations table if it doesn't exist
	createDestinationsTable := `
	CREATE TABLE IF NOT EXISTS destinations (
	    id INTEGER PRIMARY KEY AUTOINCREMENT,
	    name TEXT NOT NULL,
	    country TEXT NOT NULL,
	    budget REAL NOT NULL,
	    description TEXT,
	    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err = DB.Exec(createDestinationsTable)
	if err != nil {
		return err
	}

	// Migrate: add category column to destinations if not already present
	DB.Exec(`ALTER TABLE destinations ADD COLUMN category TEXT`)
	// Migrate: add best_season and travel_time columns if not already present
	DB.Exec(`ALTER TABLE destinations ADD COLUMN best_season TEXT NOT NULL DEFAULT ''`)
	DB.Exec(`ALTER TABLE destinations ADD COLUMN travel_time TEXT NOT NULL DEFAULT ''`)

	// Create bookmarks table
	createBookmarksTable := `
	CREATE TABLE IF NOT EXISTS bookmarks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		destination_id INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id),
		FOREIGN KEY(destination_id) REFERENCES destinations(id)
	);
`

	_, err = DB.Exec(createBookmarksTable)
	if err != nil {
		return err
	}

	// Create itineraries table
	createItinerariesTable := `
   CREATE TABLE IF NOT EXISTS itineraries (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       created_by INTEGER NOT NULL,
       FOREIGN KEY (created_by) REFERENCES users(id)
    );
    `
	_, err = DB.Exec(createItinerariesTable)
	if err != nil {
		return err
	}

	// Create itinerary_destinations table (many-to-many)
	createItineraryDestinationsTable := `
   CREATE TABLE IF NOT EXISTS itinerary_destinations (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       itinerary_id INTEGER NOT NULL,
       destination_id INTEGER NOT NULL,
       FOREIGN KEY (itinerary_id) REFERENCES itineraries(id),
       FOREIGN KEY (destination_id) REFERENCES destinations(id)
   );
   `
	_, err = DB.Exec(createItineraryDestinationsTable)
	if err != nil {
		return err
	}

	// Create itinerary_collaborators table (many-to-many users <-> itineraries)
	createItineraryCollaboratorsTable := `
   CREATE TABLE IF NOT EXISTS itinerary_collaborators (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       itinerary_id INTEGER NOT NULL,
       user_id INTEGER NOT NULL,
       FOREIGN KEY (itinerary_id) REFERENCES itineraries(id),
       FOREIGN KEY (user_id) REFERENCES users(id)
    );
    `
	_, err = DB.Exec(createItineraryCollaboratorsTable)
	if err != nil {
		return err
	}

	// Create reviews table
	createReviewsTable := `
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(destination_id) REFERENCES destinations(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);
`
	_, err = DB.Exec(createReviewsTable)
	if err != nil {
		return err
	}

	// Create activities table
	createActivitiesTable := `
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(destination_id) REFERENCES destinations(id)
);
`
	_, err = DB.Exec(createActivitiesTable)
	if err != nil {
		return err
	}

	// Create token blacklist table
	createBlacklistTable := `
	CREATE TABLE IF NOT EXISTS token_blacklist (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT UNIQUE NOT NULL,
		user_id INTEGER NOT NULL,
		blacklisted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		expires_at DATETIME NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`

	_, err = DB.Exec(createBlacklistTable)
	if err != nil {
		return err
	}

	// Create trips table (MUST be before budgets and packing_lists that reference it)
	createTripsTable := `
	CREATE TABLE IF NOT EXISTS trips (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		trip_name TEXT NOT NULL,
		destination TEXT,
		start_date DATETIME,
		end_date DATETIME,
		notes TEXT,
		status TEXT DEFAULT 'planning',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`

	_, err = DB.Exec(createTripsTable)
	if err != nil {
		return err
	}

	// Create budgets table
	createBudgetsTable := `
	CREATE TABLE IF NOT EXISTS budgets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		trip_id INTEGER,
		trip_name TEXT NOT NULL,
		total_budget REAL NOT NULL,
		spent_amount REAL DEFAULT 0,
		currency TEXT DEFAULT 'USD',
		start_date DATETIME,
		end_date DATETIME,
		notes TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id),
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE SET NULL
	);
	`

	_, err = DB.Exec(createBudgetsTable)
	if err != nil {
		return err
	}

	// Create budget expenses table (for tracking individual expenses)
	createExpensesTable := `
	CREATE TABLE IF NOT EXISTS expenses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		budget_id INTEGER NOT NULL,
		category TEXT NOT NULL,
		amount REAL NOT NULL,
		description TEXT,
		expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(budget_id) REFERENCES budgets(id) ON DELETE CASCADE
	);
	`

	_, err = DB.Exec(createExpensesTable)
	if err != nil {
		return err
	}

	// Create packing lists table
	createPackingListsTable := `
	CREATE TABLE IF NOT EXISTS packing_lists (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		destination TEXT,
		climate TEXT,
		duration_days INTEGER,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id),
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
	);
	`

	_, err = DB.Exec(createPackingListsTable)
	if err != nil {
		return err
	}

	// Create packing items table
	createPackingItemsTable := `
	CREATE TABLE IF NOT EXISTS packing_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		packing_list_id INTEGER NOT NULL,
		item_name TEXT NOT NULL,
		category TEXT,
		quantity INTEGER DEFAULT 1,
		is_checked BOOLEAN DEFAULT 0,
		is_suggested BOOLEAN DEFAULT 0,
		notes TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE
	);
	`

	_, err = DB.Exec(createPackingItemsTable)
	if err != nil {
		return err
	}

	// Create groups table
	createGroupsTable := `
	CREATE TABLE IF NOT EXISTS groups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id INTEGER,
		created_by INTEGER NOT NULL,
		group_name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(created_by) REFERENCES users(id),
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE SET NULL
	);
	`
	_, err = DB.Exec(createGroupsTable)
	if err != nil {
		return err
	}

	// Create group_members table
	createGroupMembersTable := `
	CREATE TABLE IF NOT EXISTS group_members (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		group_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id),
		UNIQUE(group_id, user_id)
	);
	`
	_, err = DB.Exec(createGroupMembersTable)
	if err != nil {
		return err
	}

	// Create group_expenses table
	createGroupExpensesTable := `
	CREATE TABLE IF NOT EXISTS group_expenses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		group_id INTEGER NOT NULL,
		paid_by INTEGER NOT NULL,
		amount REAL NOT NULL,
		category TEXT NOT NULL,
		description TEXT,
		expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
		FOREIGN KEY(paid_by) REFERENCES users(id)
	);
	`
	_, err = DB.Exec(createGroupExpensesTable)
	if err != nil {
		return err
	}

	// Create expense_splits table
	createExpenseSplitsTable := `
	CREATE TABLE IF NOT EXISTS expense_splits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		expense_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		amount_owed REAL NOT NULL,
		is_settled INTEGER DEFAULT 0,
		settled_at DATETIME,
		FOREIGN KEY(expense_id) REFERENCES group_expenses(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id),
		UNIQUE(expense_id, user_id)
	);
	`
	_, err = DB.Exec(createExpenseSplitsTable)
	if err != nil {
		return err
	}

	// Create itinerary_items table (Sprint 3 - DB-backed timeline)
	createItineraryItemsTable := `
	CREATE TABLE IF NOT EXISTS itinerary_items (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id       INTEGER NOT NULL,
		user_id       INTEGER NOT NULL,
		title         TEXT    NOT NULL,
		activity_type TEXT    NOT NULL DEFAULT 'other',
		date          TEXT    NOT NULL,
		start_time    TEXT    NOT NULL DEFAULT '',
		end_time      TEXT    NOT NULL DEFAULT '',
		location      TEXT    NOT NULL DEFAULT '',
		notes         TEXT    NOT NULL DEFAULT '',
		sort_order    INTEGER NOT NULL DEFAULT 0,
		created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`
	_, err = DB.Exec(createItineraryItemsTable)
	if err != nil {
		return err
	}

	// Create notifications table (Sprint 3)
	createNotificationsTable := `
	CREATE TABLE IF NOT EXISTS notifications (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id    INTEGER NOT NULL,
		type       TEXT    NOT NULL,
		title      TEXT    NOT NULL,
		message    TEXT    NOT NULL,
		trip_id    INTEGER,
		is_read    INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE SET NULL
	);
	`
	_, err = DB.Exec(createNotificationsTable)
	if err != nil {
		return err
	}

	// Create notification_preferences table (Sprint 3)
	createNotifPrefsTable := `
	CREATE TABLE IF NOT EXISTS notification_preferences (
		user_id              INTEGER PRIMARY KEY,
		email_enabled        INTEGER NOT NULL DEFAULT 0,
		trip_reminders       INTEGER NOT NULL DEFAULT 1,
		itinerary_changes    INTEGER NOT NULL DEFAULT 1,
		expense_updates      INTEGER NOT NULL DEFAULT 1,
		collaborator_updates INTEGER NOT NULL DEFAULT 1,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	);
	`
	_, err = DB.Exec(createNotifPrefsTable)
	if err != nil {
		return err
	}

	// Create trip_invites table (Sprint 4 - invite collaborators by email)
	createTripInvitesTable := `
	CREATE TABLE IF NOT EXISTS trip_invites (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id    INTEGER NOT NULL,
		email      TEXT    NOT NULL,
		token      TEXT    NOT NULL UNIQUE,
		status     TEXT    NOT NULL DEFAULT 'pending',
		expires_at DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
		UNIQUE(trip_id, email, status)
	);
	`
	_, err = DB.Exec(createTripInvitesTable)
	if err != nil {
		return err
	}

	// Create user_follows table (Sprint 4 - social follow)
	_, err = DB.Exec(`
	CREATE TABLE IF NOT EXISTS user_follows (
		id           INTEGER PRIMARY KEY AUTOINCREMENT,
		follower_id  INTEGER NOT NULL,
		following_id INTEGER NOT NULL,
		created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(follower_id)  REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(following_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE(follower_id, following_id)
	);`)
	if err != nil {
		return err
	}

	// Migrate: add visibility column to trips if not already present
	DB.Exec(`ALTER TABLE trips ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'`)

	// Seed destination data for testing (only if table is empty)
	var destCount int
	DB.QueryRow("SELECT COUNT(*) FROM destinations").Scan(&destCount)
	if destCount == 0 {
		seeds := []struct {
			name, country, description, category, bestSeason, travelTime string
			budget float64
		}{
			{"Paris", "France", "The City of Light — famous for the Eiffel Tower, world-class cuisine, art museums, and romantic boulevards.", "couples", "Spring", "2h flight", 180},
			{"Tokyo", "Japan", "A dazzling blend of ultramodern and traditional — neon-lit skyscrapers, ancient temples, and incredible street food.", "adventure", "Autumn", "14h flight", 150},
			{"Bali", "Indonesia", "Island of the Gods — lush rice terraces, Hindu temples, surf beaches, and vibrant nightlife.", "beach", "Summer", "18h flight", 60},
			{"New York", "USA", "The city that never sleeps — iconic skyline, Broadway shows, Central Park, and world-famous food.", "city", "Autumn", "8h flight", 250},
			{"Barcelona", "Spain", "Gaudí architecture, sun-soaked beaches, tapas culture, and a buzzing nightlife scene.", "couples", "Spring", "2h flight", 130},
			{"Kyoto", "Japan", "Japan's cultural heart — thousands of temples, traditional geisha districts, and stunning bamboo groves.", "culture", "Spring", "14h flight", 120},
			{"Santorini", "Greece", "Iconic white-washed buildings, volcanic beaches, breathtaking sunsets, and excellent local wine.", "beach", "Summer", "3h flight", 200},
			{"Cape Town", "South Africa", "Dramatic Table Mountain backdrop, stunning coastlines, vibrant food scene, and nearby safari options.", "adventure", "Summer", "11h flight", 90},
			{"Machu Picchu", "Peru", "Ancient Incan citadel set high in the Andes Mountains — one of the world's most iconic archaeological sites.", "adventure", "Winter", "16h flight", 80},
			{"Dubai", "UAE", "Futuristic skyline, luxury shopping, desert safaris, and record-breaking attractions in the Arabian desert.", "city", "Winter", "7h flight", 300},
		}
		for _, s := range seeds {
			DB.Exec(
				`INSERT INTO destinations (name, country, budget, description, category, best_season, travel_time) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				s.name, s.country, s.budget, s.description, s.category, s.bestSeason, s.travelTime,
			)
		}

		// Seed activities for each destination
		activitySeeds := map[string][]struct{ name, desc, cat string }{
			"Paris": {
				{"Eiffel Tower", "Visit the iconic iron lattice tower on the Champ de Mars.", "Sightseeing"},
				{"Louvre Museum", "Explore the world's largest art museum and home of the Mona Lisa.", "Culture"},
				{"Seine River Cruise", "Scenic boat tour along the Seine passing major landmarks.", "Leisure"},
			},
			"Tokyo": {
				{"Shibuya Crossing", "Experience the world's busiest pedestrian crossing.", "Sightseeing"},
				{"Senso-ji Temple", "Tokyo's oldest and most significant Buddhist temple in Asakusa.", "Culture"},
				{"Tsukiji Outer Market", "Fresh sushi and street food at the famous fish market.", "Food"},
			},
			"Bali": {
				{"Ubud Monkey Forest", "Sacred sanctuary home to hundreds of Balinese long-tailed macaques.", "Nature"},
				{"Tanah Lot Temple", "Iconic sea temple perched on a rocky outcrop at sunset.", "Culture"},
				{"Kuta Beach Surfing", "Learn to surf on one of Bali's most famous beaches.", "Adventure"},
			},
			"New York": {
				{"Central Park", "840-acre urban park perfect for walking, cycling, and picnics.", "Leisure"},
				{"Statue of Liberty", "Iconic symbol of freedom on Liberty Island in New York Harbor.", "Sightseeing"},
				{"Broadway Show", "World-class theatre performances in the heart of Midtown Manhattan.", "Entertainment"},
			},
			"Barcelona": {
				{"Sagrada Família", "Gaudí's unfinished masterpiece basilica — a UNESCO World Heritage Site.", "Culture"},
				{"Park Güell", "Colourful mosaic park with panoramic views over the city.", "Sightseeing"},
				{"La Boqueria Market", "Famous public market with fresh produce, tapas, and local specialties.", "Food"},
			},
			"Kyoto": {
				{"Fushimi Inari Shrine", "Thousands of vermilion torii gates winding up a forested mountain.", "Culture"},
				{"Arashiyama Bamboo Grove", "Towering bamboo stalks creating an otherworldly forest path.", "Nature"},
				{"Gion District", "Historic geisha district with traditional wooden machiya townhouses.", "Culture"},
			},
			"Santorini": {
				{"Oia Sunset", "Watch the world-famous sunset from the clifftop village of Oia.", "Leisure"},
				{"Volcano Hike", "Hike to the active volcanic crater and swim in hot springs.", "Adventure"},
				{"Wine Tasting", "Sample unique Assyrtiko wines grown in volcanic soil.", "Food"},
			},
			"Cape Town": {
				{"Table Mountain", "Take the cable car to the flat-topped mountain for panoramic views.", "Nature"},
				{"Cape of Good Hope", "The dramatic southwestern tip of the African continent.", "Sightseeing"},
				{"Robben Island", "Historic island where Nelson Mandela was imprisoned for 18 years.", "Culture"},
			},
			"Machu Picchu": {
				{"Inca Trail Trek", "Classic 4-day hike through cloud forest to the Sun Gate.", "Adventure"},
				{"Huayna Picchu", "Steep hike up the iconic peak overlooking the citadel.", "Adventure"},
				{"Guided Ruins Tour", "Expert-led tour of the ancient Incan citadel and its history.", "Culture"},
			},
			"Dubai": {
				{"Burj Khalifa", "Visit the observation deck of the world's tallest building.", "Sightseeing"},
				{"Desert Safari", "Dune bashing, camel riding, and traditional Bedouin dinner.", "Adventure"},
				{"Dubai Mall", "One of the world's largest shopping malls with an indoor aquarium.", "Leisure"},
			},
		}
		for destName, activities := range activitySeeds {
			var destID int
			if err := DB.QueryRow("SELECT id FROM destinations WHERE name = ?", destName).Scan(&destID); err == nil {
				for _, a := range activities {
					DB.Exec(
						`INSERT INTO activities (destination_id, name, description, category) VALUES (?, ?, ?, ?)`,
						destID, a.name, a.desc, a.cat,
					)
				}
			}
		}
		log.Println("Seed data inserted: 10 destinations with activities")
	}

	log.Println("Database initialized successfully")
	return nil
}

// CloseDB closes the database connection
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
