# Career Expo Portal

A multi-role web portal for managing university career fairs and employment expos. Built for Ain Shams University's Career Expo, it handles event registration, employer booths, job applications, session bookings, QR check-in, volunteer team management, feedback collection, and a full super-admin command center.

## Features

- **Public landing site** - Editable landing page with partners, speakers, and career-center info, driven by live event data.
- **Multi-role authentication** - Attendees, volunteers, employers, and five staff roles, routed per role after login.
- **Attendee registration** - Unified registration form with CV and university-ID uploads, approval workflows, and status screens (pending, confirmed, rejected, not eligible, payment required).
- **Employer portal** - Company profile onboarding, booth details, job posting/editing, and applicant management with attendee profile cards.
- **Session booking & QR check-in** - QR-code scanning (html5-qrcode, qr-scanner, jsQR) for event and session attendance.
- **Volunteer teams** - Registration, building, verification, tech-support, and team-leader dashboards with points, leaderboards, and activity logs.
- **Admin & super-admin panels** - Statistics, event reports, feedback management, activity logs, security center, data health, event controls, and editable landing/theme content.
- **Feedback system** - Configurable rating/text questions with per-question stats and respondent tracking.
- **Runtime theming** - Accent colors driven by CSS variables and applied from event data.
- **Maintenance mode** - Server-controlled maintenance gate with session caching and exempt paths.
- **Realtime access control** - Supabase realtime subscriptions revalidate roles, event membership, and registration status live.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite 7 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 3, PostCSS, Autoprefixer |
| Animation | Framer Motion |
| Icons | lucide-react |
| Backend | Supabase (Auth, Postgres, Storage, Realtime, RPC) |
| Charts | Recharts |
| QR | html5-qrcode, qr-scanner, jsQR, qrcode.react |
| Face detection | @vladmandic/face-api |
| Linting | ESLint 9 + typescript-eslint |
| Serving | Nginx (Docker) |

## Prerequisites

- Node.js 20+ (Dockerfile uses `node:20.17-alpine`)
- npm
- A Supabase project with the required schema and RPC functions
- Docker (optional, for containerized deployment)

## Installation

```bash
npm install
```

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The app throws at startup if either variable is missing.

## Usage

Start the development server:

```bash
npm run dev
```

Open the printed local URL in your browser. The root route (`/`) serves the public landing page.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Produce a production bundle in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |

## Routes Overview

### Public

| Path | Page |
|------|------|
| `/` | Landing page |
| `/partners` | Partners |
| `/speakers` | Speakers |
| `/about` | About Career Center |

### Auth

| Path | Page |
|------|------|
| `/login` | Login |
| `/forgot-password` | Forgot password |
| `/reset-password` | Reset password |
| `/attendee-register` | Unified attendee registration |
| `/select-event` | Event selection (protected) |
| `/register-event` | Event registration (protected) |

### Role Dashboards

| Path | Role |
|------|------|
| `/attendee` | Attendee |
| `/registration` | Registration team |
| `/building` | Building team |
| `/verification` | Verification team |
| `/volunteer` | Volunteer |
| `/team-leader` | Team leader |
| `/tech-support` | Tech support |
| `/employer` | Employer |
| `/secure-9821panel` | Admin |
| `/super-ctrl-92k1x` | Super admin |

### Status Screens

`/pending-approval`, `/registration-confirmed`, `/rejected-attendee`, `/non-asu-rejected`, `/verification-pending`, `/payment-required`, `/no-active-event`.

## Project Structure

```
src/
├── Assets/              # Bundled logo and career-center images
├── components/          # Shared + role-scoped components (admin, attendee, employer, ...)
├── contexts/            # AuthContext, ThemeContext
├── hooks/               # useAttendeeProfile
├── lib/                 # Supabase client, event/landing/theme/employer helpers
├── pages/               # Route-level pages grouped by role
├── styles/              # Animation CSS
├── types/               # Shared TypeScript types
└── utils/               # logger, sanitize, validation, formCache, clipboard, constants
```

## Environment & Deployment

The app builds to static assets and is served by Nginx inside Docker:

```bash
docker build -t career-portal .
docker run -p 3000:3000 career-portal
```

The multi-stage `Dockerfile` builds with `npm ci && npm run build`, copies `dist/` into `nginx:1.27-alpine`, and runs as a non-root user on port 3000. `nginx.conf` configures SPA fallback, gzip, security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy), and long-lived caching for hashed assets. A `public/_redirects` file (`/* /index.html 200`) covers Netlify-style SPA hosting.

## Development Notes

- The active event and landing content are loaded before first render (`src/main.tsx`), so theme and title are applied before paint.
- Role-based access is enforced by `ProtectedRoute` plus realtime revalidation in `AuthContext`.
- Feedback and many domain actions run through Supabase RPC functions; responses are normalized and errors mapped to user-safe messages.
- ESLint currently relaxes `no-explicit-any`; see `eslint.config.js`.

## Contributing

1. Fork the repository and create a feature branch.
2. Follow existing component and naming conventions.
3. Run `npm run lint` and `npm run build` before opening a pull request.
4. Describe your changes clearly in the PR.

## License

No license file is present in this repository. Contact the maintainers before reuse.
