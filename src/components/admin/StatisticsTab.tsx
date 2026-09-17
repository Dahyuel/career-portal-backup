import React, { useState, useEffect, useCallback, useMemo, useContext, createContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../utils/logger';
import { useAuth } from '../../contexts/AuthContext';
import EventReportModal from './EventReportModal';
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
import { getActiveEventId } from '../../lib/currentEvent';

// ============================================================================
// Colour tokens (validated with the dataviz palette validator against the
// app's card surfaces: white in light mode, slate-800 in dark mode)
// ============================================================================

const PALETTES = {
  light: {
    surface: '#ffffff',
    series: ['#2a78d6', '#eb6834', '#1baf7a'],
    categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
    funnel: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab'],
    neutral: '#cbd5e1',
    meterTrack: '#dbeafe',
    grid: '#e2e8f0',
    baseline: '#cbd5e1',
    axis: '#64748b',
    hover: 'rgba(15, 23, 42, 0.05)',
    good: '#0ca30c',
    warning: '#fab219',
    critical: '#d03b3b'
  },
  dark: {
    surface: '#1e293b',
    series: ['#3987e5', '#d95926', '#199e70'],
    categorical: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
    funnel: ['#9ec5f4', '#6da7ec', '#3987e5', '#256abf'],
    neutral: '#475569',
    meterTrack: '#1e3a5f',
    grid: '#334155',
    baseline: '#475569',
    axis: '#94a3b8',
    hover: 'rgba(255, 255, 255, 0.05)',
    good: '#0ca30c',
    warning: '#fab219',
    critical: '#d03b3b'
  }
};

type Palette = typeof PALETTES.light;

// ============================================================================
// Designs — how the tab is drawn. Same data, no extra requests.
// ============================================================================

const DESIGNS = [
  { key: 'detailed', label: 'Detailed', icon: 'view_agenda', hint: 'Full cards with bar charts' },
  { key: 'compact', label: 'Compact', icon: 'grid_view', hint: 'Smaller cards, more on screen' },
  { key: 'pie', label: 'Pie charts', icon: 'pie_chart', hint: 'Pie charts where they fit' }
] as const;

type Design = typeof DESIGNS[number]['key'];

const DESIGN_STORAGE_KEY = 'admin.statistics.design';

const readDesign = (): Design => {
  try {
    const saved = localStorage.getItem(DESIGN_STORAGE_KEY);
    return DESIGNS.some((d) => d.key === saved) ? (saved as Design) : 'detailed';
  } catch {
    return 'detailed';
  }
};

const DesignContext = createContext<{ compact: boolean; pie: boolean }>({ compact: false, pie: false });
const useDesign = () => useContext(DesignContext);

const gridClass = (compact: boolean) =>
  compact ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start' : 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-start';

// ============================================================================
// Building blocks
// ============================================================================

interface CardProps {
  title: string;
  subtitle?: React.ReactNode;
  icon: string;
  table?: { columns: string[]; rows: (string | number)[][] };
  className?: string;
  children: React.ReactNode;
}

/** A chart card with an optional Chart / Table switch. */
const Card: React.FC<CardProps> = ({ title, subtitle, icon, table, className = '', children }) => {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const { compact } = useDesign();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
      <div className={`${compact ? 'px-4 pt-3 pb-2' : 'px-5 pt-4 pb-3'} flex items-start gap-3`}>
        <div className={`${compact ? 'w-8 h-8' : 'w-9 h-9'} shrink-0 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center`}>
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-lg">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {table && (
          <div className="shrink-0 inline-flex rounded-lg bg-slate-100 dark:bg-slate-700/60 p-0.5" role="group" aria-label="Choose view">
            {(['chart', 'table'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                title={v === 'chart' ? 'Chart view' : 'Table view'}
                className={`px-2 py-1 rounded-md flex items-center transition-colors ${view === v
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
              >
                <span className="material-symbols-outlined text-base">{v === 'chart' ? 'bar_chart' : 'table_rows'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={compact ? 'px-4 pb-4' : 'px-5 pb-5'}>
        {table && view === 'table' ? <DataTable columns={table.columns} rows={table.rows} /> : children}
      </div>
    </div>
  );
};

const DataTable: React.FC<{ columns: string[]; rows: (string | number)[][] }> = ({ columns, rows }) => (
  <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-700">
    <table className="w-full text-sm">
      <thead className="bg-slate-50 dark:bg-slate-900/40 sticky top-0">
        <tr>
          {columns.map((c, i) => (
            <th key={c} className={`px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 ${i === 0 ? 'text-left' : 'text-right'}`}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">No data</td></tr>
        ) : rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, i) => (
              <td key={i} className={`px-3 py-2 ${i === 0 ? 'text-left text-slate-800 dark:text-slate-200' : 'text-right tabular-nums text-slate-600 dark:text-slate-300'}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const countTable = (items: CountItem[], labelFn: (l: string) => string, total = sum(items), header = 'Category') => ({
  columns: [header, 'Count', 'Share'],
  rows: items.map((i) => [labelFn(i.label), formatNumber(i.count), pct(i.count, total)])
});

const EmptyState: React.FC<{ icon?: string; title: string; text?: string; action?: React.ReactNode }> = ({ icon = 'insights', title, text, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-8 px-4">
    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">{icon}</span>
    <p className="font-semibold text-slate-600 dark:text-slate-300">{title}</p>
    {text && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const StatTile: React.FC<{ label: string; value: number | string; hint?: string; icon: string; hero?: boolean }> = ({ label, value, hint, icon, hero }) => {
  const { compact } = useDesign();
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${compact ? 'p-4' : 'p-5'} ${hero ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span className="material-symbols-outlined text-lg">{icon}</span>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className={`${hero ? (compact ? 'text-4xl' : 'text-5xl') : (compact ? 'text-2xl' : 'text-3xl')} font-bold text-slate-900 dark:text-white mt-2`}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  );
};

interface BarListProps {
  items: CountItem[];
  palette: Palette;
  labelFn?: (label: string) => string;
  /** Fold everything after this many rows into "Other". */
  foldAfter?: number;
  total?: number;
  colorFor?: (label: string) => string | undefined;
  iconFor?: (label: string) => string | undefined;
}

/** Sorted horizontal bars. "Not specified" is always listed last, in grey. */
const BarList: React.FC<BarListProps> = ({ items, palette, labelFn = humanize, foldAfter, total, colorFor, iconFor }) => {
  const { compact } = useDesign();
  const known = items.filter((i) => i.label !== NOT_SPECIFIED && i.count > 0);
  const unknown = items.find((i) => i.label === NOT_SPECIFIED && i.count > 0);
  const base = total ?? sum(items);

  let rows: { key: string; label: string; count: number; color: string; icon?: string }[] = known.map((i) => ({
    key: i.label, label: labelFn(i.label), count: i.count, color: colorFor?.(i.label) ?? palette.series[0], icon: iconFor?.(i.label)
  }));

  if (foldAfter && rows.length > foldAfter + 1) {
    const rest = rows.slice(foldAfter);
    rows = rows.slice(0, foldAfter).concat({
      key: '__other', label: `Other (${rest.length} more)`, count: rest.reduce((s, r) => s + r.count, 0), color: palette.series[0]
    });
  }
  if (unknown) rows.push({ key: NOT_SPECIFIED, label: VALUE_LABELS[NOT_SPECIFIED], count: unknown.count, color: palette.neutral, icon: iconFor?.(NOT_SPECIFIED) });

  if (rows.length === 0) return <EmptyState title="No data yet" />;

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <ul className={compact ? 'space-y-2' : 'space-y-3'}>
      {rows.map((row) => (
        <li key={row.key} title={`${row.label}: ${formatNumber(row.count)} (${pct(row.count, base)})`}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
              {row.icon && <span className="material-symbols-outlined text-base" style={{ color: row.color }} aria-hidden>{row.icon}</span>}
              {row.label}
            </span>
            <span className="text-sm shrink-0 tabular-nums">
              <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(row.count)}</span>
              <span className="text-slate-400 dark:text-slate-500 ml-1.5 inline-block w-10 text-right">{pct(row.count, base)}</span>
            </span>
          </div>
          <div className={compact ? 'h-2' : 'h-2.5'}>
            <div
              className="h-full"
              style={{ width: `${Math.max((row.count / max) * 100, row.count > 0 ? 1.5 : 0)}%`, backgroundColor: row.color, borderRadius: '0 4px 4px 0' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

interface SplitSegment { key: string; label: string; count: number; color: string }

/** One 100% bar split into parts, with a legend that always shows the numbers. */
const SplitBar: React.FC<{ segments: SplitSegment[] }> = ({ segments }) => {
  const visible = segments.filter((s) => s.count > 0);
  const total = sum(visible);
  if (total === 0) return <EmptyState title="No data yet" />;

  return (
    <div>
      <div className="flex h-3.5 w-full rounded overflow-hidden" style={{ gap: 2 }} role="img"
        aria-label={visible.map((s) => `${s.label} ${s.count} (${pct(s.count, total)})`).join(', ')}>
        {visible.map((s) => (
          <div key={s.key} title={`${s.label}: ${formatNumber(s.count)} (${pct(s.count, total)})`}
            style={{ width: `${(s.count / total) * 100}%`, minWidth: 3, backgroundColor: s.color }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {visible.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm min-w-0">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} aria-hidden />
            <span className="text-slate-700 dark:text-slate-200 truncate">{s.label}</span>
            <span className="ml-auto shrink-0 tabular-nums">
              <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(s.count)}</span>
              <span className="text-slate-400 dark:text-slate-500 ml-1.5">{pct(s.count, total)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Builds split segments in a fixed order so a value always keeps its colour. */
const splitSegments = (items: CountItem[], order: string[], palette: Palette, labelFn: (l: string) => string = humanize): SplitSegment[] => {
  const known = order.filter((l) => l !== NOT_SPECIFIED);
  const extra = items.filter((i) => !order.includes(i.label) && i.label !== NOT_SPECIFIED).map((i) => i.label);
  return [...known, ...extra, NOT_SPECIFIED].map((label, idx) => ({
    key: label,
    label: labelFn(label),
    count: countOf(items, label),
    color: label === NOT_SPECIFIED ? palette.neutral : palette.series[Math.min(idx, palette.series.length - 1)]
  }));
};

/** Donut pie with the total in the middle and a legend that always shows the numbers. */
const PieDistribution: React.FC<{
  slices: Slice[];
  palette: Palette;
  colorFor?: (key: string) => string | undefined;
  iconFor?: (key: string) => string | undefined;
}> = ({ slices, palette, colorFor, iconFor }) => {
  const total = slices.reduce((s, x) => s + x.count, 0);
  if (total === 0) return <EmptyState title="No data yet" />;

  let valueIdx = 0;
  const colored = slices.map((s) => {
    const slot = palette.categorical[Math.min(valueIdx, palette.categorical.length - 1)];
    const color = s.kind === 'not_specified' ? palette.neutral : s.kind === 'other' ? slot : colorFor?.(s.key) ?? slot;
    if (s.kind !== 'not_specified') valueIdx++;
    // `fill` on each entry colours its slice (recharts 3; replaces the deprecated <Cell>).
    return { ...s, color, fill: color };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-slate-900 dark:text-white">{formatNumber(total)}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">total</span>
        </div>
        <PieChart width={150} height={150}>
          <Pie
            data={colored}
            dataKey="count"
            nameKey="label"
            innerRadius={46}
            outerRadius={72}
            startAngle={90}
            endAngle={-270}
            stroke={palette.surface}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const s = payload[0].payload as Slice & { color: string };
              return (
                <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-sm">
                  <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
                    {s.label}
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatNumber(s.count)} · {pct(s.count, total)}</p>
                </div>
              );
            }}
          />
        </PieChart>
      </div>
      <ul className="flex-1 w-full space-y-1.5 min-w-0">
        {colored.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm min-w-0">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} aria-hidden />
            {iconFor?.(s.key) && <span className="material-symbols-outlined text-base shrink-0" style={{ color: s.color }} aria-hidden>{iconFor(s.key)}</span>}
            <span className="text-slate-700 dark:text-slate-200 truncate">{s.label}</span>
            <span className="ml-auto shrink-0 tabular-nums">
              <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(s.count)}</span>
              <span className="text-slate-400 dark:text-slate-500 ml-1.5 inline-block w-10 text-right">{pct(s.count, total)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface DistributionProps {
  /** How the breakdown looks with bars: one split bar, or a list of bars. */
  kind: 'split' | 'list';
  items: CountItem[];
  palette: Palette;
  /** Fixed value order, so a value keeps its colour. */
  order?: string[];
  labelFn?: (label: string) => string;
  total?: number;
  foldAfter?: number;
  colorFor?: (label: string) => string | undefined;
  iconFor?: (label: string) => string | undefined;
}

/** A category breakdown drawn in the current design: bars, or a pie in the "Pie charts" design. */
const Distribution: React.FC<DistributionProps> = ({ kind, items, palette, order, labelFn = humanize, total, foldAfter, colorFor, iconFor }) => {
  const { pie } = useDesign();
  if (pie) return <PieDistribution slices={toSlices(items, labelFn, order)} palette={palette} colorFor={colorFor} iconFor={iconFor} />;
  if (kind === 'split') return <SplitBar segments={splitSegments(items, order ?? [], palette, labelFn)} />;
  return <BarList items={items} palette={palette} labelFn={labelFn} total={total} foldAfter={foldAfter} colorFor={colorFor} iconFor={iconFor} />;
};

const coverageNote = (items: CountItem[], noun = 'attendees') => {
  const total = sum(items);
  const known = total - countOf(items, NOT_SPECIFIED);
  if (known === total) return `All ${formatNumber(total)} ${noun}`;
  return `Recorded for ${formatNumber(known)} of ${formatNumber(total)} ${noun}`;
};

interface ColumnSeries { key: string; label: string; color: string }

/** Vertical columns over time (days or hours). One axis, hairline grid, hover tooltip. */
const ColumnChart: React.FC<{
  data: Record<string, string | number>[];
  xKey: string;
  series: ColumnSeries[];
  palette: Palette;
  formatX?: (v: string | number) => string;
  height?: number;
}> = ({ data, xKey, series, palette, formatX = (v) => String(v), height = 240 }) => {
  const { compact } = useDesign();
  return (
    <div>
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-4 mb-3">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <ResponsiveContainer width="100%" height={compact ? Math.round(height * 0.8) : height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke={palette.grid} />
          <XAxis
            dataKey={xKey}
            tickFormatter={formatX}
            tick={{ fontSize: 11, fill: palette.axis }}
            axisLine={{ stroke: palette.baseline }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: palette.axis }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            cursor={{ fill: palette.hover }}
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{formatX(label)}</p>
                  {payload.map((p: any) => (
                    <p key={p.dataKey} className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} aria-hidden />
                      {p.name}
                      <span className="ml-auto pl-3 font-semibold text-slate-900 dark:text-white tabular-nums">{formatNumber(p.value)}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${active
      ? 'bg-red-600 border-red-600 text-white shadow-sm'
      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-300'
      }`}
  >
    {children}
  </button>
);

// ============================================================================
// Sections
// ============================================================================

const OverviewSection: React.FC<{ stats: EventStatistics; palette: Palette }> = ({ stats, palette }) => {
  const { compact } = useDesign();
  const f = stats.funnel;
  const steps = [
    { label: 'Registered', value: f.registered, icon: 'how_to_reg' },
    { label: 'Approved', value: f.approved, icon: 'verified' },
    { label: 'Checked in at the event', value: f.checked_in, icon: 'login' },
    { label: 'Attended a session', value: f.attended_session, icon: 'event_available' }
  ];
  const registrations = stats.attendees.registrations_by_day;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 ${compact ? 'gap-3' : 'gap-4'}`}>
        <StatTile hero label="Registered attendees" value={f.registered} icon="groups"
          hint={`${formatNumber(stats.attendees.total - countOf(stats.attendees.asu, 'asu'))} from outside ASU`} />
        <StatTile label="Approved" value={f.approved} icon="verified" hint={`${pct(f.approved, f.registered)} of registered`} />
        <StatTile label="Checked in" value={f.checked_in} icon="login" hint={`${pct(f.checked_in, f.approved)} of approved`} />
        <StatTile label="Session bookings" value={stats.sessions.total_bookings} icon="calendar_month"
          hint={stats.sessions.cancelled_bookings ? `${formatNumber(stats.sessions.cancelled_bookings)} cancelled, not counted` : 'No cancellations'} />
      </div>

      <div className={compact ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-start' : 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-start'}>
        <Card
          title="Attendee journey"
          subtitle="How many attendees reach each step"
          icon="filter_alt"
          table={{
            columns: ['Step', 'Attendees', '% of registered', '% of previous step'],
            rows: steps.map((s, i) => [s.label, formatNumber(s.value), pct(s.value, f.registered), i === 0 ? '—' : pct(s.value, steps[i - 1].value)])
          }}
        >
          <ul className={compact ? 'space-y-3' : 'space-y-4'}>
            {steps.map((s, i) => (
              <li key={s.label}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-slate-400" aria-hidden>{s.icon}</span>
                    {s.label}
                  </span>
                  <span className="text-sm tabular-nums shrink-0">
                    <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(s.value)}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-1.5">{pct(s.value, f.registered)}</span>
                  </span>
                </div>
                <div className={compact ? 'h-3' : 'h-3.5'}>
                  <div className="h-full"
                    style={{ width: `${f.registered ? Math.max((s.value / f.registered) * 100, s.value > 0 ? 1.5 : 0) : 0}%`, backgroundColor: palette.funnel[i], borderRadius: '0 4px 4px 0' }} />
                </div>
                {i > 0 && steps[i - 1].value > 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{pct(s.value, steps[i - 1].value)} of the previous step</p>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Registrations over time"
          subtitle={registrations.length ? `${formatNumber(sum(registrations))} registrations on ${registrations.length} days` : undefined}
          icon="trending_up"
          table={{ columns: ['Date', 'Registrations'], rows: registrations.map((d) => [formatDay(d.label, true), formatNumber(d.count)]) }}
        >
          {registrations.length === 0 ? (
            <EmptyState title="No registration dates yet" />
          ) : (
            <ColumnChart
              data={registrations.map((d) => ({ date: d.label, count: d.count }))}
              xKey="date"
              series={[{ key: 'count', label: 'Registrations', color: palette.series[0] }]}
              palette={palette}
              formatX={(v) => formatShortDate(String(v))}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

const REGISTRATION_STATUS = {
  colors: (p: Palette): Record<string, string> => ({ approved: p.good, pending: p.warning, rejected: p.critical }),
  icons: { approved: 'check_circle', pending: 'schedule', rejected: 'cancel', [NOT_SPECIFIED]: 'help' } as Record<string, string>
};

const AttendeesSection: React.FC<{ stats: EventStatistics; palette: Palette }> = ({ stats, palette }) => {
  const { compact } = useDesign();
  const a = stats.attendees;
  const statusColors = REGISTRATION_STATUS.colors(palette);
  const sortedYears = [...a.class_year].sort((x, y) => Number(x.label) - Number(y.label));

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <span className="material-symbols-outlined text-base">info</span>
        Based on {formatNumber(a.total)} registered attendees. Staff accounts are not included. Missing answers are shown as “Not specified”.
      </p>

      <div className={gridClass(compact)}>
        <Card title="Registration status" subtitle={`All ${formatNumber(a.total)} attendees`} icon="how_to_reg"
          table={countTable(a.registration_status, humanize, a.total, 'Status')}>
          <Distribution kind="list" items={a.registration_status} palette={palette} total={a.total} order={['approved', 'pending', 'rejected']}
            colorFor={(l) => statusColors[l]} iconFor={(l) => REGISTRATION_STATUS.icons[l]} />
        </Card>

        <Card title="ASU vs other universities" subtitle={coverageNote(a.asu)} icon="school"
          table={countTable(a.asu, humanize, a.total, 'Group')}>
          <Distribution kind="split" items={a.asu} palette={palette} order={['asu', 'other']} />
        </Card>

        <Card title="Payment" subtitle="Payment is only required for students outside ASU" icon="payments"
          table={countTable(a.payment, humanize, a.total, 'Payment')}>
          <Distribution kind="split" items={a.payment} palette={palette} order={['paid', 'pending', 'not_required']} />
        </Card>

        <Card title="Gender" subtitle={coverageNote(a.gender)} icon="wc" table={countTable(a.gender, humanize, a.total, 'Gender')}>
          <Distribution kind="split" items={a.gender} palette={palette} order={['male', 'female']} />
        </Card>

        <Card title="Degree level" subtitle={coverageNote(a.degree_level)} icon="workspace_premium"
          table={countTable(a.degree_level, humanize, a.total, 'Degree level')}>
          <Distribution kind="split" items={a.degree_level} palette={palette} order={['undergraduate', 'graduate']} />
        </Card>

        <Card title="Year of study" subtitle={coverageNote(a.class_year)} icon="event_note"
          table={countTable(a.class_year, yearLabel, a.total, 'Year')}>
          <Distribution kind="list" items={sortedYears} palette={palette} total={a.total} labelFn={yearLabel} order={sortedYears.map((y) => y.label)} />
        </Card>

        <Card title="Universities" subtitle={`${a.universities.filter((u) => u.label !== NOT_SPECIFIED).length} universities`} icon="account_balance"
          table={countTable(a.universities, humanize, a.total, 'University')}>
          <Distribution kind="list" items={a.universities} palette={palette} total={a.total} foldAfter={6} />
        </Card>

        <Card title="Faculties" subtitle={`${a.faculties.filter((x) => x.label !== NOT_SPECIFIED).length} faculties`} icon="domain"
          table={countTable(a.faculties, facultyLabel, a.total, 'Faculty')}>
          <Distribution kind="list" items={a.faculties} palette={palette} total={a.total} foldAfter={8} labelFn={facultyLabel} />
        </Card>
      </div>
    </div>
  );
};

const CheckinsSection: React.FC<{ stats: EventStatistics; palette: Palette }> = ({ stats, palette }) => {
  const { compact } = useDesign();
  const allDays = stats.checkins.days;
  const eventDays = allDays.filter((d) => d.in_event_window);
  const outsideDays = allDays.filter((d) => !d.in_event_window);

  const [range, setRange] = useState<'event' | 'all'>('event');
  const days = range === 'event' ? eventDays : allDays;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = days.find((d) => d.date === selectedDate) ?? days[days.length - 1] ?? null;

  const totals = {
    checkIns: days.reduce((s, d) => s + d.check_ins, 0),
    checkOuts: days.reduce((s, d) => s + d.check_outs, 0),
    sessionAttendance: days.reduce((s, d) => s + d.session_attendance, 0)
  };

  const eventRange = `${formatShortDate(stats.event.start_day)} – ${formatShortDate(stats.event.end_day)}`;
  const outsideCount = outsideDays.reduce((s, d) => s + d.check_ins, 0);

  const hourly = useMemo(() => {
    if (!selected) return [];
    const hours = selected.hours.map((h) => h.hour);
    const from = Math.min(8, ...hours);
    const to = Math.max(18, ...hours);
    return Array.from({ length: to - from + 1 }, (_, i) => {
      const hour = from + i;
      return { hour, count: selected.hours.find((h) => h.hour === hour)?.count ?? 0 };
    });
  }, [selected]);

  const peak = selected?.hours.reduce<{ hour: number; count: number } | null>((best, h) => (!best || h.count > best.count ? h : best), null);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={range === 'event'} onClick={() => { setRange('event'); setSelectedDate(null); }}>Event days ({eventRange})</Chip>
        <Chip active={range === 'all'} onClick={() => { setRange('all'); setSelectedDate(null); }}>All dates</Chip>
        {range === 'event' && outsideCount > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">visibility_off</span>
            {formatNumber(outsideCount)} check-ins on {outsideDays.length} other {outsideDays.length === 1 ? 'date' : 'dates'} hidden
          </span>
        )}
      </div>

      {days.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <EmptyState
            icon="event_busy"
            title={range === 'event' ? 'No check-ins during the event dates yet' : 'No check-ins yet'}
            text={range === 'event' && outsideCount > 0
              ? `There are ${formatNumber(outsideCount)} check-ins on dates outside ${eventRange}, most likely from testing.`
              : 'Check-in numbers will appear here as soon as attendees start arriving.'}
            action={range === 'event' && outsideCount > 0 && (
              <button onClick={() => setRange('all')} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
                Show all dates
              </button>
            )}
          />
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-2 lg:grid-cols-4 ${compact ? 'gap-3' : 'gap-4'}`}>
            <StatTile label="Check-ins" value={totals.checkIns} icon="login" hint={`${days.length} ${days.length === 1 ? 'day' : 'days'}`} />
            <StatTile label="Checked out" value={totals.checkOuts} icon="logout" hint={`${pct(totals.checkOuts, totals.checkIns)} of check-ins`} />
            <StatTile label="Not checked out" value={totals.checkIns - totals.checkOuts} icon="door_open" />
            <StatTile label="Session attendance" value={totals.sessionAttendance} icon="event_available" hint="Scanned into a session" />
          </div>

          <Card
            title="Check-ins per day"
            subtitle="Choose a day below to see its details"
            icon="calendar_month"
            table={{
              columns: ['Day', 'Check-ins', 'Checked out', 'Unique attendees', 'Session attendance'],
              rows: days.map((d) => [formatDay(d.date, true), d.check_ins, d.check_outs, d.unique_attendees, d.session_attendance])
            }}
          >
            <ColumnChart
              data={days.map((d) => ({ date: d.date, check_ins: d.check_ins, check_outs: d.check_outs }))}
              xKey="date"
              series={[
                { key: 'check_ins', label: 'Check-ins', color: palette.series[0] },
                { key: 'check_outs', label: 'Checked out', color: palette.series[1] }
              ]}
              palette={palette}
              formatX={(v) => formatShortDate(String(v))}
            />
          </Card>

          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <Chip key={d.date} active={selected?.date === d.date} onClick={() => setSelectedDate(d.date)}>
                {formatDay(d.date)}
              </Chip>
            ))}
          </div>

          {selected && (
            <div className={gridClass(compact)}>
              <Card
                className="md:col-span-2 xl:col-span-3 lg:col-span-2"
                title={`Arrivals by hour — ${formatDay(selected.date, true)}`}
                subtitle={peak ? `Busiest hour: ${formatHour(peak.hour)} (${formatNumber(peak.count)} check-ins) · Cairo time` : 'Cairo time'}
                icon="schedule"
                table={{ columns: ['Hour', 'Check-ins'], rows: selected.hours.map((h) => [formatHour(h.hour), h.count]) }}
              >
                <ColumnChart
                  data={hourly}
                  xKey="hour"
                  series={[{ key: 'count', label: 'Check-ins', color: palette.series[0] }]}
                  palette={palette}
                  formatX={(v) => formatHour(Number(v))}
                  height={220}
                />
              </Card>

              <Card title="ASU vs other universities" subtitle={coverageNote(selected.asu, 'check-ins')} icon="school"
                table={countTable(selected.asu, humanize, selected.check_ins, 'Group')}>
                <Distribution kind="split" items={selected.asu} palette={palette} order={['asu', 'other']} />
              </Card>

              <Card title="Gender" subtitle={coverageNote(selected.gender, 'check-ins')} icon="wc"
                table={countTable(selected.gender, humanize, selected.check_ins, 'Gender')}>
                <Distribution kind="split" items={selected.gender} palette={palette} order={['male', 'female']} />
              </Card>

              <Card title="Universities" icon="account_balance" table={countTable(selected.universities, humanize, selected.check_ins, 'University')}>
                <Distribution kind="list" items={selected.universities} palette={palette} total={selected.check_ins} foldAfter={5} />
              </Card>

              <Card title="Faculties" icon="domain" table={countTable(selected.faculties, facultyLabel, selected.check_ins, 'Faculty')}>
                <Distribution kind="list" items={selected.faculties} palette={palette} total={selected.check_ins} foldAfter={5} labelFn={facultyLabel} />
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const SessionsSection: React.FC<{ stats: EventStatistics; palette: Palette }> = ({ stats, palette }) => {
  const { compact } = useDesign();
  const items = stats.sessions.items;
  const attended = items.reduce((s, i) => s + i.attended, 0);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className={`grid grid-cols-2 lg:grid-cols-4 ${compact ? 'gap-3' : 'gap-4'}`}>
        <StatTile label="Sessions" value={items.length} icon="event" />
        <StatTile label="Active bookings" value={stats.sessions.total_bookings} icon="calendar_month" />
        <StatTile label="Attended" value={attended} icon="event_available" hint={`${pct(attended, stats.sessions.total_bookings)} of bookings`} />
        <StatTile label="Cancelled" value={stats.sessions.cancelled_bookings} icon="event_busy" />
      </div>

      <Card
        title="Bookings by session"
        subtitle="Most booked first · bar shows how full each session is"
        icon="event_seat"
        table={{
          columns: ['Session', 'Booked', 'Capacity', 'Full', 'Attended', 'Cancelled'],
          rows: items.map((s) => [s.title, s.booked, s.capacity ?? '—', s.capacity ? pct(s.booked, s.capacity) : '—', s.attended, s.cancelled])
        }}
      >
        {items.length === 0 ? (
          <EmptyState icon="event" title="No sessions yet" />
        ) : (
          <ul className={`divide-y divide-slate-100 dark:divide-slate-700 ${compact ? 'md:grid md:grid-cols-2 md:gap-x-8 md:divide-y-0' : ''}`}>
            {items.map((s) => {
              const fill = s.capacity ? s.booked / s.capacity : 0;
              const state = !s.capacity ? null
                : fill >= 1 ? { label: 'Full', icon: 'block', color: palette.critical }
                  : fill >= 0.8 ? { label: 'Almost full', icon: 'warning', color: palette.warning }
                    : null;
              return (
                <li key={s.id} className={compact ? 'py-2' : 'py-3 first:pt-0 last:pb-0'}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {new Date(s.start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm tabular-nums">
                        <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(s.booked)}</span>
                        <span className="text-slate-400 dark:text-slate-500"> / {s.capacity ? formatNumber(s.capacity) : '—'}</span>
                      </p>
                      {state && (
                        <p className="text-xs font-semibold flex items-center gap-1 justify-end text-slate-700 dark:text-slate-200">
                          <span className="material-symbols-outlined text-sm" style={{ color: state.color }} aria-hidden>{state.icon}</span>
                          {state.label}
                        </p>
                      )}
                    </div>
                  </div>
                  {s.capacity ? (
                    <div className="h-2 mt-2 rounded" style={{ backgroundColor: palette.meterTrack }}>
                      <div className="h-full" style={{ width: `${Math.min(fill * 100, 100)}%`, minWidth: s.booked ? 3 : 0, backgroundColor: palette.series[0], borderRadius: '0 4px 4px 0' }} />
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    {formatNumber(s.attended)} attended
                    {s.cancelled > 0 && ` · ${formatNumber(s.cancelled)} cancelled`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

const PeopleSection: React.FC<{ stats: EventStatistics; palette: Palette }> = ({ stats, palette }) => {
  const { compact } = useDesign();
  const p = stats.people;
  const activeTeams = stats.volunteer_teams.filter((t) => t.count > 0);
  const emptyTeams = stats.volunteer_teams.filter((t) => t.count === 0);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className={`grid grid-cols-2 lg:grid-cols-5 ${compact ? 'gap-3' : 'gap-4'}`}>
        <StatTile label="Everyone" value={p.total} icon="groups" hint="All accounts with a role" />
        <StatTile label="Attendees" value={p.attendees} icon="person" />
        <StatTile label="Volunteers" value={p.volunteers} icon="volunteer_activism" hint="Including team leaders" />
        <StatTile label="Employers" value={p.employers} icon="badge" hint={`${formatNumber(stats.companies)} companies`} />
        <StatTile label="Admins" value={p.admins} icon="admin_panel_settings" />
      </div>

      <div className={compact ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-start' : 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-start'}>
        <Card title="Accounts by role" subtitle={`${formatNumber(p.total)} accounts`} icon="manage_accounts"
          table={countTable(p.by_role, roleLabel, p.total, 'Role')}>
          <Distribution kind="list" items={p.by_role} palette={palette} total={p.total} labelFn={roleLabel} />
        </Card>

        <Card
          title="Volunteer teams"
          subtitle={`${formatNumber(sum(activeTeams))} volunteers in ${activeTeams.length} of ${stats.volunteer_teams.length} teams`}
          icon="diversity_3"
          table={countTable(stats.volunteer_teams, (l) => l, sum(stats.volunteer_teams), 'Team')}
        >
          <Distribution kind="list" items={activeTeams} palette={palette} labelFn={(l) => l} />
          {emptyTeams.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">No members yet</p>
              <div className="flex flex-wrap gap-1.5">
                {emptyTeams.map((t) => (
                  <span key={t.label} className="px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">{t.label}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ============================================================================
// Tab
// ============================================================================

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'space_dashboard' },
  { key: 'attendees', label: 'Attendees', icon: 'school' },
  { key: 'checkins', label: 'Check-ins', icon: 'login' },
  { key: 'sessions', label: 'Sessions', icon: 'event' },
  { key: 'people', label: 'People & teams', icon: 'diversity_3' }
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

const StatisticsTab: React.FC<{ eventId?: string }> = ({ eventId = getActiveEventId() }) => {
  const { isDark } = useTheme();
  const { profile } = useAuth();
  const palette = isDark ? PALETTES.dark : PALETTES.light;

  const [stats, setStats] = useState<EventStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>('overview');
  const [showReport, setShowReport] = useState(false);
  const [design, setDesign] = useState<Design>(readDesign);

  const designValue = useMemo(() => ({ compact: design === 'compact', pie: design === 'pie' }), [design]);

  const chooseDesign = (next: Design) => {
    setDesign(next);
    try {
      localStorage.setItem(DESIGN_STORAGE_KEY, next);
    } catch {
      // Storage unavailable — the choice just won't be remembered.
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_get_event_statistics', { _event_id: eventId });
      if (rpcError) {
        logger.error('Error fetching statistics:', rpcError);
        setError(rpcError.code === '42501'
          ? 'You do not have permission to view these statistics.'
          : 'Could not load statistics. Please try again.');
        return;
      }
      setStats(data as EventStatistics);
    } catch (err) {
      logger.error('Error fetching statistics:', err);
      setError('Could not load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const header = (
    <div className="flex flex-wrap items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">monitoring</span>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Statistics</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {stats
            ? `${stats.event.name} · ${formatShortDate(stats.event.start_day)} – ${formatDay(stats.event.end_day, true).replace(/^\w+, /, '')} · Updated ${new Date(stats.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : 'Event numbers at a glance'}
        </p>
      </div>
      <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1" role="group" aria-label="Design">
        {DESIGNS.map((d) => (
          <button
            key={d.key}
            onClick={() => chooseDesign(d.key)}
            aria-pressed={design === d.key}
            title={d.hint}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${design === d.key
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
          >
            <span className="material-symbols-outlined text-base">{d.icon}</span>
            <span className="hidden sm:inline">{d.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setShowReport(true)}
        disabled={!stats}
        title="Create a printable report with charts for the whole event"
        className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-lg">summarize</span>
        Generate full report
      </button>
      <button
        onClick={load}
        disabled={loading}
        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
        Refresh
      </button>
    </div>
  );

  if (!stats) {
    return (
      <div className="space-y-6">
        {header}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
              <motion.div className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Loading statistics...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <EmptyState icon="error" title={error ?? 'Could not load statistics.'}
              action={<button onClick={load} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Try again</button>} />
          </div>
        )}
      </div>
    );
  }

  return (
    <DesignContext.Provider value={designValue}>
      <div className={designValue.compact ? 'space-y-4' : 'space-y-6'}>
        {header}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error} Showing the last loaded numbers.
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-1.5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap gap-1" role="tablist">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={section === s.key}
              onClick={() => setSection(s.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${section === s.key
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
            >
              <span className="material-symbols-outlined text-base">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Keep the previous numbers visible (dimmed) while refreshing. */}
        <div className={`transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div key={`${section}-${design}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {section === 'overview' && <OverviewSection stats={stats} palette={palette} />}
              {section === 'attendees' && <AttendeesSection stats={stats} palette={palette} />}
              {section === 'checkins' && <CheckinsSection stats={stats} palette={palette} />}
              {section === 'sessions' && <SessionsSection stats={stats} palette={palette} />}
              {section === 'people' && <PeopleSection stats={stats} palette={palette} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showReport && (
            <EventReportModal stats={stats} generatedBy={profile?.full_name} onClose={() => setShowReport(false)} />
          )}
        </AnimatePresence>
      </div>
    </DesignContext.Provider>
  );
};

export default StatisticsTab;
