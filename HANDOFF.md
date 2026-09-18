# PROMPT FOR NEW SESSION — Finish Info Desk → Building merge

Repo: `/home/dahy/career-portal-backup` (Vite + React + TS, Supabase). Read `HANDOFF.md` and `faults.md` in the repo root first. The Supabase DB side is **already migrated — do NOT run migrations or touch the DB**.

## Critical tool warning
The `Edit` tool in the prior session appears to **collapse `||` into `|`** on write, corrupting logical-OR expressions. Before trusting any edit:
1. After each `Edit`, run `sed -n '<start>,<end>p' <file>|cat -A` and grep the result for a lone `|` used as an operator. `cat -A` shows the real bytes.
2. If you see `|` where `||` belongs, **stop editing that file** and report it. Do not try to patch it with more edits.
3. Never use python/sed/cat/heredocs to write source files.

## Current state (verify before acting)
`git status` shows modified: `src/components/AttendeeProfileCard.tsx`, `src/components/volunteer/VolunteerProfileModal.tsx`, `src/lib/supabase.ts`, `src/pages/team/BuildTeamDashboard.tsx`. Untracked: `HANDOFF.md`, `faults.md`.

### 1. First: audit `BuildTeamDashboard.tsx` for the pipe corruption
The prior session's edits left known-bad lines (single `|` where `||` is required):
- `~341` `if (!selectedSessionForScan|!profile?.event_id) return;`
- `~347` `if (attendeeError|!attendeeData) {`
- `~348` `showToast(attendeeError?.message|'Attendee not found', 'error');`
- `~352` `const attendeeId = attendeeData.id|attendeeData.user_id;`
- `~370-371` `phone: attendeeData.phone|'N/A',` / `email: attendeeData.email|'N/A',`
- `~376` `setSessionBooking(booking|null);`
- `~387` `if (!selectedSessionForScan|!sessionAttendee|!profile?.event_id) {`
- `~423` same pattern in `handleSessionCancelBooking`
- `~499` `const error = bookedResult.error|generalResult.error;`
- `~501-503` `...(bookedResult.data|[])` and `.some((b: any) => b.id === g.id)`

Verify each with `cat -A`, then fix `|` → `||`. Also confirm the `handleSessionSearchResultClick` body calls the right handler and `handleSessionBook`/`handleSessionCancelBooking` are wired to the session card UI (the card currently only renders "Confirm Check-in"). Per `HANDOFF.md`, the card must show **Check in** when a booking exists, and **Book** when it doesn't, plus a **Cancel booking** action.

Also fix the stray indentation at `~210` (`// Parallel fetch:` comment) and `~339` (`// Unified scan flow:` comment).

### 2. Verify the subagent's work
A subagent was launched to do tasks A–D below and returned an **empty result** — treat it as unverified. Check each:
- **A:** Is `src/pages/team/InfoDeskDashboard.tsx` deleted?
- **B:** `src/App.tsx` — lazy import of `InfoDeskDashboard` removed; `/info-desk` route removed; `/infodesk` redirect removed; `'info_desk'` removed from the `/attendee` route's `requiredRole` array.
- **C:** `info_desk` / `infodesk` / `Info Desk` / `info desk` purged from: `AuthContext.tsx` (~113, ~126, ~516), `utils/constants.ts` (~41), `lib/eventTeams.ts` (~2, ~13, ~29), `superadmin/sadminApi.ts` (~237, ~247), `shared/DashboardLayout.tsx` (~615), `shared/SharedNavigation.tsx` (~219, ~225), `RoleChanger.tsx` (~67, ~82), `volunteer/VolunteerRegistration.tsx` (~134, ~149), `UnifiedVolunteerRegistration.tsx` (~96, hard-coded Info Desk team id `9269ac6a-7b2c-4be5-ab72-3f8278eb8e33` at ~349), `team/TechSupportDashboard.tsx` (~30), `admin/FeedbackManagement.tsx` (~39), `admin/statisticsShared.ts` (~69), `admin/AdminPanel.tsx` (~1749, ~1773 points key `session_booking_infodesk` → `session_booking_staff`, ~1793, ~5870), `mocks/users.ts` (~9), `superadmin/EventEditor.tsx` (~221), `superadmin/EventControls.tsx` (~41).
- Run `grep -rn 'info_desk\|infodesk\|Info Desk\|info desk' src/` and finish any remaining hits (excluding `BuildTeamDashboard.tsx`, which you own).

### 3. Confirm `supabase.ts` and the other modified files are intact
`src/lib/supabase.ts`, `src/components/AttendeeProfileCard.tsx`, and `src/components/volunteer/VolunteerProfileModal.tsx` have uncommitted changes from earlier work. `git diff` them. `supabase.ts` must still have `buildTeamBookSessionAndLogRPC` (~113), `getBuildingStatsRPC` (~1046), `searchAttendeesByPersonalIdBuildingRPC` (~1061), `getSessionBookingForCheckinRPC(..., eventId?)` (~975), and **no** `infodesk`/`getInfoDesk*`/`check_session_booking`. Confirm none of them were truncated or pipe-corrupted.

### 4. Build and verify
- `npm run build` and fix every TypeScript error in files you own.
- Re-run Supabase security advisors for project `cwyipkkyugiznlkamlrg` and confirm no new findings from the merged `build_team_*` RPCs (all should have EXECUTE revoked from `anon`/`PUBLIC`, granted only to `authenticated`/`service_role`).
- Do **not** commit.

### Final report
List: files deleted, files edited (1 line each), remaining `info_desk` grep hits, exact `npm run build` tail output, anything unverified, and whether the `|`→`||` bug recurred.
