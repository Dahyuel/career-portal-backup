# ASU Career Week - Event Management System

A comprehensive event management platform for Ain Shams University Career Week. The system provides role-based dashboards for attendees, volunteers, team leaders, and administrators with features including QR-based attendance tracking, session management, and real-time analytics.

---

## Table of Contents

1. [Authentication System](#authentication-system)
2. [User Roles Overview](#user-roles-overview)
3. [Attendee Dashboard](#attendee-dashboard)
4. [Volunteer Dashboards](#volunteer-dashboards)
5. [Registration Team Dashboard](#registration-team-dashboard)
6. [Building Team Dashboard](#building-team-dashboard)
7. [Info Desk Dashboard](#info-desk-dashboard)
8. [Team Leader Dashboard](#team-leader-dashboard)
9. [Admin Panel](#admin-panel)
10. [Super Admin Panel](#super-admin-panel)
11. [Shared Components](#shared-components)

---

## Authentication System

### Login Page (`/login`)

**Component:** `LoginForm.tsx`

| Element | Type | Action |
|---------|------|--------|
| Email Input | Text Field | Captures user email for authentication |
| Password Input | Password Field | Captures user password (with toggle visibility) |
| Eye/EyeOff Button | Icon Button | Toggles password visibility |
| Sign In Button | Submit Button | Submits credentials, validates form, authenticates user via Supabase |
| Forgot Password Link | Link Button | Navigates to `/forgot-password` for password recovery |
| Create Attendee Account Link | Link Button | Navigates to `/auth-register` for new attendee registration |

**Logic Flow:**
1. User enters email and password
2. Form validates email format and password requirements
3. On submit, `signIn()` from AuthContext authenticates via Supabase
4. System checks user authorization status (attendee-only restriction for eligible universities)
5. If unauthorized (not from eligible university), displays "Account Disabled" screen
6. If authorized, redirects to role-based dashboard using `getRoleBasedRedirect()`

**Authorization Check:**
- Attendees must be from eligible universities: Ain Shams, Helwan, Banha, or Canadian Ahram
- Non-attendee roles are always authorized
- Unauthorized users see a blocked access screen with "Return to Login" button

---

### Attendee Registration Flow

#### Step 1: Auth Registration (`/auth-register`)

**Component:** `AuthRegistration.tsx`

| Element | Type | Action |
|---------|------|--------|
| First Name Input | Text Field | Captures user's first name |
| Last Name Input | Text Field | Captures user's last name |
| Email Input | Text Field | Captures user email |
| Password Input | Password Field | Captures password (min 8 chars) |
| Confirm Password Input | Password Field | Must match password |
| Create Account Button | Submit Button | Creates Supabase auth account with `attendee` role |
| Login Link | Link Button | Navigates to `/login` |

**Validation:**
- First/Last name: Required, minimum length
- Email: Valid email format
- Password: Minimum 8 characters
- Confirm Password: Must match password

#### Step 2: Profile Registration (`/attendee-register`)

**Component:** `RegistrationForm.tsx`

A multi-step registration form with 3 sections:

**Section 1 - Personal Information:**
| Element | Type | Action |
|---------|------|--------|
| First Name | Text Field | Pre-filled from auth, editable |
| Last Name | Text Field | Pre-filled from auth, editable |
| Email | Text Field | Read-only, from auth |
| Phone Number | Tel Input | Egyptian phone format validation |
| Gender | Select | Male/Female selection |
| National ID | Text Field | 14-digit Egyptian ID validation |
| Profile Photo | File Upload | Optional profile image |

**Section 2 - Academic Information:**
| Element | Type | Action |
|---------|------|--------|
| University | Select | Dropdown of available universities |
| Faculty | Select | Faculty options (dynamic based on university) |
| Degree Level | Select | Student or Graduate |
| Class/Graduation Year | Select | Dynamic: class year for students, graduation year for graduates |
| Upload University ID | File Upload | PDF/Image of university card (required) |

**Section 3 - Event Information:**
| Element | Type | Action |
|---------|------|--------|
| How Did You Hear About This Event | Select | Marketing channel tracking |
| Upload CV | File Upload | Optional CV in PDF format |
| Submit Registration | Submit Button | Completes profile and redirects to Attendee Dashboard |

**Navigation Buttons:**
- **Next Button:** Validates current section, moves to next step
- **Previous Button:** Returns to previous section
- **Logout Button:** Signs out and returns to login

---

### Volunteer Registration Flow

#### Step 1: Volunteer Auth Registration (`/volunteer-auth-register`)

**Component:** `VolunteerAuthRegistration.tsx`

| Element | Type | Action |
|---------|------|--------|
| First Name Input | Text Field | Volunteer's first name |
| Last Name Input | Text Field | Volunteer's last name |
| Email Input | Text Field | Volunteer's email |
| Password Input | Password Field | Account password |
| Confirm Password Input | Password Field | Password confirmation |
| Create Account Button | Submit Button | Creates account with `volunteer` role |
| Login Link | Link Button | Navigates to `/login` |

#### Step 2: Volunteer Profile Registration (`/V0lunt33ringR3g`)

**Component:** `VolunteerRegistration.tsx` (located in pages/volunteer)

Similar to attendee registration but with volunteer-specific fields.

---

### Password Recovery

#### Forgot Password (`/forgot-password`)

**Component:** `ForgotPasswordForm.tsx`

| Element | Type | Action |
|---------|------|--------|
| Email Input | Text Field | Email for password reset |
| Send Reset Link Button | Submit Button | Sends password reset email via Supabase |
| Back to Login Link | Link Button | Returns to login page |

#### Reset Password (`/reset-password`)

**Component:** `ResetPasswordForm.tsx`

| Element | Type | Action |
|---------|------|--------|
| New Password Input | Password Field | New password entry |
| Confirm Password Input | Password Field | Password confirmation |
| Reset Password Button | Submit Button | Updates password via Supabase |

---

## User Roles Overview

| Role | Route | Dashboard | Description |
|------|-------|-----------|-------------|
| `attendee` | `/attendee` | AttendeeDashboard | Event attendees - students and graduates |
| `volunteer` | `/volunteer` | VolunteerDashboard | General volunteers |
| `ushers` | `/volunteer` | VolunteerDashboard | Usher volunteers |
| `marketing` | `/volunteer` | VolunteerDashboard | Marketing team |
| `media` | `/volunteer` | VolunteerDashboard | Media/photography team |
| `ER` | `/volunteer` | VolunteerDashboard | Employer Relations team |
| `BD team` | `/volunteer` | VolunteerDashboard | Business Development team |
| `catering` | `/volunteer` | VolunteerDashboard | Catering team |
| `feedback` | `/volunteer` | VolunteerDashboard | Feedback collection team |
| `stage` | `/volunteer` | VolunteerDashboard | Stage management team |
| `registration` | `/regteam` | RegTeamDashboard | Registration/check-in team |
| `building` | `/buildteam` | BuildTeamDashboard | Building/venue management |
| `info_desk` | `/infodesk` | InfoDeskDashboard | Information desk staff |
| `team_leader` | `/teamleader` | TeamLeaderDashboard | Team leaders/supervisors |
| `admin` | `/secure-9821panel` | AdminPanel | System administrators |
| `sadmin` | `/super-ctrl-92k1x` | SuperAdminPanel | Super administrators |

---

## Attendee Dashboard

**Route:** `/attendee`  
**Component:** `AttendeeDashboard.tsx`  
**Access:** Users with `attendee` role

### Components Used

- `DashboardLayout` - Wrapper with header, navigation, profile menu
- `QRCodeLib` - QR code generation
- `createPortal` - Modal rendering

### Dashboard Tabs

#### 1. Home Tab

| Component | Description |
|-----------|-------------|
| Score Card | Displays user's points earned |
| Rank Card | Shows user's ranking among all attendees |
| Recent Activities List | Shows last 5 point-earning activities with timestamps |
| QR Code Modal | Displays user's unique QR code for scanning |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Show QR Button | Opens modal displaying user's QR code for event check-in |

#### 2. Schedule Tab

| Component | Description |
|-----------|-------------|
| Day Filter | Buttons for Day 1-5 selection |
| Event Cards | Shows all schedule items for selected day |
| Event Details Modal | Popup with speaker info, time, location |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Day 1-5 Buttons | Filters schedule by event day |
| Event Card Click | Opens event details modal |
| Speaker LinkedIn Button | Opens speaker's LinkedIn profile (if available) |

#### 3. Sessions Tab

| Component | Description |
|-----------|-------------|
| Day Filter | Buttons for Day 1-5 selection |
| Session Cards | Displays bookable sessions with capacity info |
| Session Details Modal | Shows session info with booking option |
| My Bookings Section | Lists user's booked sessions |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Session Card Click | Opens session details modal |
| Book Session Button | Books session if capacity available |
| Cancel Booking Button | Cancels existing session booking |

#### 4. Companies Tab

| Component | Description |
|-----------|-------------|
| Day Filter | Buttons for Day 1-5 filtering |
| Partner Type Filter | Filters by partner category |
| Faculty Filter | Filters by academic faculties seeking |
| Company Cards | Displays participating companies |
| Company Details Modal | Full company info with jobs info |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Day Filter Buttons | Filters companies by attendance day |
| Partner Type Dropdown | Filters by partner category |
| Faculty Dropdown | Filters by target faculties |
| Company Card Click | Opens company details modal |
| Website Button | Opens company's website |
| HR Email Buttons | Opens email client to HR contacts |

#### 5. Map Tab

| Component | Description |
|-----------|-------------|
| Day Selector | Tabs for Day 1-5 |
| Venue Map Image | Interactive map image for selected day |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Day Tab Buttons | Switches to corresponding day's venue map |

---

## Volunteer Dashboards

**Route:** `/volunteer`  
**Component:** `VolunteerDashboard.tsx`  
**Access:** Multiple volunteer roles (ushers, marketing, media, ER, BD team, catering, feedback, stage)

### Components Used

- `DashboardLayout` - Shared dashboard wrapper
- `getUserRankingAndScore` - Fetches user's score and ranking
- `getRecentActivities` - Fetches activity history

### Dashboard Elements

| Component | Description |
|-----------|-------------|
| Points Card | Displays volunteer's earned points |
| Rank Card | Shows rank among all volunteers |
| Recent Activity Card | Shows latest point transaction |
| Recent Activities List | Full activity history with timestamps |
| Role Information Card | Role-specific thank you message and instructions |
| Volunteer ID Badge | Displays volunteer ID number |

**Dynamic Title:** Dashboard title changes based on role (e.g., "Marketing Dashboard", "Media Dashboard")

**Role-Specific Messages:**
Each volunteer role sees a customized information message explaining their responsibilities.

---

## Registration Team Dashboard

**Route:** `/regteam`  
**Component:** `RegTeamDashboard.tsx`  
**Access:** Users with `registration` role

### Components Used

- `DashboardLayout` - Dashboard wrapper
- `QRScanner` - Camera-based QR code scanner
- `AttendeeCard` - Attendee information display card

### Dashboard Features

| Component | Description |
|-----------|-------------|
| Search Input | Search attendees by National ID |
| QR Scanner Button | Opens camera for QR code scanning |
| Search Results Dropdown | Shows matching attendees during search |
| Attendee Info Card | Displays scanned/searched attendee details |
| Entry/Exit Buttons | Records attendance action |
| Success/Error Feedback | Visual feedback for actions |

### Buttons & Actions

| Element | Action |
|---------|--------|
| Search Input | Real-time search as user types National ID |
| Scan QR Button | Opens QR scanner overlay |
| Search Result Click | Selects attendee for action |
| Mark Entry Button | Records attendee entering the event venue |
| Mark Exit Button | Records attendee exiting the event venue |
| Clear Search Button | Resets current search/selection |

### Logic Flow

1. **QR Scan Mode:**
   - Click "Scan QR" to open camera
   - Scan attendee's QR code (contains user UUID)
   - System validates attendee (checks profile completion, authorization)
   - Display attendee info with current status
   - Select Entry or Exit action

2. **Manual Search Mode:**
   - Type National ID in search field
   - Select from dropdown results
   - Verify attendee information
   - Record Entry or Exit

### Validation Checks

- Profile must be complete
- User must be authorized
- User must have `attendee` role
- Invalid QR codes show error message

---

## Building Team Dashboard

**Route:** `/buildteam`  
**Component:** `BuildTeamDashboard.tsx`  
**Access:** Users with `building` role

### Components Used

- `DashboardLayout` - Dashboard wrapper
- `QRScanner` - QR code scanning
- `AttendeeCard` - Attendee display
- `createPortal` - Modal rendering

### Dashboard Tabs

#### 1. Building Entry Tab

Manages attendee entry/exit to the conference building.

| Component | Description |
|-----------|-------------|
| Search Input | Search by National ID |
| QR Scanner | Camera-based QR scanning |
| Attendee Card | Shows attendee building status |
| Entry/Exit Buttons | Records building attendance |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Scan QR Button | Opens QR scanner for building check-in |
| Mark Building Entry | Records attendee entering building (awards bonus points) |
| Mark Building Exit | Records attendee leaving building |
| Clear Button | Resets current selection |

#### 2. Session Entry Tab

Manages attendee entry to specific sessions.

| Component | Description |
|-----------|-------------|
| Session Selector | Dropdown to select active session |
| Search Input | Search attendee by National ID |
| QR Scanner | Camera-based QR scanning |
| Booking Status | Shows if attendee booked the session |
| Attendance Status | Shows if already attended |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Session Dropdown | Selects which session to manage |
| Scan QR Button | Opens scanner for session check-in |
| Confirm Session Entry | Records session attendance (awards bonus if booked) |
| Clear Button | Resets selection |

### Bonus Points System

- **First Building Entry:** Awards bonus points to volunteer
- **Session Entry (with booking):** Awards bonus to attendee
- **Session Entry Recording:** Awards points to volunteer

---

## Info Desk Dashboard

**Route:** `/infodesk`  
**Component:** `InfoDeskDashboard.tsx`  
**Access:** Users with `info_desk` role

### Components Used

- `DashboardLayout` - Dashboard wrapper
- `QRScanner` - QR code scanning
- `supabase` - Database operations

### Dashboard Features

| Component | Description |
|-----------|-------------|
| Session Cards Grid | All available sessions with capacity |
| Session Details Modal | Selected session information |
| Attendee Search | Search to add/remove from session |
| QR Scanner | Quick attendee lookup |
| Attendees List Modal | View all session attendees |

### Session Card Information

Each session card displays:
- Session title and speaker
- Date and time
- Location
- Current bookings / Max capacity
- Capacity indicator (warning at 80%, full at 100%)

### Buttons & Actions

| Element | Action |
|---------|--------|
| Session Card Click | Opens session management modal |
| Scan QR Button | Opens scanner to find attendee |
| Search Input | Search attendee by National ID |
| Add to Session Button | Books attendee into selected session |
| Remove from Session Button | Removes attendee's booking |
| View Attendees Button | Opens list of all session attendees |
| Remove Attendee (in list) | Removes specific attendee from session |

### Attendees List View

| Component | Description |
|-----------|-------------|
| Attendees Count | Total attendees in session |
| Attendee Cards | Individual attendee info with status |
| Session Entry Status | Shows if attendee has entered session |
| Remove Button | Removes attendee booking |

---

## Team Leader Dashboard

**Route:** `/teamleader`  
**Component:** `TeamLeaderDashboard.tsx`  
**Access:** Users with `team_leader` role

### Components Used

- `DashboardLayout` - Dashboard wrapper
- `QRScanner` - QR code scanning
- `sendAnnouncement` - Announcement API
- `getDynamicBuildingStats` - Building statistics

### Dashboard Tabs

#### 1. Team Tab

Manage team members under the leader's supervision.

| Component | Description |
|-----------|-------------|
| Team Members Grid | All team members with status |
| Member Card | Individual member info with score |
| Member Actions | Quick actions per member |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Member Card Click | Opens member details modal |
| View Profile Button | Shows full member profile |
| Assign Bonus Button | Opens bonus assignment for member |
| Mark Attendance Button | Records member's attendance |

#### 2. Dashboard Tab

Real-time building and statistics overview.

| Component | Description |
|-----------|-------------|
| Building Stats Cards | Current occupancy for each building |
| Day Statistics | Entry/Exit counts by day |
| Session Statistics | Session attendance overview |

#### 3. Attendance Tab

Record volunteer attendance via QR or manual search.

| Component | Description |
|-----------|-------------|
| Date Selector | Select attendance date |
| QR Scanner | Scan volunteer QR code |
| Search Input | Search volunteer by ID |
| Attendance Records Table | All attendance for selected date |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Scan QR Button | Opens scanner for attendance recording |
| Search Button | Searches for volunteer |
| Mark Present Button | Records volunteer attendance |

#### 4. Bonus Tab

Assign bonus points to volunteers.

| Component | Description |
|-----------|-------------|
| Search Input | Find volunteer to reward |
| QR Scanner | Scan volunteer for bonus |
| Points Input | Enter bonus points amount |
| Description Input | Reason for bonus |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Scan QR Button | Opens scanner for bonus assignment |
| Search Button | Finds volunteer |
| Assign Bonus Button | Awards points to selected volunteer |

#### 5. Announcements Tab

Send announcements to team or specific users.

| Component | Description |
|-----------|-------------|
| Target Type Selector | All, Role-based, or Custom |
| Role Selector | Select target role (if role-based) |
| User Search | Find specific users (if custom) |
| Selected Users List | Shows selected recipients |
| Title Input | Announcement title |
| Message Input | Announcement body text |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Target Type Buttons | Switches between All/Role/Custom targeting |
| User Search | Searches users for custom targeting |
| Add User Button | Adds user to recipient list |
| Remove User Button | Removes user from list |
| Clear All Button | Clears selected users |
| Send Announcement Button | Sends announcement to selected targets |

---

## Admin Panel

**Route:** `/secure-9821panel`  
**Component:** `AdminPanel.tsx`  
**Access:** Users with `admin` role

### Components Used

- `DashboardLayout` - Dashboard wrapper
- `getDynamicBuildingStats` - Building occupancy
- `deleteCompany` - Company management
- `createPortal` - Modal rendering

### Dashboard Tabs

#### 1. Dashboard Tab

High-level statistics and current state.

| Component | Description |
|-----------|-------------|
| Stat Cards | Total users, sessions, attendees, volunteers |
| Current State Widget | Real-time building occupancy |
| Gender Distribution Chart | Male/Female breakdown |
| University Distribution | Attendees by university |
| Registration Trend | Sign-ups over time |

#### 2. Sessions Tab

Create and manage event sessions.

| Component | Description |
|-----------|-------------|
| Sessions List | All sessions with details |
| Create Session Form | Add new sessions |
| Edit Session Modal | Modify existing sessions |
| Delete Confirmation | Remove sessions |

**Session Form Fields:**
- Title, Description
- Speaker name, photo URL, LinkedIn URL
- Start/End time
- Location
- Session type (Workshop, Seminar, etc.)
- Max attendees

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Add Session Button | Opens create session form |
| Edit Button | Opens edit modal for session |
| Delete Button | Deletes session (with confirmation) |
| Save Button | Saves session changes |

#### 3. Schedule Tab

Manage event schedule items.

| Component | Description |
|-----------|-------------|
| Schedule Items List | Non-bookable schedule entries |
| Create Item Form | Add schedule items |
| Day Filter | Filter by event day |

**Schedule Item Fields:**
- Title, Description
- Speaker info
- Start/End time
- Location
- Item type (Opening, Talk, Break, etc.)

#### 4. Companies Tab

Manage participating companies.

| Component | Description |
|-----------|-------------|
| Companies Grid | All partner companies |
| Partner Type Filter | Filter by partner tier |
| Create Company Form | Add new companies |
| Edit Company Modal | Modify company details |

**Company Form Fields:**
- Company name
- Logo URL
- Description
- Website
- Booth number
- Partner type
- Academic faculties seeking
- Vacancies types
- Attendance days
- HR email contacts

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Add Company Button | Opens company creation form |
| Company Card Click | Opens edit modal |
| Delete Button | Removes company |
| View Website Button | Opens company website |

#### 5. Users Tab

View and manage all system users.

| Component | Description |
|-----------|-------------|
| User Filters | Filter by entry, building, university, faculty, day |
| User Search | Search by name/ID |
| Users Table | Paginated user list |
| User Details Modal | Full user information |
| Export Button | Download user data |

**Filter Options:**
- Event Entry status
- Building Entry status
- University
- Faculty
- Registration day
- Search term

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Filter Dropdowns | Applies selected filters |
| Search Input | Searches users |
| Reset Filters Button | Clears all filters |
| User Row Click | Opens user details |
| Export CSV Button | Downloads filtered users |
| Pagination Controls | Navigate through user pages |

#### 6. Announcements Tab

System-wide announcements.

| Component | Description |
|-----------|-------------|
| Target Selection | All, Role, or Custom targeting |
| User Search | For custom targeting |
| Message Composer | Title and body inputs |
| Send Button | Dispatches announcement |

#### 7. Statistics Tab

Detailed analytics and reports.

| Component | Description |
|-----------|-------------|
| Gender Distribution | Pie chart of attendees |
| University Stats | Bar chart by university |
| Faculty Distribution | Breakdown by faculty |
| Class Year Stats | Students by year |
| Daily Statistics | Entries/exits per day |
| Completion Rates | Profile completion stats |

---

## Super Admin Panel

**Route:** `/super-ctrl-92k1x`  
**Component:** `SuperAdminPanel.tsx`  
**Access:** Users with `sadmin` role

### Components Used

- `DashboardLayout` - Dashboard wrapper
- `supabase` - Direct database operations

### Dashboard Tabs

#### 1. System Overview Tab

System health and metrics.

| Component | Description |
|-----------|-------------|
| CPU Usage Gauge | Server CPU utilization |
| Memory Usage Gauge | RAM utilization |
| Disk Usage Gauge | Storage utilization |
| Network I/O | Network activity |
| Active Connections | Current database connections |
| Database Size | Total database size |

#### 2. Admin Users Tab

Manage admin-level accounts.

| Component | Description |
|-----------|-------------|
| Admin Users Table | All admin accounts |
| Permissions List | User permissions |
| Last Login | Activity tracking |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Create Admin Button | Opens admin creation form |
| Revoke Access Button | Removes admin privileges |
| Edit Permissions Button | Modifies user permissions |

#### 3. Security Logs Tab

Audit trail and security events.

| Component | Description |
|-----------|-------------|
| Security Logs Table | All security events |
| Risk Level Indicators | Color-coded risk levels |
| Event Details | IP address, timestamp, user info |

**Risk Levels:** Low, Medium, High, Critical (color-coded)

#### 4. Database Tab

Database maintenance operations.

| Component | Description |
|-----------|-------------|
| Database Stats | Size and connection info |
| Maintenance Actions | Optimization operations |

**Buttons/Actions:**
| Element | Action |
|---------|--------|
| Run Maintenance Button | Executes database optimization |
| Backup Button | Creates database backup |
| View Logs Button | Shows database logs |

---

## Shared Components

### DashboardLayout

**Component:** `components/shared/DashboardLayout.tsx`

Wraps all dashboard pages with consistent UI.

| Element | Description |
|---------|-------------|
| Header | Logo, title, user info |
| Mobile Menu Toggle | Hamburger menu for mobile |
| Profile Button | Opens profile dropdown |
| Notifications Bell | Opens notifications panel |
| Leaderboard Button | Opens leaderboard modal |
| QR Code Button | Shows user's QR code (attendees/volunteers) |
| Profile Dropdown | User info, settings, logout |

**Profile Dropdown Actions:**
| Element | Action |
|---------|--------|
| View Profile | Opens profile modal |
| Change Password | Opens password change form |
| Upload Documents | Upload ID/CV (attendees) |
| Leaderboard | View rankings |
| Sign Out | Logs out user |

**Notifications Panel:**
- Lists all announcements for user
- Mark as read on click
- Shows unread count badge

**Leaderboard Modal:**
- Top 10 users by points
- Current user's rank highlighted
- Filterable by role type

---

### QRScanner

**Component:** `components/shared/QRScanner.tsx`

Camera-based QR code scanning.

| Element | Action |
|---------|--------|
| Camera View | Live camera feed |
| Scan Overlay | Target area indicator |
| Close Button | Closes scanner |
| Auto-detection | Automatically reads QR codes |

---

### AttendeeCard

**Component:** `components/shared/AttendeeCard.tsx`

Displays attendee information after scan/search.

| Element | Description |
|---------|-------------|
| Profile Photo | User's photo or placeholder |
| Name | Full name |
| Personal ID | National ID |
| University | University name |
| Faculty | Faculty name |
| Current Status | Inside/Outside indicator |
| Entry Status Badges | Event/Building entry status |

---

### Leaderboard

**Component:** `components/shared/Leaderboard.tsx`

Rankings display component.

| Element | Description |
|---------|-------------|
| Top 3 Podium | Special styling for top 3 |
| Rankings List | All users with scores |
| Current User Highlight | User's position highlighted |
| Role Filter | Filter by user type |

---

### RoleChanger

**Route:** `/rolechangingform`  
**Component:** `RoleChanger.tsx`  
**Access:** Users with `marketing` or `team_leader` role

Allows converting attendee accounts to volunteer accounts.

| Element | Action |
|---------|--------|
| User ID Input | Enter attendee's ID to convert |
| New Role Selector | Select target volunteer role |
| Confirm Button | Processes role change |

---

## Technology Stack

- **Frontend:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State Management:** React Context (AuthContext)
- **Backend/Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **QR Codes:** qrcode library + @zxing/browser for scanning
- **Build Tool:** Vite
- **Icons:** Lucide React

---

## Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Security Notes

- Admin panel routes use obscured paths (`/secure-9821panel`, `/super-ctrl-92k1x`)
- Volunteer registration uses obscured path (`/V0lunt33ringR3g`)
- Role-based access control on all protected routes
- Attendee authorization checks against eligible universities
- All authentication handled through Supabase
