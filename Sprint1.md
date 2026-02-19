# Sprint 1 - DestPlanner

## Sprint Overview
**Duration:** Sprint 1  
**Focus:** Core infrastructure setup and basic user authentication/profile management  
**Team Split:** Frontend (Angular) + Backend (Go)

---

## User Stories

### User Authentication & Profile Management

#### US-1: User Registration
**As a** new user  
**I want to** create an account with email and password  
**So that** I can access the DestPlanner platform and save my travel preferences

**Acceptance Criteria:**
- User can register with email, password, first name, and last name
- Email validation is performed (valid format, unique)
- Password must meet security requirements (min 8 chars, 1 uppercase, 1 number)
- Success message displayed upon successful registration
- User is redirected to login page after registration
- Error messages displayed for validation failures


---

#### US-2: User Login
**As a** registered user  
**I want to** log in to my account  
**So that** I can access my personalized travel planning dashboard

**Acceptance Criteria:**
- User can log in with email and password
- JWT token is generated and stored securely
- Invalid credentials show appropriate error message
- Successful login redirects to dashboard/home page
- "Remember me" functionality (optional for Sprint 1)
- Session persists across page refreshes

---

#### US-3: User Profile View
**As a** logged-in user  
**I want to** view my profile information  
**So that** I can see my current account details and preferences

**Acceptance Criteria:**
- Display user's name, email, and registration date
- Show placeholder for profile picture (implementation in future sprint)
- Display travel preferences section (even if empty initially)
- Accessible from navigation menu
- Responsive design for mobile and desktop

---

#### US-4: User Profile Edit
**As a** logged-in user  
**I want to** update my profile information  
**So that** I can keep my account details current and set my travel preferences

**Acceptance Criteria:**
- User can edit first name, last name
- User can update travel preferences (budget range, preferred climate, interests)
- Changes are saved to backend
- Success message displayed after successful update
- Validation errors shown for invalid inputs
- Cancel button to discard changes

---

#### US-5: User Logout
**As a** logged-in user  
**I want to** securely log out of my account  
**So that** my account remains secure when I'm done using the platform

**Acceptance Criteria:**
- Logout button accessible from navigation
- JWT token is cleared from storage
- User is redirected to login/landing page
- Session is terminated on backend
- Confirmation message (optional)

---

### Platform Foundation

#### US-6: Landing Page
**As a** visitor  
**I want to** see an attractive landing page  
**So that** I understand what DestPlanner offers and am motivated to sign up

**Acceptance Criteria:**
- Hero section with key value proposition
- Features overview section
- Call-to-action buttons (Sign Up, Login)
- Responsive design
- Navigation menu with links
- Footer with basic info

---

#### US-7: Dashboard Home
**As a** logged-in user  
**I want to** see a dashboard when I log in  
**So that** I have a starting point for my travel planning activities

**Acceptance Criteria:**
- Welcome message with user's name
- Quick stats (trips planned, saved destinations - can be 0 for now)
- Navigation to main features (Create Trip, View Destinations, etc.)
- Placeholder widgets for future features
- Responsive layout

---

## Sprint 1 Issues

### Frontend Issues

#### FE-1: Project Setup and Configuration
**Description:** Initialize Angular project with necessary dependencies and configuration  
**Tasks:**
- Create Angular 17+ project
- Install Angular Material
- Set up routing module
- Configure environment files (dev/prod)
- Set up folder structure (components, services, models, guards)
- Install HTTP client and configure interceptors
- Set up Leaflet/Mapbox dependencies (basic setup)

**Related User Stories:** All  
**Assigned To:** Frontend Team  
**Estimated Hours:** 4-6 hours  

---

#### FE-2: Registration Component
**Description:** Build user registration page with form validation  
**Tasks:**
- Create registration component with reactive form
- Implement form validation (email, password, required fields)
- Add password strength indicator
- Connect to AuthService
- Display success/error messages
- Add navigation to login page
- Style with Angular Material

**Related User Stories:** US-1
**Assigned To:** Rishitha Pydipati 
**Estimated Hours:** 5-7 hours  

---

#### FE-3: Login Component
**Description:** Build user login page  
**Tasks:**
- Create login component with reactive form
- Implement form validation
- Connect to AuthService
- Handle login errors and display messages
- Implement "Remember me" functionality (optional)
- Redirect to dashboard on success
- Style with Angular Material
- Add link to registration page

**Related User Stories:** US-2  
**Assigned To:** Tarun Chittela
**Estimated Hours:** 4-6 hours  

---

#### FE-4: Navigation Component
**Description:** Create main navigation bar with authentication-aware menu  
**Tasks:**
- Create responsive navigation component
- Show different menu items based on auth status
- Add logout button for authenticated users
- Implement mobile hamburger menu
- Add routing links
- Style with Angular Material
- Display user name when logged in

**Related User Stories:** US-7  
**Assigned To:** Tarun Chittela 
**Estimated Hours:** 4-5 hours  

---

#### FE-5: Landing Page Component
**Description:** Create attractive landing page for visitors  
**Tasks:**
- Create landing page component
- Design hero section with CTA buttons
- Add features overview section
- Create footer
- Make fully responsive
- Add navigation to login/register
- Style with Angular Material and custom CSS

**Related User Stories:** US-6
**Assigned To:** Rishitha Pydipati  
**Estimated Hours:** 6-8 hours   

---

#### FE-7: User Profile Service
**Description:** Create service for managing user profile operations  
**Tasks:**
- Create UserProfileService
- Implement methods for fetching user profile
- Implement methods for updating user profile
- Handle API responses and errors
- Create user profile model/interface

**Related User Stories:** 3 
**Estimated Hours:** 3-4 hours  

---

### Backend Issues

#### BE-1: Project Setup and Configuration
**Description:** Initialize Go project with necessary dependencies and structure  
**Tasks:**
- Initialize Go module
- Set up project folder structure (handlers, models, middleware, config, database)
- Install dependencies (Gin/Gorilla Mux, JWT, database drivers, bcrypt)
- Create configuration file handling (environment variables)
- Set up logging
- Create main.go with basic server setup

**Related User Stories:** All  
**Assigned To:** Backend Team  
**Estimated Hours:** 4-6 hours  

---

#### BE-2: User Registration Endpoint
**Description:** Create API endpoint for user registration  
**Tasks:**
- Create POST /api/auth/register endpoint
- Implement request validation (email format, password strength)
- Check for duplicate email
- Hash password using bcrypt
- Create user in database
- Return appropriate success/error responses
- Add request/response logging
- Write integration tests

**Related User Stories:** US-1 
**Assigned To:** Ashritha Narne  
**Estimated Hours:** 5-6 hours  

---

#### BE-3: User Login Endpoint
**Description:** Create API endpoint for user login  
**Tasks:**
- Create POST /api/auth/login endpoint
- Validate request body
- Verify user credentials
- Compare hashed passwords
- Generate JWT token on success
- Return token and user info
- Handle invalid credentials appropriately
- Add rate limiting (basic)
- Write integration tests

**Related User Stories:** US-2 
**Assigned To:** Nikhitha Pydipati 
**Estimated Hours:** 5-6 hours  

---

#### BE-4: Get User Profile Endpoint
**Description:** Create API endpoint to retrieve user profile  
**Tasks:**
- Create GET /api/users/profile endpoint
- Protect route with authentication middleware
- Fetch user data from database
- Fetch user preferences
- Format and return user profile data
- Handle not found errors
- Write integration tests

**Related User Stories:** US-3  
**Assigned To:** Nikhitha Pydipati
**Estimated Hours:** 4-5 hours  

---

#### BE-5: Update User Profile Endpoint
**Description:** Create API endpoint to update user profile  
**Tasks:**
- Create PUT /api/users/profile endpoint
- Protect route with authentication middleware
- Validate request body
- Update user information in database
- Update user preferences
- Return updated profile data
- Handle validation errors
- Write integration tests

**Related User Stories:** US-4  
**Assigned To:** Nikhitha Pydipati 
**Estimated Hours:** 5-6 hours  

---

#### BE-6: User Logout Endpoint
**Description:** Create API endpoint for user logout  
**Tasks:**
- Create POST /api/auth/logout endpoint
- Implement token blacklisting (Redis or database)
- Clear any server-side session data
- Return success response
- Add to protected routes

**Related User Stories:** US-5
**Estimated Hours:** 3-4 hours  

---

## Successfully Completed Issues

### Frontend
- [x] **FE-1:** Project Setup and Configuration
- [x] **FE-2:** Registration Component
- [x] **FE-3:** Login Component
- [x] **FE-4:** Navigation Component
- [x] **FE-5:** Landing Page Component

### Backend
- [x] **BE-1:** Project Setup and Configuration
- [x] **BE-2:** User Registration Endpoint
- [x] **BE-3:** User Login Endpoint
- [x] **BE-4:** Get User Profile Endpoint
- [x] **BE-5:** Update User Profile Endpoint

---

## Issues Not Completed

### Frontend
- [ ] **FE-7:** User Profile Service

**Reasons:**
- These were deprioritized to ensure core authentication flow was fully functional and tested
- Team focused on delivering a complete end-to-end authentication experience first
- Profile management features deferred to Sprint 2 as they are not blocking other features

### Backend
- [ ] **BE-6:** User Logout Endpoint

**Reasons:**
- Team focused on completing core authentication endpoints with comprehensive testing
- Additional time spent on implementing proper error handling and security measures
- Logout endpoint deferred to Sprint 2

Submission Links :

Github Repository:
https://github.com/ashrithanarne/DestPlanner

Demo Video: 
https://drive.google.com/file/d/1XQCNaxZp0BWVaGUecmymmHQpyYEHQJOb/view
