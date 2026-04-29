# DestPlanner
## Problem Statement
Modern travelers face significant challenges when planning trips, including:<br>
• **Fragmented tools and platforms** - Users must juggle multiple applications for destination
research, itinerary creation, booking management, and expense tracking.<br>
• **Information overload** - Diﬃculty in filtering and comparing destinations based on personal
preferences and budget constraints.<br>
• **Collaboration ineﬃciency** - Limited real-time coordination features for group travel
planning, leading to miscommunication and duplicate eﬀorts.<br>
• **Budget unpredictability** - Lack of integrated expense tracking and cost simulation tools
results in budget overruns. (average of 20-30% over planned budget)<br>
• **Time wastage** - Travelers spend an average of 8-12 hours researching and organizing a
single trip across disconnected platforms.<br>
• **Poor itinerary management** - No centralized system to manage bookings, activities, and
schedules in one place.<br>
• **Lack of personalization** - Generic recommendations that don't account for individual travel
styles, preferences, and constraints.<br>

This project aims to consolidate trip planning activities into a unified platform, reducing
complexity, improving collaboration, and enabling data-driven travel decisions while saving
time and preventing budget overruns.<br>

## Project Description
**DestPlanner**: Intelligent Collaborative Travel Planning Platform<br>

**Overview:**<br>
DestPlanner is a cloud-based web application that consolidates destination discovery, itinerary
management, expense tracking, and collaborative planning into a single, integrated platform.
Built with Angular for an intuitive frontend and Go for a scalable backend, the platform
leverages rules-based recommendation algorithms to deliver personalized travel experiences
while streamlining the entire planning workflow.<br>

**Key Features:**<br>
**For Individual Travelers:**<br>
• Personalized destination recommendations based on budget, interests, climate preferences,
and travel dates.<br>
• Interactive itinerary builder.<br>
• Real-time expense tracking and budget monitoring.<br>
• Simulated booking workflows for flights, accommodations, and activities.<br>
• Climate-based smart packing suggestions.<br>
• Save and compare multiple trip options.<br>
• Personal travel history and preferences dashboard.<br>

**For Group Travelers:**<br>
• Shared itinerary creation and real-time collaborative editing.<br>
• Group expense splitting and tracking.<br>
• Voting and polling features for destination and activity selection.<br>
• Activity notifications and updates for all group members.<br>
• Integrated chat/messaging for trip discussions.<br>

**Platform Features:**<br>
• User authentication and profile management.<br>
• Rules-based destination recommendation engine.<br>
• Curated destination database with detailed information (attractions, climate, costs, reviews.)<br>
• Interactive map integration for geographic visualization.<br>
• Budget simulation and cost estimation tools.<br>
• Document storage for tickets, reservations, and travel documents.<br>
• Export itineraries to PDF/calendar formats.<br>
• Admin dashboard for content management and user support.<br>

## Technology Stack<br>

**Frontend:**<br>
• Angular 17+ for building a dynamic, single-page application.<br>
• Angular Material for UI components.<br>
• Leaflet/Mapbox for interactive maps.<br>

**Backend:**<br>
• Go (Golang) for high-performance REST APIs.<br>
• Gorilla Mux or Gin framework for routing.<br>
• JWT authentication for secure user sessions.<br>
• PostgreSQL/MySQL for relational data storage.<br>
• Redis for caching and session management.<br>

**Additional Technologies:**<br>
• WebSocket for real-time collaboration features.<br>
• Cloud storage (AWS S3/Firebase) for document uploads.<br>
• Payment gateway integration (for future booking features).<br>
• Docker for containerization.<br>
• CI/CD pipeline for automated deployment.<br>
• Third-party APIs for weather, maps, and destination data.<br>

## Project Goals<br>
1. **Simplify Planning:** Consolidate 5+ separate tools into one unified platform.<br>
2. **Save Time:** Reduce trip planning time by 50-60% through automation and integration.<br>
3. **Enable Collaboration:** Provide seamless real-time coordination for group travel.<br>
4. **Budget Control:** Help users stay within budget through accurate cost tracking and
simulation.<br>
5. **Personalization:** Deliver tailored recommendations that match user preferences.<br>
6. **Data-Driven Decisions:** Provide insights and analytics to help users make informed
choices.<br>

## Target Users<br>
• Individual leisure travelers seeking organized trip planning.<br>
• Groups of friends and families planning shared vacations.<br>
• Business travelers needing eﬃcient itinerary management.<br>
• Travel enthusiasts who plan multiple trips annually.<br>
• Budget-conscious travelers requiring expense tracking.<br>

## Expected Impact<br>
• **Time Savings**: Reduce average planning time from 8-12 hours to 3-5 hours per trip.<br>
• **Cost Eﬃciency:** Help users save 15-20% on travel expenses through better budget
management.<br>
• **Improved Collaboration**: Increase group planning eﬃciency by 40% through real-time
features.<br>
• **User Satisfaction**: Achieve 80%+ user satisfaction through personalized recommendations.<br>
• **Reduced Planning Stress**: Consolidate tools to decrease cognitive load and decision fatigue.<br>

## Team Members<br>

Rishitha Pydipati - Frontend<br>
Tarun Reddy Chittela - Frontend<br>
Nikhitha Pydipati - Backend<br>
Ashritha Narne - Backend<br>

---
 
## Prerequisites
 
Make sure the following are installed before running the project:
 
### Required
 
| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Go | 1.21+ | `go version` |
| Angular CLI | 17+ | `ng version` |
 
### Install Angular CLI (if not already installed)
 
```bash
npm install -g @angular/cli
```
 
---
 
## Getting Started
 
### 1. Clone the Repository
 
```bash
git clone https://github.com/ashrithanarne/DestPlanner.git
cd DestPlanner
```
 
---
 
### 2. Run the Backend
 
The backend uses SQLite — **no database installation or configuration required**. The database file (`destplanner.db`) is created automatically on first run.
 
```bash
cd backend
go mod download
go run router.go
```
 
The backend will start at **http://localhost:8080**
 
You should see output like:
```
[GIN-debug] Listening and serving HTTP on :8080
```
 
> **Note:** Keep this terminal open. The frontend depends on the backend being running.
 
---
 
### 3. Run the Frontend
 
Open a **new terminal** (keep the backend running):
 
```bash
cd frontend/destplanner-frontend
npm install
ng serve
```
 
The frontend will start at **http://localhost:4200**
 
Open your browser and navigate to **http://localhost:4200** to use the application.
 
---
 
## Running Tests
 
### Frontend Unit Tests
 
```bash
cd frontend/destplanner-frontend
npm test
```
 
This runs all Vitest unit tests across components and services. You should see output like:
```
Test Files  33 passed (33)
     Tests  642 passed (706)
```
 
To run in watch mode (re-runs on file save):
```bash
ng test
```
 
---
 
### Frontend E2E Tests (Cypress)
 
Make sure both the backend and frontend are running first, then in a separate terminal:
 
```bash
cd frontend/destplanner-frontend
 
# Open Cypress interactive runner
npm run cypress:open
 
# Or run headlessly
npm run cypress:run
```
 
---
 
### Backend Unit Tests
 
```bash
cd backend
go test ./handlers/... -v
```
 
Run with coverage report:
```bash
go test ./handlers/... -cover
```
 
All tests use an in-memory SQLite database — no running backend or external database is needed.
 
---

## Project Structure
 
```
DestPlanner/
├── backend/
│   ├── router.go               # Gin router and route definitions
│   ├── go.mod / go.sum         # Go module dependencies
│   ├── destplanner.db          # SQLite database (auto-created on first run)
│   ├── database/
│   │   └── db.go               # Database connection and schema migrations
│   ├── handlers/               # Route handlers and unit tests
│   │   ├── auth.go / auth_test.go
│   │   ├── trip_handler.go / trip_test.go
│   │   ├── itinerary_handler.go / itinerary_test.go
│   │   ├── budget_handler.go / budget_test.go
│   │   ├── destination_handler.go / destination_test.go
│   │   ├── invite_handler.go / invite_test.go
│   │   ├── social_handler.go / social_test.go
│   │   ├── analytics_handler.go / analytics_test.go
│   │   ├── travel_handler.go / travel_test.go
│   │   └── ...
│   ├── middleware/             # JWT auth middleware
│   ├── models/                 # Data models/structs
│   └── utils/                  # Helper utilities
│
├── frontend/
│   └── destplanner-frontend/
│       ├── src/app/
│       │   ├── auth/           # Login, Register
│       │   ├── components/     # All UI components
│       │   │   ├── landing-page/
│       │   │   ├── destinations/
│       │   │   ├── category-destinations/
│       │   │   ├── destination-detail/
│       │   │   ├── mytrips/
│       │   │   ├── itinerary/
│       │   │   ├── timeline/
│       │   │   ├── budget/
│       │   │   ├── expense-split/
│       │   │   ├── packing-list/
│       │   │   ├── profile/
│       │   │   ├── public-profile/
│       │   │   ├── feed/
│       │   │   ├── user-search/
│       │   │   ├── trip-invite/
│       │   │   ├── accept-invite/
│       │   │   ├── notifications/
│       │   │   └── navigation/
│       │   ├── services/       # Angular services (API calls)
│       │   └── interceptors/   # HTTP auth interceptor
│       └── cypress/e2e/        # Cypress end-to-end tests
│
├── Sprint1.md
├── Sprint2.md
├── Sprint3.md
├── Sprint4.md
└── README.md
```

