# Backend Documentation - Employment Fair System

## Project Information
- **Project Name**: employment-fair
- **Platform**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Default Event ID**: `aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5`

---

## Table of Contents
1. [Database Schema](#database-schema)
2. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
3. [Storage Buckets](#storage-buckets)
4. [Authentication System](#authentication-system)
5. [Edge Functions](#edge-functions)
6. [Database Functions & Triggers](#database-functions--triggers)
7. [API Operations](#api-operations)

---

## Database Schema

### Core Tables

#### 1. **user_profiles**
Stores profile information for all users across all roles.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  personal_id TEXT NOT NULL UNIQUE,
  preferred_language TEXT DEFAULT 'en',
  score INTEGER DEFAULT 0,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_personal_id ON user_profiles(personal_id);
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);
```

**Columns:**
- `id` (UUID, PK): References auth.users.id
- `full_name` (TEXT): Full name of the user
- `phone` (TEXT, UNIQUE): Phone number
- `personal_id` (TEXT, UNIQUE): National ID or student ID
- `preferred_language` (TEXT): User's preferred language ('en' or 'ar')
- `score` (INTEGER): Gamification points
- `profile_photo_url` (TEXT): URL to profile photo in storage
- `created_at` (TIMESTAMPTZ): Account creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

---

#### 2. **user_roles**
Maps users to roles for specific events.

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'attendee', 
    'volunteer', 
    'registration', 
    'building', 
    'info_desk', 
    'verification', 
    'team_leader', 
    'admin', 
    'sadmin', 
    'employer',
    'ushers',
    'marketing',
    'media',
    'ER',
    'BD team',
    'catering',
    'feedback',
    'stage'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_event_id ON user_roles(event_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
```

**Columns:**
- `id` (UUID, PK): Unique ID
- `user_id` (UUID, FK): References auth.users
- `event_id` (UUID): Event identifier
- `role` (TEXT): User's role (see enum values above)
- `created_at` (TIMESTAMPTZ): Role assignment timestamp

---

#### 3. **attendees**
Stores attendee-specific information.

```sql
CREATE TABLE attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_asu_student BOOLEAN DEFAULT FALSE,
  student_id TEXT,
  university TEXT NOT NULL,
  faculty TEXT NOT NULL,
  department TEXT,
  degree_level TEXT,
  class_year TEXT,
  cv_url TEXT,
  enrollment_proof_url TEXT,
  registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed')),
  event_entry BOOLEAN DEFAULT FALSE,
  building_entry BOOLEAN DEFAULT FALSE,
  first_building_entry_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_attendees_user_id ON attendees(user_id);
CREATE INDEX idx_attendees_university ON attendees(university);
CREATE INDEX idx_attendees_faculty ON attendees(faculty);
CREATE INDEX idx_attendees_registration_status ON attendees(registration_status);
```

**Columns:**
- `id` (UUID, PK): Unique attendee ID
- `user_id` (UUID, UNIQUE, FK): References auth.users
- `is_asu_student` (BOOLEAN): Whether attending Ain Shams University
- `student_id` (TEXT): Student ID number
- `university` (TEXT): University name
- `faculty` (TEXT): Faculty/college name
- `department` (TEXT): Department/major
- `degree_level` (TEXT): 'student' or 'graduate'
- `class_year` (TEXT): Class or graduation year
- `cv_url` (TEXT): URL to uploaded CV
- `enrollment_proof_url` (TEXT): URL to university ID proof
- `registration_status` (TEXT): 'pending', 'approved', 'rejected'
- `payment_status` (TEXT): 'pending', 'completed', 'failed' (for non-ASU students)
- `event_entry` (BOOLEAN): Whether entered event
- `building_entry` (BOOLEAN): Whether entered building
- `first_building_entry_time` (TIMESTAMPTZ): First building entry timestamp
- `created_at` (TIMESTAMPTZ): Registration timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

---

#### 4. **volunteers**
Stores volunteer-specific information.

```sql
CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  full_name TEXT NOT NULL,
  volunteer_id TEXT UNIQUE,
  total_points INTEGER DEFAULT 0,
  hours_volunteered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_volunteers_user_id ON volunteers(user_id);
CREATE INDEX idx_volunteers_team_id ON volunteers(team_id);
CREATE INDEX idx_volunteers_volunteer_id ON volunteers(volunteer_id);
```

**Columns:**
- `id` (UUID, PK): Unique volunteer ID
- `user_id` (UUID, UNIQUE, FK): References auth.users
- `team_id` (UUID, FK): References teams table
- `full_name` (TEXT): Volunteer's full name
- `volunteer_id` (TEXT, UNIQUE): Custom volunteer ID (auto-generated or manual)
- `total_points` (INTEGER): Total points earned
- `hours_volunteered` (INTEGER): Total volunteer hours
- `created_at` (TIMESTAMPTZ): Registration timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

---

#### 5. **teams**
Stores volunteer team information.

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL UNIQUE,
  description TEXT,
  team_leader_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-defined Teams
INSERT INTO teams (id, team_name, description) VALUES
  ('f9419a07-f974-4f59-bba2-b2f9a2b2fa7f', 'Building Team', 'Manages building access and session entry'),
  ('fc15e3bb-ceed-4aa3-acf5-004a7af664ed', 'Registration Team', 'Handles event registration and check-in'),
  ('9269ac6a-7b2c-4be5-ab72-3f8278eb8e33', 'Info Desk', 'Provides information and session management'),
  ('a0abd4b7-7879-4a07-806d-fd0e2f4257f1', 'Verification Team', 'Verifies attendee credentials');
```

**Columns:**
- `id` (UUID, PK): Team ID
- `team_name` (TEXT, UNIQUE): Team name
- `description` (TEXT): Team description
- `team_leader_id` (UUID, FK): References auth.users (team leader)
- `created_at` (TIMESTAMPTZ): Creation timestamp

---

#### 6. **companies**
Stores information about participating companies.

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_key TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  booth_number TEXT,
  partner_type TEXT CHECK (partner_type IN ('Platinum', 'Gold', 'Silver', 'Bronze', 'Partner')),
  faculties_seeking TEXT[],
  vacancies_types TEXT[],
  attendance_days INTEGER[],
  hr_emails TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_companies_company_key ON companies(company_key);
CREATE INDEX idx_companies_partner_type ON companies(partner_type);
```

**Columns:**
- `id` (UUID, PK): Company ID
- `company_name` (TEXT): Company name
- `company_key` (TEXT, UNIQUE): Unique key for employer registration
- `logo_url` (TEXT): URL to company logo
- `description` (TEXT): Company description
- `website` (TEXT): Company website
- `booth_number` (TEXT): Event booth number
- `partner_type` (TEXT): Partnership tier
- `faculties_seeking` (TEXT[]): Target academic faculties
- `vacancies_types` (TEXT[]): Types of job openings
- `attendance_days` (INTEGER[]): Days attending event (1-5)
- `hr_emails` (TEXT[]): HR contact emails
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

#### 7. **employer**
Maps employers to companies.

```sql
CREATE TABLE employer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_employer_user_id ON employer(user_id);
CREATE INDEX idx_employer_company_id ON employer(company_id);
```

**Columns:**
- `id` (UUID, PK): Employer ID
- `user_id` (UUID, UNIQUE, FK): References auth.users
- `company_id` (UUID, FK): References companies
- `job_title` (TEXT): Employer's job title
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

#### 8. **sessions**
Bookable workshop/seminar sessions.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  speaker_name TEXT,
  speaker_photo_url TEXT,
  speaker_linkedin_url TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  session_type TEXT CHECK (session_type IN ('Workshop', 'Seminar', 'Panel Discussion', 'Networking', 'Other')),
  max_attendees INTEGER NOT NULL DEFAULT 100,
  current_bookings INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_event_id ON sessions(event_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
```

**Columns:**
- `id` (UUID, PK): Session ID
- `event_id` (UUID): Event ID
- `title` (TEXT): Session title
- `description` (TEXT): Session description
- `speaker_name` (TEXT): Speaker name
- `speaker_photo_url` (TEXT): Speaker photo URL
- `speaker_linkedin_url` (TEXT): Speaker LinkedIn profile
- `start_time`, `end_time` (TIMESTAMPTZ): Session timing
- `location` (TEXT): Session location/room
- `session_type` (TEXT): Type of session
- `max_attendees` (INTEGER): Maximum capacity
- `current_bookings` (INTEGER): Current number of bookings
- `is_active` (BOOLEAN): Whether session is active
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

#### 9. **session_bookings**
Tracks user session bookings.

```sql
CREATE TABLE session_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  booking_status TEXT DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'cancelled', 'attended')),
  attended BOOLEAN DEFAULT FALSE,
  attended_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

-- Indexes
CREATE INDEX idx_session_bookings_user_id ON session_bookings(user_id);
CREATE INDEX idx_session_bookings_session_id ON session_bookings(session_id);
CREATE INDEX idx_session_bookings_status ON session_bookings(booking_status);
```

**Columns:**
- `id` (UUID, PK): Booking ID
- `user_id` (UUID, FK): References auth.users
- `session_id` (UUID, FK): References sessions
- `booking_status` (TEXT): 'confirmed', 'cancelled', 'attended'
- `attended` (BOOLEAN): Whether user attended
- `attended_at` (TIMESTAMPTZ): Attendance timestamp
- `scanned_by` (UUID, FK): User who scanned attendance
- `created_at` (TIMESTAMPTZ): Booking timestamp

---

#### 10. **schedule_items**
Non-bookable schedule items (talks, breaks, etc.).

```sql
CREATE TABLE schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  speaker_name TEXT,
  speaker_photo_url TEXT,
  speaker_linkedin_url TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  item_type TEXT CHECK (item_type IN ('Opening Ceremony', 'Keynote', 'Talk', 'Break', 'Networking', 'Closing', 'Other')),
  day_number INTEGER CHECK (day_number BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_schedule_items_event_id ON schedule_items(event_id);
CREATE INDEX idx_schedule_items_day_number ON schedule_items(day_number);
CREATE INDEX idx_schedule_items_start_time ON schedule_items(start_time);
```

---

#### 11. **user_activities**
Tracks all user activities and point transactions.

```sql
CREATE TABLE user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'recruit_attendee',
    'event_entry',
    'building_entry',
    'session_attendance',
    'session_scan',
    'bonus',
    'penalty',
    'other'
  )),
  description TEXT,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_event_id ON user_activities(event_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at DESC);

-- Trigger to update user_profiles.score
CREATE OR REPLACE FUNCTION update_user_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET score = score + NEW.points_earned
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_score
AFTER INSERT ON user_activities
FOR EACH ROW
EXECUTE FUNCTION update_user_score();
```

**Columns:**
- `id` (UUID, PK): Activity ID
- `user_id` (UUID, FK): References auth.users
- `event_id` (UUID): Event ID
- `activity_type` (TEXT): Type of activity
- `description` (TEXT): Activity description
- `points_earned` (INTEGER): Points awarded/deducted
- `created_at` (TIMESTAMPTZ): Activity timestamp

---

#### 12. **announcements**
System announcements.

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'role', 'custom')),
  target_role TEXT,
  target_users UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_announcements_sender_id ON announcements(sender_id);
CREATE INDEX idx_announcements_target_type ON announcements(target_type);
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
```

---

#### 13. **attendance_logs**
Logs for entry/exit tracking.

```sql
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('enter', 'exit', 'building_enter', 'building_exit', 'session_enter')),
  scanned_by UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_attendance_logs_attendee_id ON attendance_logs(attendee_id);
CREATE INDEX idx_attendance_logs_action ON attendance_logs(action);
CREATE INDEX idx_attendance_logs_created_at ON attendance_logs(created_at DESC);
```

---

## Row Level Security (RLS) Policies

### user_profiles

```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'sadmin', 'team_leader')
  )
);

-- Service role can insert (for registration)
CREATE POLICY "Service can insert profiles"
ON user_profiles FOR INSERT
WITH CHECK (true);
```

### attendees

```sql
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;

-- Users can read their own attendee record
CREATE POLICY "Users can view own attendee record"
ON attendees FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own record
CREATE POLICY "Users can update own record"
ON attendees FOR UPDATE
USING (user_id = auth.uid());

-- Registration team can view and update
CREATE POLICY "Registration team full access"
ON attendees FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('registration', 'building', 'info_desk', 'admin', 'sadmin')
  )
);

-- Service role can insert
CREATE POLICY "Service can insert attendees"
ON attendees FOR INSERT
WITH CHECK (true);
```

### volunteers

```sql
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Volunteers can read their own record
CREATE POLICY "Volunteers can view own record"
ON volunteers FOR SELECT
USING (user_id = auth.uid());

-- Team leaders and admins can view all
CREATE POLICY "Leaders can view all volunteers"
ON volunteers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('team_leader', 'admin', 'sadmin')
  )
);

-- Service role can insert
CREATE POLICY "Service can insert volunteers"
ON volunteers FOR INSERT
WITH CHECK (true);
```

### sessions

```sql
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Everyone can read active sessions
CREATE POLICY "Public can view active sessions"
ON sessions FOR SELECT
USING (is_active = true);

-- Only admins can modify sessions
CREATE POLICY "Admins can manage sessions"
ON sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'sadmin')
  )
);
```

### session_bookings

```sql
ALTER TABLE session_bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON session_bookings FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own bookings
CREATE POLICY "Users can create bookings"
ON session_bookings FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can cancel their own bookings
CREATE POLICY "Users can cancel own bookings"
ON session_bookings FOR UPDATE
USING (user_id = auth.uid());

-- Info desk and admins can manage all bookings
CREATE POLICY "Staff can manage bookings"
ON session_bookings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('info_desk', 'building', 'admin', 'sadmin')
  )
);
```

### user_activities

```sql
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Users can view their own activities
CREATE POLICY "Users can view own activities"
ON user_activities FOR SELECT
USING (user_id = auth.uid());

-- Volunteers and staff can insert activities
CREATE POLICY "Staff can insert activities"
ON user_activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('volunteer', 'registration', 'building', 'info_desk', 'team_leader', 'admin', 'sadmin')
  )
);

-- Admins can view all activities
CREATE POLICY "Admins can view all activities"
ON user_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'sadmin', 'team_leader')
  )
);
```

---

## Storage Buckets

### Users Bucket
Stores user-uploaded files (CVs, university IDs, profile photos).

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('Users', 'Users', true);

-- RLS Policies
-- Users can upload to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Users'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'Users'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all files
CREATE POLICY "Admins can view all files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'Users'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'sadmin')
  )
);
```

**Folder Structure:**
- `{user_id}/CV/` - CV files
- `{user_id}/Uni_ID/` - University ID proof files
- `{user_id}/profile/` - Profile photos

---

## Authentication System

### Registration Flows

#### Attendee Registration
1. Create auth user with role='attendee' in user_metadata
2. Create user_profiles record
3. Create attendees record
4. Assign 'attendee' role in user_roles
5. Upload files (CV, university ID) to storage
6. Process referral if volunteer_id provided

#### Volunteer Registration
1. Create auth user with appropriate role based on team
2. Create user_profiles record
3. Create volunteers record with team assignment
4. Assign volunteer role in user_roles (team-specific)
5. Auto-generate volunteer_id if needed

#### Employer Registration
1. Validate company_key exists in companies table
2. Create auth user with role='employer'
3. Create user_profiles record
4. Create employer record linked to company
5. Assign 'employer' role in user_roles

### Login Flow
1. Authenticate via Supabase Auth
2. Fetch user role from user_roles table
3. Fetch user profile from user_profiles
4. Return user object with embedded role
5. Redirect to role-based dashboard

### Password Reset
1. User requests reset via email
2. Supabase sends magic link to email
3. User clicks link (redirects to `/reset-password`)
4. User sets new password
5. Auto-login and redirect to dashboard

---

## Edge Functions

### 1. handle-referral
Awards points to volunteers who refer attendees.

**Trigger:** After attendee registration with volunteer_id
**Logic:**
1. Find volunteer by volunteer_id
2. Insert activity record with points
3. Trigger updates volunteer.total_points

### 2. update-session-capacity
Updates session current_bookings count.

**Trigger:** After session_bookings INSERT/DELETE
**Logic:**
1. Count active bookings for session
2. Update sessions.current_bookings

### 3. send-announcement
Sends announcements to targeted users.

**Input:**
- title, message, target_type, target_role, target_users

**Logic:**
1. Validate sender has permission
2. Insert announcement record
3. Send notifications (email/push) to targets

---

## Database Functions & Triggers

### 1. update_user_score()
**Trigger:** AFTER INSERT ON user_activities
**Purpose:** Automatically updates user_profiles.score when points are awarded

```sql
CREATE OR REPLACE FUNCTION update_user_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET score = score + NEW.points_earned
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. update_volunteer_points()
**Trigger:** AFTER INSERT ON user_activities
**Purpose:** Updates volunteers.total_points

```sql
CREATE OR REPLACE FUNCTION update_volunteer_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE volunteers
  SET total_points = total_points + NEW.points_earned
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. update_session_bookings_count()
**Trigger:** AFTER INSERT/DELETE ON session_bookings
**Purpose:** Maintains sessions.current_bookings count

```sql
CREATE OR REPLACE FUNCTION update_session_bookings_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sessions
    SET current_bookings = current_bookings + 1
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sessions
    SET current_bookings = GREATEST(current_bookings - 1, 0)
    WHERE id = OLD.session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### 4. update_timestamps()
**Trigger:** BEFORE UPDATE ON multiple tables
**Purpose:** Automatically updates updated_at timestamp

```sql
CREATE OR REPLACE FUNCTION update_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER set_timestamp_user_profiles
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER set_timestamp_attendees
BEFORE UPDATE ON attendees
FOR EACH ROW EXECUTE FUNCTION update_timestamps();
-- ... (repeat for other tables with updated_at)
```

---

## API Operations

### Authentication

#### registerAttendee(data)
**Input:** `AttendeeRegistrationData`
**Returns:** `AuthResult`
**Steps:**
1. Create auth user
2. Create user profile
3. Create attendee record
4. Assign role
5. Upload files (CV, enrollment proof)
6. Process referral if volunteer_id provided
7. Return auth data and session

#### registerVolunteer(data)
**Input:** `VolunteerRegistrationData`
**Returns:** `AuthResult`
**Steps:**
1. Determine role from team_id
2. Create auth user
3. Create user profile
4. Create volunteer record
5. Assign volunteer role
6. Return auth data

#### registerEmployer(data)
**Input:** `EmployerRegistrationData`
**Returns:** `AuthResult`
**Steps:**
1. Validate company_key
2. Create auth user
3. Create user profile
4. Create employer record
5. Assign employer role
6. Return auth data

#### signInUser(email, password)
**Returns:** `AuthResult`
**Steps:**
1. Authenticate via Supabase Auth
2. Fetch user role from user_roles
3. Fetch user profile
4. Return user with embedded role

#### signOutUser()
Logs out current user.

#### resetPassword(email)
Sends password reset email.

### Attendee Search & Attendance

#### getAttendeeByPersonalId(personalId)
Fetches attendee by national ID.

#### getAttendeeByUUID(uuid)
Fetches attendee by user or attendee ID.

#### searchAttendeesByPersonalId(query)
Searches attendees (returns up to 5 results).

#### processAttendance(personalId, action)
Records entry/exit action.

### File Upload

#### uploadFile(category, userId, file)
**Categories:** 'CV', 'Uni_ID'
**Logic:**
1. Validate file type and size
2. Generate unique filename
3. Upload to `Users` bucket
4. Return public URL

### Session Management

#### bookSession(userId, sessionId)
Books user into session if capacity available.

#### cancelBooking(userId, sessionId)
Cancels session booking.

#### recordSessionAttendance(userId, sessionId, scannedBy)
Records session attendance.

### User Activities

#### awardPoints(userId, activityType, points, description)
Awards points to user and logs activity.

### Rankings

#### getUserRankingAndScore(userId)
Returns user's score and rank among all users or within their role.

---

## Points System

### Point Awards

| Activity | Points | Notes |
|----------|--------|-------|
| Recruit Attendee | 10 | Volunteer referral |
| Event Entry (First Time) | 5 | First event entry |
| Building Entry (First Time) | 10 | First building entry |
| Session Attendance | 15 | Attending booked session |
| Session Scan | 5 | For volunteer scanning attendee |
| Bonus (Manual) | Variable | Team leader award |

### Leaderboards
- Global leaderboard (all users)
- Role-specific leaderboards (attendees, volunteers)
- Daily/weekly top performers

---

## Dashboard Role Mapping

| Role | Route | Features |
|------|-------|----------|
| attendee | `/attendee` | QR code, schedule, sessions, companies, map, points |
| volunteer | `/volunteer` | Points, rank, activities, role info |
| registration | `/regteam` | QR scanner, attendee search, entry/exit logging |
| building | `/buildteam` | Building entry, session entry scanning |
| info_desk | `/infodesk` | Session management, booking management |
| team_leader | `/teamleader` | Team management, attendance, bonuses, announcements |
| admin | `/secure-9821panel` | Full system management |
| sadmin | `/super-ctrl-92k1x` | System administration |
| employer | `/employer` | Company dashboard, attendee review |

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Database Indexes Summary

Key indexes for performance:
- `user_profiles`: personal_id, phone
- `user_roles`: user_id, event_id, role
- `attendees`: user_id, university, faculty, registration_status
- `volunteers`: user_id, team_id, volunteer_id
- `sessions`: event_id, start_time, is_active
- `session_bookings`: user_id, session_id, booking_status
- `user_activities`: user_id, event_id, activity_type, created_at
- `attendance_logs`: attendee_id, action, created_at

---

## Future Enhancements

1. **Real-time Notifications**: Supabase Realtime for live updates
2. **Analytics Dashboard**: Advanced reporting and insights
3. **Mobile App**: React Native integration
4. **QR Generation**: Server-side QR code generation
5. **Email Notifications**: Automated email system for bookings/announcements
6. **Check-in Kiosks**: Self-service check-in stations
7. **Feedback System**: Post-event surveys and ratings
8. **Certificate Generation**: Automated attendance certificates

---

**Last Updated:** 2026-02-08  
**Version:** 1.0
