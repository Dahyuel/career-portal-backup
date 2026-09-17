// Shared helpers for the super admin dashboard: one way to call the database
// functions, and small formatters. Built for the v2 schema, where the active event
// comes from system_config → active_event_id.
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { getActiveEventId } from '../../lib/currentEvent';
import { friendlyError } from './superAdminErrors';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type Notify = (message: string, type: ToastType) => void;

/** The event every event-scoped function works on. */
export const eventId = (): string => getActiveEventId();

/** Error whose message was written by our own database functions and is safe to show. */
export class SadminError extends Error {}

/**
 * Calls a super admin function. Every one returns `{ success, error, ... }`.
 * Messages in `error` are written by those functions for people to read; any other
 * failure (network, Postgres) is logged and replaced with a safe message.
 */
export const callSadmin = async <T>(fn: string, args: Record<string, unknown> | undefined, fallback: string): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    logger.error(`[${fn}]`, error);
    throw new SadminError(friendlyError(error, fallback));
  }
  if (!data || data.success !== true) {
    logger.error(`[${fn}]`, data?.error);
    throw new SadminError(typeof data?.error === 'string' && data.error ? data.error : fallback);
  }
  return data as T;
};

export const errorText = (err: unknown, fallback: string): string =>
  err instanceof SadminError ? err.message : friendlyError(err, fallback);

// ---------------------------------------------------------------------------
// Shapes returned by the database functions
// ---------------------------------------------------------------------------
export type TabKey = 'command' | 'events' | 'people' | 'activity' | 'controls' | 'security' | 'health';

/** One switch: the manual state plus an optional time window. */
export interface EventControl {
  open: boolean;
  opens_at: string | null;
  closes_at: string | null;
}

export type EventControlName = 'registration' | 'booking' | 'feedback';

/**
 * Controls belong to one event (v2_06). The three `*_open` booleans are the
 * effective state right now — the switch combined with its time window — while
 * the named objects carry what was actually set.
 */
export interface EventControlsState {
  registration_open: boolean;
  booking_open: boolean;
  feedback_open: boolean;
  registration?: EventControl;
  booking?: EventControl;
  feedback?: EventControl;
}

export interface ReadinessCheck {
  code: string;
  label: string;
  ok: boolean;
  hint: string;
}

export interface EventReadiness {
  status: string;
  is_live: boolean;
  is_current: boolean;
  ready: boolean;
  checks: ReadinessCheck[];
}

export interface MaintenanceState {
  enabled: boolean;
  stored_enabled: boolean;
  message: string;
  ends_at: string | null;
}

export interface CommandAlert {
  level: 'critical' | 'warning' | 'info';
  tab: TabKey | null;
  message: string;
}

export interface SessionNow {
  id: string;
  title: string;
  room_name: string | null;
  start_time: string;
  end_time: string;
  capacity: number | null;
  booked: number;
  checked_in: number;
}

export interface CommandCenterData {
  generated_at: string;
  event: { name: string; start_date: string; end_date: string; status: string };
  registrations: { today: number; total: number };
  verification: { pending: number; waiting_over_24h: number; oldest_pending_at: string | null };
  checkins: { last_hour: number; inside_now: number };
  sessions_now: SessionNow[];
  staff: { admins: number; sadmins: number; sadmin_limit: number; sadmins_without_2fa: number };
  maintenance: MaintenanceState;
  controls: EventControlsState;
  alerts: CommandAlert[];
}

export interface AccountRow {
  id: string;
  full_name: string | null;
  email: string | null;
  personal_id: string | null;
  created_at: string;
  role: string;
  /** True for super admins, whose role is not tied to one event. */
  all_events: boolean;
  last_sign_in_at: string | null;
  disabled: boolean;
  has_2fa: boolean;
}

export interface AuditEntry {
  id: number;
  created_at: string;
  actor_email: string | null;
  action: string;
  target_table: string | null;
  target_key: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  /** Which event the change belonged to, when it belonged to one (v2_07). */
  event_id?: string | null;
}

export interface StaffSignIn {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  last_sign_in_at: string | null;
  has_2fa: boolean;
  disabled: boolean;
}

export interface SignInEvent {
  created_at: string;
  ip: string | null;
  action: string | null;
  email: string | null;
}

export interface EventSettings {
  name: string;
  event_type: string | null;
  venue_name: string | null;
  start_date: string;
  end_date: string;
  status: string;
  allow_non_asu_attendees: boolean;
  non_asu_ticket_price: number | null;
}

export interface SecurityReport {
  generated_at: string;
  public_tables: { table: string; rls: boolean; level: 'open' | 'conditional' }[];
  public_functions: string[];
  buckets: { name: string; public: boolean; files: number }[];
  my_sessions: { id: string; created_at: string; updated_at: string | null; user_agent: string | null; ip: string | null; current: boolean }[];
  privileged_without_2fa: { email: string | null; role: string }[];
}

export interface HealthCheck {
  code: string;
  label: string;
  description: string;
  severity: 'warning' | 'info';
  fixable: boolean;
  count: number | null;
}

export interface EventSummary {
  id: string;
  name: string;
  event_type: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  /** True for the event system_config → active_event_id points at. */
  is_current: boolean;
  created_at: string;
  teams: number;
  attendees: number;
  staff: number;
}

export interface EventTeamRow {
  id: string;
  team_name: string;
  description: string | null;
  points_per_hour: number;
  volunteers: number;
}

export interface EventDetail {
  event: {
    id: string;
    name: string;
    event_type: string | null;
    status: string | null;
    start_date: string;
    end_date: string;
    venue_name: string | null;
    allow_non_asu_attendees: boolean;
    non_asu_ticket_price: number | null;
    is_current: boolean;
  };
  landing: Record<string, unknown> | null;
  teams: EventTeamRow[];
}

// ---------------------------------------------------------------------------
// Roles (v2 keeps sadmin rows with event_id IS NULL; the rest are per event)
// ---------------------------------------------------------------------------
export const ROLE_OPTIONS = [
  'sadmin', 'admin', 'tech_support', 'team_leader', 'verification', 'registration',
  'info_desk', 'building', 'volunteer', 'employer', 'attendee'
] as const;

const ROLE_LABELS: Record<string, string> = {
  sadmin: 'Super admin',
  admin: 'Admin',
  tech_support: 'Tech support',
  team_leader: 'Team leader',
  verification: 'Verification',
  registration: 'Registration',
  info_desk: 'Info desk',
  building: 'Building',
  volunteer: 'Volunteer',
  employer: 'Employer',
  attendee: 'Attendee',
  none: 'No role'
};

export const roleLabel = (role: string | null | undefined): string =>
  (role && ROLE_LABELS[role]) || (role ? role.replace(/_/g, ' ') : 'No role');

export const isSuperAdminRole = (role: string | null | undefined) => role === 'sadmin';

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const formatTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export const timeAgo = (value: string | null | undefined): string => {
  if (!value) return 'Never';
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return '—';
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDateTime(value);
};

/** Shows only the last 4 characters of an ID number. */
export const maskId = (value: string | null | undefined): string => {
  if (!value) return '—';
  return value.length <= 4 ? value : `•••${value.slice(-4)}`;
};

/** `2026-03-15T09:00:00Z` → the value a `datetime-local` input expects, in the browser's time zone. */
export const toLocalInput = (value: string | null | undefined): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromLocalInput = (value: string): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
export const inputClass =
  'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none disabled:opacity-60';

export const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1';

export const buttonClass = {
  primary: 'px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
  danger: 'px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
  ghost: 'px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent'
};
