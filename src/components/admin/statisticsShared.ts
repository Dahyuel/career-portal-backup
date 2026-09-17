// Types and label helpers shared by the Statistics tab and the event report.

// ============================================================================
// Types — shape returned by admin_get_event_statistics
// ============================================================================

export type CountItem = { label: string; count: number };

export interface CheckinDay {
  date: string;
  in_event_window: boolean;
  check_ins: number;
  unique_attendees: number;
  check_outs: number;
  session_attendance: number;
  asu: CountItem[];
  gender: CountItem[];
  universities: CountItem[];
  faculties: CountItem[];
  hours: { hour: number; count: number }[];
}

export interface SessionStat {
  id: string;
  title: string;
  start_time: string;
  capacity: number | null;
  booked: number;
  cancelled: number;
  attended: number;
}

export interface EventStatistics {
  generated_at: string;
  event: { id: string; name: string; start_date: string; end_date: string; start_day: string; end_day: string };
  people: { total: number; attendees: number; volunteers: number; employers: number; admins: number; by_role: CountItem[] };
  companies: number;
  funnel: { registered: number; approved: number; checked_in: number; attended_session: number };
  attendees: {
    total: number;
    registration_status: CountItem[];
    asu: CountItem[];
    payment: CountItem[];
    gender: CountItem[];
    degree_level: CountItem[];
    class_year: CountItem[];
    universities: CountItem[];
    faculties: CountItem[];
    registrations_by_day: CountItem[];
  };
  checkins: { total: number; unique_attendees: number; checked_out: number; still_inside: number; days: CheckinDay[] };
  sessions: { total_bookings: number; cancelled_bookings: number; items: SessionStat[] };
  volunteer_teams: CountItem[];
}

// ============================================================================
// Labels & formatting
// ============================================================================

export const NOT_SPECIFIED = 'not_specified';

export const ROLE_LABELS: Record<string, string> = {
  attendee: 'Attendees',
  employer: 'Employers',
  volunteer: 'Volunteers',
  team_leader: 'Team leaders',
  building: 'Building team',
  registration: 'Registration team',
  info_desk: 'Info desk',
  verification: 'Verification team',
  tech_support: 'Technical support',
  admin: 'Admins',
  sadmin: 'Super admins',
  super_admin: 'Super admins'
};

export const VALUE_LABELS: Record<string, string> = {
  [NOT_SPECIFIED]: 'Not specified',
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
  paid: 'Paid',
  not_required: 'Not required (ASU)',
  asu: 'ASU students',
  other: 'Other universities',
  male: 'Male',
  female: 'Female',
  undergraduate: 'Undergraduate',
  graduate: 'Graduate'
};

export const humanize = (value: string) =>
  VALUE_LABELS[value] ?? value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const roleLabel = (value: string) => ROLE_LABELS[value] ?? humanize(value);

export const yearLabel = (value: string) => {
  if (value === NOT_SPECIFIED) return VALUE_LABELS[NOT_SPECIFIED];
  const n = Number(value);
  if (!Number.isInteger(n)) return value;
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix} year`;
};

export const facultyLabel = (value: string) => (value === NOT_SPECIFIED ? VALUE_LABELS[NOT_SPECIFIED] : value.replace(/^faculty of\s+/i, ''));

export const pct = (part: number, total: number) => {
  if (!total) return '0%';
  const p = (part / total) * 100;
  if (part > 0 && p < 1) return '<1%';
  return `${Math.round(p)}%`;
};

export const sum = (items: CountItem[]) => items.reduce((s, i) => s + i.count, 0);
export const countOf = (items: CountItem[], label: string) => items.find((i) => i.label === label)?.count ?? 0;

export const formatDay = (date: string, withYear = false) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {})
  });

export const formatShortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const formatHour = (hour: number) => {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
};

export const formatNumber = (n: number) => n.toLocaleString('en-US');

// ============================================================================
// Pie slices — a pie is only readable with a few parts, so long tails are
// folded into "Other" and "Not specified" is always its own grey slice.
// ============================================================================

export type SliceKind = 'value' | 'other' | 'not_specified';
export interface Slice { key: string; label: string; count: number; kind: SliceKind }

export const MAX_PIE_VALUES = 5;

/**
 * @param order Fixed order for known values (e.g. ['asu', 'other']) so a value keeps
 *              the same colour everywhere; without it, largest first.
 */
export const toSlices = (
  items: CountItem[],
  labelFn: (label: string) => string = humanize,
  order?: string[],
  maxValues = MAX_PIE_VALUES
): Slice[] => {
  const rank = (label: string) => {
    const idx = order ? order.indexOf(label) : -1;
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  const known = items
    .filter((i) => i.label !== NOT_SPECIFIED && i.count > 0)
    .sort((a, b) => (order ? rank(a.label) - rank(b.label) : 0) || b.count - a.count);

  let slices: Slice[] = known.map((i) => ({ key: i.label, label: labelFn(i.label), count: i.count, kind: 'value' }));
  if (slices.length > maxValues + 1) {
    const rest = slices.slice(maxValues);
    slices = slices.slice(0, maxValues).concat({
      key: '__other',
      label: `Other (${rest.length})`,
      count: rest.reduce((s, r) => s + r.count, 0),
      kind: 'other'
    });
  }

  const unknown = countOf(items, NOT_SPECIFIED);
  if (unknown > 0) slices.push({ key: NOT_SPECIFIED, label: VALUE_LABELS[NOT_SPECIFIED], count: unknown, kind: 'not_specified' });
  return slices;
};
