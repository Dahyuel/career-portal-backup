// Events: every Career Expo and Career Week, and which one the website shows.
import React, { useCallback, useEffect, useState } from 'react';
import {
  buttonClass, callSadmin, errorText, eventHasEnded, formatDateTime, fromLocalInput, inputClass, labelClass,
  type EventSummary, type Notify
} from './sadminApi';
import { Badge, ConfirmDialog, EmptyState, ErrorBlock, LoadingBlock, MIcon, PageHeader, RefreshButton } from './ui';
import { EVENT_TYPE_LABELS } from '../../lib/landingContent';
import EventEditor from './EventEditor';

interface NewEventForm {
  name: string;
  event_type: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  copy_from: string;
}

const EMPTY_FORM: NewEventForm = { name: '', event_type: 'career_fair', start_date: '', end_date: '', venue_name: '', copy_from: '' };

const statusLabel = (status: string | null) => (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft');

// Live events are the ones people can pick when they sign in (get_active_events).
// More than one can be live at the same time.
const LIVE_STATUSES = ['published', 'active', 'open'];
const isLiveStatus = (status: string | null) => LIVE_STATUSES.includes(status ?? '');

const EventsManager: React.FC<{ notify: Notify }> = ({ notify }) => {
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewEventForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await callSadmin<{ events: EventSummary[] }>('sadmin_list_events', undefined, 'Could not load the events.');
      setEvents(r.events);
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Could not load the events.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    const current = events?.find((e) => e.is_current);
    setForm({ ...EMPTY_FORM, copy_from: current?.id ?? '' });
    setCreating(true);
  };

  const create = async () => {
    const start = fromLocalInput(form.start_date);
    const end = fromLocalInput(form.end_date);
    if (!form.name.trim()) return notify('Give the event a name.', 'warning');
    if (!start || !end) return notify('Choose when the event starts and ends.', 'warning');

    setBusy(true);
    try {
      const r = await callSadmin<{ id: string; teams: number }>('sadmin_create_event', {
        _details: { name: form.name.trim(), event_type: form.event_type, start_date: start, end_date: end, venue_name: form.venue_name.trim() },
        _copy_from: form.copy_from || null
      }, 'Could not create the event.');
      notify(`Event created${r.teams ? ` with ${r.teams} teams` : ''}. It stays hidden until you make it current.`, 'success');
      setCreating(false);
      setOpenId(r.id);
    } catch (err) {
      notify(errorText(err, 'Could not create the event.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (openId) {
    return <EventEditor eventId={openId} notify={notify} onBack={() => { setOpenId(null); load(); }} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon="event"
        title="Events"
        subtitle="Publish an event to make it live — people pick from the live events when they sign in, and several can run at once. The current event is the single one the landing page and new sign-ups default to."
        actions={
          <>
            <RefreshButton onClick={load} loading={loading} />
            <button className={buttonClass.primary} onClick={openCreate} disabled={!events}>
              <MIcon name="add" className="text-lg" /> Create event
            </button>
          </>
        }
      />

      {error && !events ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : loading && !events ? (
        <LoadingBlock label="Loading events..." />
      ) : !events || events.length === 0 ? (
        <EmptyState icon="event_busy" title="No events yet" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {events.map((e) => (
            <button
              key={e.id}
              onClick={() => setOpenId(e.id)}
              className={`text-left bg-white dark:bg-slate-800 rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${e.is_current ? 'border-emerald-300 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{e.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {EVENT_TYPE_LABELS[e.event_type ?? ''] ?? 'Event'} · {e.venue_name || 'No venue set'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                  {isLiveStatus(e.status) ? <Badge tone="green">Live</Badge> : <Badge>{statusLabel(e.status)}</Badge>}
                  {e.is_current && <Badge tone="amber">Current</Badge>}
                  {eventHasEnded(e.status, e.end_date) && <Badge tone="red">Ended</Badge>}
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 flex items-center gap-1.5">
                <MIcon name="calendar_month" className="text-base text-slate-400" />
                {formatDateTime(e.start_date)} → {formatDateTime(e.end_date)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge tone="blue">{e.attendees.toLocaleString()} attendees</Badge>
                <Badge>{e.staff.toLocaleString()} staff</Badge>
                <Badge>{e.teams} teams</Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={creating}
        title="Create a new event"
        confirmLabel="Create event"
        busy={busy}
        onClose={() => setCreating(false)}
        onConfirm={create}
        description={<p>The new event is hidden from the website until you make it current, so you can prepare it first.</p>}
      >
        <div>
          <label className={labelClass}>Event name</label>
          <input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. ASU Career Week 2026" />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className={inputClass}>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Starts</label>
            <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ends</label>
            <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Venue</label>
          <input value={form.venue_name} maxLength={200} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Start from</label>
          <select value={form.copy_from} onChange={(e) => setForm({ ...form, copy_from: e.target.value })} className={inputClass}>
            <option value="">Nothing (empty teams, default landing page)</option>
            {(events ?? []).map((e) => <option key={e.id} value={e.id}>Copy from {e.name}</option>)}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Copies volunteer teams, points rules and the landing page. Team leaders and people are not copied.</p>
        </div>
      </ConfirmDialog>
    </div>
  );
};

export default EventsManager;
