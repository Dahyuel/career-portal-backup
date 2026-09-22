// Builds the "Full Event Report" as one self-contained, print-ready HTML page.
// Charts are inline SVG / HTML (vector, so they stay sharp in the PDF).
// Every value that comes from the database is escaped before it is inserted.

import {
  type CountItem,
  type EventStatistics,
  type Slice,
  NOT_SPECIFIED,
  VALUE_LABELS,
  humanize,
  roleLabel,
  yearLabel,
  facultyLabel,
  pct,
  sum,
  countOf,
  formatDay,
  formatShortDate,
  formatHour,
  formatNumber,
  toSlices
} from './statisticsShared';

// ---------------------------------------------------------------------------
// Report options (chosen by the admin in the Customize panel)
// ---------------------------------------------------------------------------

export const REPORT_SECTIONS = [
  { id: 'key_numbers', label: 'Key numbers' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'journey', label: 'Attendee journey' },
  { id: 'attendees', label: 'Who attended' },
  { id: 'attendee_tables', label: 'University & faculty tables' },
  { id: 'checkins', label: 'Check-ins' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'people', label: 'People & teams' },
  { id: 'notes', label: 'Notes & definitions' }
] as const;

/** Charts that can be shown as bars or as a pie. Charts over time and the funnel always stay bars. */
export const REPORT_CHARTS = [
  { id: 'registration_status', label: 'Registration status', section: 'attendees' },
  { id: 'asu', label: 'ASU vs other universities', section: 'attendees' },
  { id: 'payment', label: 'Payment', section: 'attendees' },
  { id: 'gender', label: 'Gender', section: 'attendees' },
  { id: 'degree_level', label: 'Degree level', section: 'attendees' },
  { id: 'class_year', label: 'Year of study', section: 'attendees' },
  { id: 'universities', label: 'Universities', section: 'attendees' },
  { id: 'faculties', label: 'Faculties', section: 'attendees' },
  { id: 'roles', label: 'Accounts by role', section: 'people' },
  { id: 'teams', label: 'Volunteer teams', section: 'people' }
] as const;

export type ReportSectionId = typeof REPORT_SECTIONS[number]['id'];
export type ReportChartId = typeof REPORT_CHARTS[number]['id'];
export type ReportChartType = 'bar' | 'pie';

export interface ReportOptions {
  charts: Record<ReportChartId, ReportChartType>;
  sections: Record<ReportSectionId, boolean>;
  accentColor: string;
}

export const defaultReportOptions = (): ReportOptions => ({
  charts: Object.fromEntries(REPORT_CHARTS.map((c) => [c.id, 'bar'])) as Record<ReportChartId, ReportChartType>,
  sections: Object.fromEntries(REPORT_SECTIONS.map((s) => [s.id, true])) as Record<ReportSectionId, boolean>,
  accentColor: '#dc2626'
});

/** Accepts anything (e.g. saved JSON) and returns valid options, falling back to defaults. */
export const normalizeReportOptions = (raw: unknown): ReportOptions => {
  const result = defaultReportOptions();
  if (!raw || typeof raw !== 'object') return result;
  const r = raw as { charts?: Record<string, unknown>; sections?: Record<string, unknown>; accentColor?: unknown };
  for (const c of REPORT_CHARTS) {
    const v = r.charts?.[c.id];
    if (v === 'bar' || v === 'pie') result.charts[c.id] = v;
  }
  for (const s of REPORT_SECTIONS) {
    const v = r.sections?.[s.id];
    if (typeof v === 'boolean') result.sections[s.id] = v;
  }
  if (typeof r.accentColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(r.accentColor)) {
    result.accentColor = r.accentColor;
  }
  return result;
};

// ---------------------------------------------------------------------------
// Colours — validated against a white surface (6-slot categorical for pies)
// ---------------------------------------------------------------------------

const C = {
  series: ['#2a78d6', '#eb6834', '#1baf7a'],
  categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  funnel: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab'],
  neutral: '#cbd5e1',
  meterTrack: '#dbeafe',
  grid: '#e2e8f0',
  baseline: '#cbd5e1',
  ink: '#0f172a',
  ink2: '#475569',
  muted: '#64748b',
  accent: '#dc2626',
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b'
};

const TZ = 'Africa/Cairo';

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ---------------------------------------------------------------------------
// Chart & layout primitives (all return HTML strings)
// ---------------------------------------------------------------------------

const table = (headers: string[], rows: (string | number)[][], emptyText = 'No data') => `
  <table>
    <thead><tr>${headers.map((h, i) => `<th class="${i === 0 ? 'l' : 'r'}">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.length === 0
    ? `<tr><td colspan="${headers.length}" class="empty">${esc(emptyText)}</td></tr>`
    : rows.map((row) => `<tr>${row.map((cell, i) => `<td class="${i === 0 ? 'l' : 'r'}" dir="auto">${esc(cell)}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>`;

const card = (title: string, body: string, note?: string, extraClass = '') => `
  <section class="card ${extraClass}">
    <h3>${esc(title)}</h3>
    ${note ? `<p class="note">${esc(note)}</p>` : ''}
    ${body}
  </section>`;

const coverage = (items: CountItem[], noun = 'attendees') => {
  const total = sum(items);
  const known = total - countOf(items, NOT_SPECIFIED);
  return known === total ? `All ${formatNumber(total)} ${noun}` : `Recorded for ${formatNumber(known)} of ${formatNumber(total)} ${noun}`;
};

interface BarListOptions {
  labelFn?: (l: string) => string;
  total?: number;
  foldAfter?: number;
  colorFor?: (l: string) => string | undefined;
}

/** Sorted horizontal bars; "Not specified" last in grey; long tails folded into "Other". */
const barList = (items: CountItem[], { labelFn = humanize, total, foldAfter, colorFor }: BarListOptions = {}) => {
  const base = total ?? sum(items);
  let rows = items
    .filter((i) => i.label !== NOT_SPECIFIED && i.count > 0)
    .map((i) => ({ label: labelFn(i.label), count: i.count, color: colorFor?.(i.label) ?? C.series[0] }));

  if (foldAfter && rows.length > foldAfter + 1) {
    const rest = rows.slice(foldAfter);
    rows = rows.slice(0, foldAfter).concat({ label: `Other (${rest.length} more)`, count: rest.reduce((s, r) => s + r.count, 0), color: C.series[0] });
  }
  const unknown = countOf(items, NOT_SPECIFIED);
  if (unknown > 0) rows.push({ label: VALUE_LABELS[NOT_SPECIFIED], count: unknown, color: C.neutral });

  if (rows.length === 0) return '<p class="empty">No data yet</p>';
  const max = Math.max(...rows.map((r) => r.count), 1);

  return `<div class="bars">${rows.map((r) => `
    <div class="bar-row">
      <div class="bar-head">
        <span class="bar-label" dir="auto">${esc(r.label)}</span>
        <span class="bar-value"><b>${formatNumber(r.count)}</b><span class="share">${pct(r.count, base)}</span></span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max((r.count / max) * 100, 1.5).toFixed(2)}%;background:${r.color}"></div></div>
    </div>`).join('')}</div>`;
};

const legend = (entries: { label: string; count: number; color: string }[], total: number) => `
  <ul class="legend">${entries.map((s) => `
    <li><i style="background:${s.color}"></i><span dir="auto">${esc(s.label)}</span><span class="legend-value"><b>${formatNumber(s.count)}</b> ${pct(s.count, total)}</span></li>`).join('')}
  </ul>`;

/** A 100% bar split into parts, with a legend that always shows the numbers. */
const splitBar = (items: CountItem[], order: string[], labelFn: (l: string) => string = humanize) => {
  const labels = [...order, ...items.filter((i) => !order.includes(i.label) && i.label !== NOT_SPECIFIED).map((i) => i.label), NOT_SPECIFIED];
  const segments = labels
    .map((label, idx) => ({
      label: labelFn(label),
      count: countOf(items, label),
      color: label === NOT_SPECIFIED ? C.neutral : C.series[Math.min(idx, C.series.length - 1)]
    }))
    .filter((s) => s.count > 0);
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) return '<p class="empty">No data yet</p>';

  return `
    <div class="split">${segments.map((s) => `<div style="width:${((s.count / total) * 100).toFixed(2)}%;background:${s.color}"></div>`).join('')}</div>
    ${legend(segments, total)}`;
};

/** Donut pie with the total in the middle and a legend that always shows the numbers. */
const pieChart = (slices: Slice[], colorFor?: (key: string) => string | undefined) => {
  const total = slices.reduce((s, x) => s + x.count, 0);
  if (!total) return '<p class="empty">No data yet</p>';

  let valueIdx = 0;
  const colored = slices.map((s) => {
    const slot = C.categorical[Math.min(valueIdx, C.categorical.length - 1)];
    const color = s.kind === 'not_specified' ? C.neutral : s.kind === 'other' ? slot : colorFor?.(s.key) ?? slot;
    if (s.kind !== 'not_specified') valueIdx++;
    return { ...s, color };
  });

  const cx = 62, cy = 62, r = 58, ir = 36;
  const pt = (radius: number, a: number) => `${(cx + radius * Math.cos(a)).toFixed(2)} ${(cy + radius * Math.sin(a)).toFixed(2)}`;
  let angle = -Math.PI / 2;
  const shapes = colored.map((s) => {
    const sweep = (s.count / total) * Math.PI * 2;
    if (sweep >= Math.PI * 2 - 1e-6) {
      return `<circle cx="${cx}" cy="${cy}" r="${(r + ir) / 2}" fill="none" stroke="${s.color}" stroke-width="${r - ir}"/>`;
    }
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;
    const large = sweep > Math.PI ? 1 : 0;
    return `<path d="M ${pt(r, a0)} A ${r} ${r} 0 ${large} 1 ${pt(r, a1)} L ${pt(ir, a1)} A ${ir} ${ir} 0 ${large} 0 ${pt(ir, a0)} Z" fill="${s.color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>`;
  }).join('');

  return `
    <div class="pie">
      <svg viewBox="0 0 124 124" role="img" aria-label="${esc(colored.map((s) => `${s.label} ${s.count}`).join(', '))}">
        ${shapes}
        <text x="${cx}" y="${cy + 2}" text-anchor="middle" class="pie-total">${formatNumber(total)}</text>
        <text x="${cx}" y="${cy + 15}" text-anchor="middle" class="pie-sub">total</text>
      </svg>
      ${legend(colored, total)}
    </div>`;
};

interface DistributionOptions extends BarListOptions {
  order?: string[];
}

/** Renders a category breakdown as the admin chose: bars (split or list) or a pie. */
const distribution = (type: ReportChartType, kind: 'split' | 'list', items: CountItem[], opts: DistributionOptions = {}) => {
  if (type === 'pie') return pieChart(toSlices(items, opts.labelFn ?? humanize, opts.order), opts.colorFor);
  return kind === 'split' ? splitBar(items, opts.order ?? [], opts.labelFn) : barList(items, opts);
};

const niceScale = (max: number) => {
  const target = Math.max(max, 1);
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  const step = steps.find((s) => target / s <= 5) ?? Math.ceil(target / 5);
  return { step, top: Math.ceil(target / step) * step };
};

interface ColumnSeries { name: string; color: string; values: number[] }

// `width` is the drawing width in CSS px: use ~340 for a half-width card, ~700 for a full-width one,
// so text inside the SVG renders at its real size instead of being scaled down.
const columnChart = (categories: string[], series: ColumnSeries[], height = 220, width = 700) => {
  if (categories.length === 0) return '<p class="empty">No data yet</p>';

  const W = width, H = height, padL = 34, padR = 6, padT = 18, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const { step, top } = niceScale(Math.max(...series.flatMap((s) => s.values)));
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const base = padT + plotH;
  const band = plotW / categories.length;
  const gap = 2;
  const groupW = Math.min(band * 0.72, series.length * 24 + (series.length - 1) * gap);
  const barW = (groupW - (series.length - 1) * gap) / series.length;
  // Skip axis labels based on their measured-ish text width (10px font ≈ 5.8px per character),
  // so date / hour labels never run into each other.
  const labelWidth = Math.max(...categories.map((c) => c.length)) * 5.8 + 10;
  const labelEvery = Math.max(1, Math.ceil(labelWidth / band));
  const showValues = categories.length * series.length <= 14;

  let grid = '';
  for (let v = 0; v <= top; v += step) {
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? C.baseline : C.grid}" stroke-width="1"/>`;
    grid += `<text x="${padL - 6}" y="${y(v) + 3.5}" text-anchor="end" class="tick">${formatNumber(v)}</text>`;
  }

  let marks = '';
  categories.forEach((cat, ci) => {
    const x0 = padL + ci * band + (band - groupW) / 2;
    series.forEach((s, si) => {
      const v = s.values[ci] ?? 0;
      const x = x0 + si * (barW + gap);
      if (v > 0) {
        const yTop = y(v);
        const r = Math.min(4, barW / 2, base - yTop);
        marks += `<path d="M${x},${base} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${base} Z" fill="${s.color}"/>`;
        if (showValues) marks += `<text x="${x + barW / 2}" y="${yTop - 4}" text-anchor="middle" class="val">${formatNumber(v)}</text>`;
      }
    });
    if (ci % labelEvery === 0) {
      marks += `<text x="${padL + ci * band + band / 2}" y="${H - 10}" text-anchor="middle" class="tick">${esc(cat)}</text>`;
    }
  });

  const seriesLegend = series.length > 1
    ? `<ul class="legend inline">${series.map((s) => `<li><i style="background:${s.color}"></i>${esc(s.name)}</li>`).join('')}</ul>`
    : '';

  return `${seriesLegend}<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(series.map((s) => s.name).join(', '))}">${grid}${marks}</svg>`;
};

const kpi = (label: string, value: number | string, hint?: string) => `
  <div class="kpi">
    <p class="kpi-label">${esc(label)}</p>
    <p class="kpi-value">${typeof value === 'number' ? formatNumber(value) : esc(value)}</p>
    ${hint ? `<p class="kpi-hint">${esc(hint)}</p>` : ''}
  </div>`;

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface ReportMeta {
  generatedBy?: string | null;
  generatedAt?: Date;
}

export const reportFileTitle = (stats: EventStatistics, date = new Date()) =>
  `${stats.event.name} - Full Event Report - ${date.toISOString().slice(0, 10)}`;

export function buildEventReportHtml(stats: EventStatistics, meta: ReportMeta = {}, options: ReportOptions = defaultReportOptions()): string {
  const generatedAt = meta.generatedAt ?? new Date();
  const on = (id: ReportSectionId) => options.sections[id];
  const chartType = (id: ReportChartId) => options.charts[id];

  // Apply the chosen report accent color dynamically to the primary palette slots
  C.accent = options.accentColor;
  C.series[0] = options.accentColor;
  C.categorical[0] = options.accentColor;

  const f = stats.funnel;
  const a = stats.attendees;
  const eventRange = `${formatDay(stats.event.start_day, true)} – ${formatDay(stats.event.end_day, true)}`;

  // Check-ins: the report covers the event days; other dates are reported separately.
  const eventDays = stats.checkins.days.filter((d) => d.in_event_window);
  const outsideDays = stats.checkins.days.filter((d) => !d.in_event_window);
  const outsideCheckins = outsideDays.reduce((s, d) => s + d.check_ins, 0);
  const eventCheckins = eventDays.reduce((s, d) => s + d.check_ins, 0);
  const eventCheckouts = eventDays.reduce((s, d) => s + d.check_outs, 0);
  const eventSessionAttendance = eventDays.reduce((s, d) => s + d.session_attendance, 0);
  const hourTotals = new Map<number, number>();
  eventDays.forEach((d) => d.hours.forEach((h) => hourTotals.set(h.hour, (hourTotals.get(h.hour) ?? 0) + h.count)));
  const peakHour = [...hourTotals.entries()].sort((x, y) => y[1] - x[1])[0];
  const busiestDay = [...eventDays].sort((x, y) => y.check_ins - x.check_ins)[0];

  const sessions = stats.sessions.items;
  const withCapacity = sessions.filter((s) => s.capacity);
  const seatsBooked = withCapacity.reduce((s, x) => s + x.booked, 0);
  const seatsTotal = withCapacity.reduce((s, x) => s + (x.capacity ?? 0), 0);
  const attendedTotal = sessions.reduce((s, x) => s + x.attended, 0);
  const topSession = sessions[0];

  const activeTeams = stats.volunteer_teams.filter((t) => t.count > 0);
  const emptyTeams = stats.volunteer_teams.filter((t) => t.count === 0);

  const asuCount = countOf(a.asu, 'asu');
  const otherCount = countOf(a.asu, 'other');
  const otherUniversities = a.universities.filter((u) => u.label !== NOT_SPECIFIED).length - (asuCount > 0 ? 1 : 0);
  const topFaculty = a.faculties.find((x) => x.label !== NOT_SPECIFIED);

  // ---- Highlights (plain-language summary) ----
  const highlights: string[] = [];
  if (f.registered) {
    highlights.push(`<b>${formatNumber(f.registered)}</b> attendees registered and <b>${pct(f.approved, f.registered)}</b> were approved (${formatNumber(f.approved)}).`);
    highlights.push(`<b>${pct(asuCount, a.total)}</b> of attendees are ASU students (${formatNumber(asuCount)}); ${formatNumber(otherCount)} come from ${formatNumber(Math.max(otherUniversities, 0))} other ${otherUniversities === 1 ? 'university' : 'universities'}.`);
  }
  if (topFaculty) highlights.push(`The largest group is <b>${esc(facultyLabel(topFaculty.label))}</b> with ${formatNumber(topFaculty.count)} attendees (${pct(topFaculty.count, a.total)}).`);
  if (eventDays.length) {
    highlights.push(`<b>${formatNumber(eventCheckins)}</b> check-ins over ${eventDays.length} event ${eventDays.length === 1 ? 'day' : 'days'}; the busiest day was <b>${esc(formatDay(busiestDay.date))}</b> with ${formatNumber(busiestDay.check_ins)}.`);
    if (peakHour) highlights.push(`Most attendees arrived around <b>${formatHour(peakHour[0])}</b> (Cairo time).`);
  } else {
    highlights.push(`No check-ins were recorded during the event dates (${esc(eventRange)}).`);
  }
  if (topSession && topSession.booked > 0) {
    highlights.push(`The most booked session was <b dir="auto">${esc(topSession.title)}</b> with ${formatNumber(topSession.booked)}${topSession.capacity ? ` of ${formatNumber(topSession.capacity)} seats` : ''} booked.`);
  }
  if (seatsTotal) highlights.push(`Sessions were <b>${pct(seatsBooked, seatsTotal)}</b> full overall, and <b>${pct(attendedTotal, stats.sessions.total_bookings)}</b> of bookings were attended.`);
  highlights.push(`<b>${formatNumber(stats.people.volunteers)}</b> volunteers worked across ${activeTeams.length} teams, with ${formatNumber(stats.companies)} companies and ${formatNumber(stats.people.employers)} employer accounts taking part.`);

  const dataGaps: string[] = [];
  const gap = (items: CountItem[], what: string) => {
    const missing = countOf(items, NOT_SPECIFIED);
    if (missing > 0) dataGaps.push(`${what} is missing for ${formatNumber(missing)} of ${formatNumber(sum(items))} attendees`);
  };
  gap(a.gender, 'Gender');
  gap(a.degree_level, 'Degree level');
  gap(a.class_year, 'Year of study');

  const statusColor = (l: string) => ({ approved: C.good, pending: C.warning, rejected: C.critical } as Record<string, string>)[l];

  const funnelSteps = [
    { label: 'Registered', value: f.registered },
    { label: 'Approved', value: f.approved },
    { label: 'Checked in at the event', value: f.checked_in },
    { label: 'Attended a session', value: f.attended_session }
  ];

  const funnel = `<div class="bars">${funnelSteps.map((s, i) => `
    <div class="bar-row">
      <div class="bar-head">
        <span class="bar-label">${esc(s.label)}</span>
        <span class="bar-value"><b>${formatNumber(s.value)}</b><span class="share">${pct(s.value, f.registered)}</span></span>
      </div>
      <div class="bar-track tall"><div class="bar-fill" style="width:${f.registered ? Math.max((s.value / f.registered) * 100, s.value ? 1.5 : 0).toFixed(2) : 0}%;background:${C.funnel[i]}"></div></div>
      ${i > 0 && funnelSteps[i - 1].value ? `<p class="step-note">${pct(s.value, funnelSteps[i - 1].value)} of the previous step</p>` : ''}
    </div>`).join('')}</div>`;

  const registrations = a.registrations_by_day;
  const hoursRange = (() => {
    const hours = [...hourTotals.keys()];
    if (!hours.length) return [];
    const from = Math.min(8, ...hours), to = Math.max(18, ...hours);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  })();

  const sortedYears = [...a.class_year].sort((x, y) => Number(x.label) - Number(y.label));

  const sessionRows = sessions.map((s) => {
    const fill = s.capacity ? Math.min(s.booked / s.capacity, 1) : 0;
    const when = new Date(s.start_time).toLocaleString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return `<tr>
      <td class="l" dir="auto">${esc(s.title)}<span class="sub">${esc(when)}</span></td>
      <td class="r">${formatNumber(s.booked)}</td>
      <td class="r">${s.capacity ? formatNumber(s.capacity) : '—'}</td>
      <td class="meter-cell">${s.capacity
        ? `<div class="meter"><div style="width:${(fill * 100).toFixed(1)}%"></div></div><span class="meter-pct">${pct(s.booked, s.capacity)}</span>`
        : '<span class="muted">No limit</span>'}</td>
      <td class="r">${formatNumber(s.attended)}</td>
      <td class="r">${formatNumber(s.cancelled)}</td>
    </tr>`;
  }).join('');

  // ---- Sections (each only when switched on) ----
  const parts: string[] = [];

  if (on('key_numbers')) parts.push(`
  <h2>Key numbers</h2>
  <div class="kpis">
    ${kpi('Registered attendees', f.registered)}
    ${kpi('Approved', f.approved, `${pct(f.approved, f.registered)} of registered`)}
    ${kpi('Checked in', f.checked_in, `${pct(f.checked_in, f.approved)} of approved`)}
    ${kpi('Attended a session', f.attended_session, `${pct(f.attended_session, f.checked_in)} of checked in`)}
    ${kpi('Session bookings', stats.sessions.total_bookings, stats.sessions.cancelled_bookings ? `${formatNumber(stats.sessions.cancelled_bookings)} cancelled, not counted` : 'No cancellations')}
    ${kpi('Companies', stats.companies, `${formatNumber(stats.people.employers)} employer accounts`)}
    ${kpi('Volunteers', stats.people.volunteers, `${activeTeams.length} active teams`)}
    ${kpi('Sessions', sessions.length, seatsTotal ? `${pct(seatsBooked, seatsTotal)} of seats booked` : undefined)}
  </div>`);

  if (on('highlights')) parts.push(`
  <h2>Highlights</h2>
  <ul class="highlights">${highlights.map((h) => `<li>${h}</li>`).join('')}</ul>`);

  if (on('journey')) parts.push(`
  <h2>Attendee journey</h2>
  <div class="grid2">
    ${card('From registration to sessions', funnel, 'Share of registered attendees reaching each step')}
    ${card('Registrations over time',
    columnChart(registrations.map((d) => formatShortDate(d.label)), [{ name: 'Registrations', color: C.series[0], values: registrations.map((d) => d.count) }], 230, 340),
    registrations.length ? `${formatNumber(sum(registrations))} registrations on ${registrations.length} days` : undefined)}
  </div>`);

  if (on('attendees')) parts.push(`
  <h2 class="page-break">Who attended</h2>
  <p class="intro">Based on ${formatNumber(a.total)} registered attendees (staff accounts excluded). Missing answers are shown as “Not specified”.</p>
  <div class="grid2">
    ${card('Registration status', distribution(chartType('registration_status'), 'list', a.registration_status, { total: a.total, colorFor: statusColor, order: ['approved', 'pending', 'rejected'] }), `All ${formatNumber(a.total)} attendees`)}
    ${card('ASU vs other universities', distribution(chartType('asu'), 'split', a.asu, { order: ['asu', 'other'] }), coverage(a.asu))}
    ${card('Payment', distribution(chartType('payment'), 'split', a.payment, { order: ['paid', 'pending', 'not_required'] }), 'Payment is only required for students outside ASU')}
    ${card('Gender', distribution(chartType('gender'), 'split', a.gender, { order: ['male', 'female'] }), coverage(a.gender))}
    ${card('Degree level', distribution(chartType('degree_level'), 'split', a.degree_level, { order: ['undergraduate', 'graduate'] }), coverage(a.degree_level))}
    ${card('Year of study', distribution(chartType('class_year'), 'list', sortedYears, { total: a.total, labelFn: yearLabel, order: sortedYears.map((y) => y.label) }), coverage(a.class_year))}
    ${card('Universities', distribution(chartType('universities'), 'list', a.universities, { total: a.total, foldAfter: 7 }), `${a.universities.filter((u) => u.label !== NOT_SPECIFIED).length} universities`)}
    ${card('Faculties', distribution(chartType('faculties'), 'list', a.faculties, { total: a.total, foldAfter: 7, labelFn: facultyLabel }), `${a.faculties.filter((x) => x.label !== NOT_SPECIFIED).length} faculties`)}
  </div>`);

  if (on('attendee_tables')) parts.push(`
  ${on('attendees') ? '' : '<h2 class="page-break">Universities &amp; faculties</h2>'}
  ${card('All universities and faculties',
    `<div class="grid2">
        <div>${table(['University', 'Attendees', 'Share'], a.universities.map((u) => [humanize(u.label), formatNumber(u.count), pct(u.count, a.total)]))}</div>
        <div>${table(['Faculty', 'Attendees', 'Share'], a.faculties.map((x) => [facultyLabel(x.label), formatNumber(x.count), pct(x.count, a.total)]))}</div>
      </div>`, undefined, 'span2" style="margin-top:10px')}`);

  if (on('checkins')) parts.push(`
  <h2 class="page-break">Check-ins</h2>
  <p class="intro">Event days ${esc(eventRange)} · times in Cairo time.</p>
  ${eventDays.length === 0
      ? `<div class="callout">No check-ins were recorded during the event dates.${outsideCheckins ? ` ${formatNumber(outsideCheckins)} check-ins on ${outsideDays.length} other ${outsideDays.length === 1 ? 'date' : 'dates'} are listed below and are most likely test data.` : ''}</div>`
      : `
    <div class="kpis">
      ${kpi('Check-ins', eventCheckins, `${eventDays.length} ${eventDays.length === 1 ? 'day' : 'days'}`)}
      ${kpi('Checked out', eventCheckouts, `${pct(eventCheckouts, eventCheckins)} of check-ins`)}
      ${kpi('Not checked out', eventCheckins - eventCheckouts)}
      ${kpi('Session attendance', eventSessionAttendance, 'Scanned into a session')}
    </div>
    <div class="grid2" style="margin-top:10px">
      ${card('Check-ins per day',
        columnChart(eventDays.map((d) => formatShortDate(d.date)), [
          { name: 'Check-ins', color: C.series[0], values: eventDays.map((d) => d.check_ins) },
          { name: 'Checked out', color: C.series[1], values: eventDays.map((d) => d.check_outs) }
        ], 230, 340))}
      ${card('Arrivals by hour', columnChart(hoursRange.map((h) => formatHour(h)), [{ name: 'Check-ins', color: C.series[0], values: hoursRange.map((h) => hourTotals.get(h) ?? 0) }], 230, 340),
          peakHour ? `All event days combined · busiest hour ${formatHour(peakHour[0])}` : undefined)}
    </div>
    ${card('Day by day', table(['Day', 'Check-ins', 'Checked out', 'Unique attendees', 'Session attendance', 'ASU', 'Other universities'],
            eventDays.map((d) => [formatDay(d.date, true), d.check_ins, d.check_outs, d.unique_attendees, d.session_attendance, countOf(d.asu, 'asu'), countOf(d.asu, 'other')])), undefined, 'span2" style="margin-top:10px')}`}
  ${outsideDays.length
      ? card('Check-ins outside the event dates',
        table(['Date', 'Check-ins', 'Checked out', 'Unique attendees'], outsideDays.map((d) => [formatDay(d.date, true), d.check_ins, d.check_outs, d.unique_attendees])),
        'Not included in the numbers above — usually tests before the event')
      : ''}`);

  if (on('sessions')) parts.push(`
  <h2 class="page-break">Sessions</h2>
  <div class="kpis">
    ${kpi('Sessions', sessions.length)}
    ${kpi('Active bookings', stats.sessions.total_bookings)}
    ${kpi('Attended', attendedTotal, `${pct(attendedTotal, stats.sessions.total_bookings)} of bookings`)}
    ${kpi('Cancelled', stats.sessions.cancelled_bookings)}
  </div>
  ${card('Bookings by session', `
    <table>
      <thead><tr><th class="l">Session</th><th class="r">Booked</th><th class="r">Capacity</th><th class="l">How full</th><th class="r">Attended</th><th class="r">Cancelled</th></tr></thead>
      <tbody>${sessionRows || '<tr><td colspan="6" class="empty">No sessions yet</td></tr>'}</tbody>
    </table>`, 'Most booked first', 'span2" style="margin-top:10px')}`);

  if (on('people')) parts.push(`
  <h2>People &amp; teams</h2>
  <div class="grid2">
    ${card('Accounts by role', distribution(chartType('roles'), 'list', stats.people.by_role, { total: stats.people.total, labelFn: roleLabel }), `${formatNumber(stats.people.total)} accounts`)}
    ${card('Volunteer teams',
    distribution(chartType('teams'), 'list', activeTeams, { labelFn: (l) => l }) +
    (emptyTeams.length ? `<p class="note" style="margin-top:10px">No members yet</p><div class="chips">${emptyTeams.map((t) => `<span dir="auto">${esc(t.label)}</span>`).join('')}</div>` : ''),
    `${formatNumber(sum(activeTeams))} volunteers in ${activeTeams.length} of ${stats.volunteer_teams.length} teams`)}
  </div>`);

  if (on('notes')) parts.push(`
  <h2>Notes &amp; definitions</h2>
  <section class="card">
    <ul class="defs">
      <li><b>Attendees</b> are accounts with the attendee role for this event. Staff accounts are not counted as attendees.</li>
      <li><b>Checked in</b> counts each attendee once, even if they checked in on several days.</li>
      <li><b>Session bookings</b> exclude cancelled bookings; <b>attended</b> means the attendee was scanned into the session.</li>
      <li><b>Not specified</b> means the attendee did not provide that information. It is always shown so percentages are not overstated.</li>
      <li>Pie charts show the ${5} largest groups; smaller groups are combined into “Other”.</li>
      <li>Dates and times use Cairo time. Check-ins outside ${esc(eventRange)} are reported separately.</li>
      ${dataGaps.length ? `<li><b>Data gaps:</b> ${dataGaps.map(esc).join('; ')}.</li>` : ''}
    </ul>
  </section>`);

  if (parts.length === 0) parts.push('<div class="callout">No sections are selected. Turn at least one section on in the Customize panel.</div>');

  const title = reportFileTitle(stats, generatedAt);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; @bottom-center { content: "Page " counter(page) " of " counter(pages); font: 8pt system-ui, sans-serif; color: ${C.muted}; } }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 10pt/1.45 system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif; color: ${C.ink}; background: #e2e8f0; }
  .page { width: 210mm; margin: 16px auto; background: #fff; padding: 14mm 12mm; box-shadow: 0 4px 24px rgba(15,23,42,.12); }
  @media print { body { background: #fff; } .page { width: auto; margin: 0; padding: 0; box-shadow: none; } }

  .cover { border-top: 5px solid ${C.accent}; padding-top: 14px; margin-bottom: 18px; }
  .eyebrow { margin: 0; font-size: 9pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: ${C.accent}; }
  h1 { margin: 4px 0 2px; font-size: 24pt; line-height: 1.15; }
  .cover .dates { margin: 0; font-size: 12pt; color: ${C.ink2}; }
  .cover .meta { margin: 10px 0 0; font-size: 8.5pt; color: ${C.muted}; }

  h2 { margin: 22px 0 10px; font-size: 13.5pt; padding-left: 9px; border-left: 4px solid ${C.accent}; break-after: avoid; }
  h3 { margin: 0 0 2px; font-size: 10.5pt; }
  .note { margin: 0 0 8px; font-size: 8.5pt; color: ${C.muted}; }
  .intro { margin: -4px 0 10px; font-size: 9pt; color: ${C.ink2}; }
  .muted { color: ${C.muted}; }
  .empty { color: ${C.muted}; font-size: 9pt; text-align: center; padding: 10px 0; }

  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .kpi { border: 1px solid ${C.grid}; border-radius: 8px; padding: 9px 11px; break-inside: avoid; }
  .kpi-label { margin: 0; font-size: 8.5pt; color: ${C.muted}; }
  .kpi-value { margin: 2px 0 0; font-size: 18pt; font-weight: 700; line-height: 1.1; }
  .kpi-hint { margin: 2px 0 0; font-size: 8pt; color: ${C.muted}; }

  .highlights { margin: 0; padding: 12px 14px 12px 30px; background: #f8fafc; border: 1px solid ${C.grid}; border-radius: 8px; break-inside: avoid; }
  .highlights li { margin: 3px 0; }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { border: 1px solid ${C.grid}; border-radius: 8px; padding: 10px 12px; break-inside: avoid; margin-bottom: 10px; }
  .grid2 .card { margin-bottom: 0; }
  .span2 { grid-column: 1 / -1; }

  .bars { display: flex; flex-direction: column; gap: 7px; }
  .bar-head { display: flex; justify-content: space-between; gap: 8px; font-size: 9pt; }
  .bar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-value { white-space: nowrap; }
  .share { display: inline-block; min-width: 34px; text-align: right; color: ${C.muted}; margin-left: 5px; }
  .bar-track { height: 8px; margin-top: 2px; }
  .bar-track.tall { height: 11px; }
  .bar-fill { height: 100%; border-radius: 0 4px 4px 0; }
  .step-note { margin: 1px 0 0; font-size: 8pt; color: ${C.muted}; }

  .split { display: flex; gap: 2px; height: 12px; border-radius: 4px; overflow: hidden; margin-top: 4px; }
  .legend { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: 1fr; gap: 3px; font-size: 9pt; }
  .legend li { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .legend li span[dir] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .legend i { width: 9px; height: 9px; border-radius: 2px; flex: none; }
  .legend-value { margin-left: auto; white-space: nowrap; color: ${C.muted}; }
  .legend-value b { color: ${C.ink}; }
  .legend.inline { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 2px 0 4px; }

  .pie { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
  .pie svg { width: 112px; height: 112px; flex: none; }
  .pie .legend { flex: 1; margin: 0; min-width: 0; }
  .pie-total { font-size: 16px; font-weight: 700; fill: ${C.ink}; font-family: system-ui, sans-serif; }
  .pie-sub { font-size: 9px; fill: ${C.muted}; font-family: system-ui, sans-serif; }

  svg.chart { width: 100%; height: auto; display: block; }
  svg .tick { font-size: 10px; fill: ${C.muted}; font-family: system-ui, sans-serif; }
  svg .val { font-size: 10px; fill: ${C.ink2}; font-family: system-ui, sans-serif; font-weight: 600; }

  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th { font-weight: 600; color: ${C.muted}; border-bottom: 1px solid ${C.baseline}; padding: 4px 6px; }
  td { border-bottom: 1px solid ${C.grid}; padding: 4px 6px; vertical-align: top; font-variant-numeric: tabular-nums; }
  tr { break-inside: avoid; }
  .l { text-align: left; } .r { text-align: right; }
  td .sub { display: block; font-size: 7.5pt; color: ${C.muted}; }
  .meter-cell { width: 26%; }
  .meter { display: inline-block; vertical-align: middle; width: calc(100% - 40px); height: 7px; border-radius: 4px; background: ${C.meterTrack}; overflow: hidden; }
  .meter div { height: 100%; background: ${C.series[0]}; border-radius: 0 4px 4px 0; }
  .meter-pct { display: inline-block; width: 36px; text-align: right; vertical-align: middle; }

  .callout { border: 1px dashed ${C.baseline}; border-radius: 8px; padding: 10px 12px; font-size: 9pt; color: ${C.ink2}; break-inside: avoid; margin-bottom: 10px; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .chips span { font-size: 8pt; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: ${C.ink2}; }
  .defs { font-size: 8.5pt; color: ${C.ink2}; margin: 0; padding-left: 16px; }
  .defs li { margin: 2px 0; }
  .page-break { break-before: page; }
</style>
</head>
<body>
<main class="page">

  <header class="cover">
    <p class="eyebrow">Full Event Report</p>
    <h1 dir="auto">${esc(stats.event.name)}</h1>
    <p class="dates">${esc(eventRange)}</p>
    <p class="meta">
      Generated ${esc(generatedAt.toLocaleString('en-US', { timeZone: TZ, dateStyle: 'long', timeStyle: 'short' }))} (Cairo time)
      ${meta.generatedBy ? ` · Prepared by <span dir="auto">${esc(meta.generatedBy)}</span>` : ''}
      · Data as of ${esc(new Date(stats.generated_at).toLocaleString('en-US', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }))}
    </p>
  </header>
${parts.join('\n')}
</main>
</body>
</html>`;
}
