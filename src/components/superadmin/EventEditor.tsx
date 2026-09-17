// One event: its details, landing page, volunteer teams, and making it the current event.
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft } from '../icons';
import {
  buttonClass, callSadmin, errorText, formatDateTime, fromLocalInput, inputClass, labelClass, toLocalInput,
  type EventDetail, type EventTeamRow, type Notify
} from './sadminApi';
import { Badge, ConfirmDialog, ErrorBlock, LoadingBlock, MIcon, Panel, Toggle } from './ui';
import { EVENT_TYPE_LABELS } from '../../lib/landingContent';
import LandingEditor from './LandingEditor';

type View = 'details' | 'landing' | 'teams';

// The statuses v2 allows on events.
const STATUS_OPTIONS = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];

// get_active_events() lists exactly these, and that is the list people choose from
// when they sign in. Several events can be live at the same time.
const LIVE_STATUSES = ['published', 'active', 'open'];

const isLiveStatus = (status: string | null | undefined) => LIVE_STATUSES.includes(status ?? '');

// Shown next to each status so it is obvious which ones people can actually see.
const STATUS_HINTS: Record<string, string> = {
  draft: 'hidden from everyone',
  published: 'live — people can choose it',
  ongoing: 'hidden from the chooser',
  completed: 'hidden from the chooser',
  cancelled: 'hidden from the chooser'
};

const statusOptionLabel = (s: string) =>
  `${s.charAt(0).toUpperCase() + s.slice(1)}${STATUS_HINTS[s] ? ` — ${STATUS_HINTS[s]}` : ''}`;

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------
interface DetailsForm {
  name: string;
  event_type: string;
  venue_name: string;
  start_date: string;
  end_date: string;
  status: string;
  allow_non_asu_attendees: boolean;
  non_asu_ticket_price: string;
}

const toForm = (e: EventDetail['event']): DetailsForm => ({
  name: e.name ?? '',
  event_type: e.event_type ?? 'career_fair',
  venue_name: e.venue_name ?? '',
  start_date: toLocalInput(e.start_date),
  end_date: toLocalInput(e.end_date),
  status: e.status ?? 'draft',
  allow_non_asu_attendees: !!e.allow_non_asu_attendees,
  non_asu_ticket_price: e.non_asu_ticket_price === null || e.non_asu_ticket_price === undefined ? '' : String(e.non_asu_ticket_price)
});

const DetailsEditor: React.FC<{ detail: EventDetail; notify: Notify; onSaved: () => void }> = ({ detail, notify, onSaved }) => {
  const original = toForm(detail.event);
  const [form, setForm] = useState<DetailsForm>(original);
  const [busy, setBusy] = useState(false);

  const changes: Record<string, unknown> = {};
  if (form.name.trim() !== original.name) changes.name = form.name.trim();
  if (form.event_type !== original.event_type) changes.event_type = form.event_type;
  if (form.venue_name.trim() !== original.venue_name) changes.venue_name = form.venue_name.trim();
  if (form.start_date !== original.start_date) changes.start_date = fromLocalInput(form.start_date);
  if (form.end_date !== original.end_date) changes.end_date = fromLocalInput(form.end_date);
  if (form.status !== original.status) changes.status = form.status;
  if (form.allow_non_asu_attendees !== original.allow_non_asu_attendees) changes.allow_non_asu_attendees = form.allow_non_asu_attendees;
  if (form.non_asu_ticket_price !== original.non_asu_ticket_price) {
    changes.non_asu_ticket_price = form.non_asu_ticket_price === '' ? 0 : Number(form.non_asu_ticket_price);
  }
  const changed = Object.keys(changes).length > 0;

  const save = async () => {
    setBusy(true);
    try {
      await callSadmin('sadmin_update_event_settings', { _event_id: detail.event.id, _settings: changes }, 'Could not save the event details.');
      notify('Event details saved.', 'success');
      onSaved();
    } catch (err) {
      notify(errorText(err, 'Could not save the event details.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const statusOptions = STATUS_OPTIONS.includes(original.status) ? STATUS_OPTIONS : [original.status, ...STATUS_OPTIONS];

  return (
    <Panel title="Event details" subtitle="Used for registration, tickets, dashboards and statistics. The landing page text is edited separately.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Event name</label>
          <input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className={inputClass}>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Starts</label>
          <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ends</label>
          <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Venue</label>
          <input value={form.venue_name} maxLength={200} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            {statusOptions.map((s) => <option key={s} value={s}>{statusOptionLabel(s)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Ticket price for non-ASU attendees</label>
          <input
            type="number"
            min={0}
            max={100000}
            value={form.non_asu_ticket_price}
            onChange={(e) => setForm({ ...form, non_asu_ticket_price: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Allow non-ASU attendees</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Students from other universities can register.</p>
          </div>
          <Toggle checked={form.allow_non_asu_attendees} label="Allow non-ASU attendees" onChange={(v) => setForm({ ...form, allow_non_asu_attendees: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className={buttonClass.ghost} disabled={!changed || busy} onClick={() => setForm(original)}>Discard</button>
        <button className={buttonClass.primary} disabled={!changed || busy} onClick={save}>Save details</button>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// Volunteer teams
// ---------------------------------------------------------------------------
interface TeamDraft {
  team_name: string;
  description: string;
  points_per_hour: string;
}

const toDraft = (t?: EventTeamRow): TeamDraft => ({
  team_name: t?.team_name ?? '',
  description: t?.description ?? '',
  points_per_hour: String(t?.points_per_hour ?? 10)
});

const TeamsEditor: React.FC<{ eventId: string; teams: EventTeamRow[]; notify: Notify; onChanged: () => void }> = ({ eventId, teams, notify, onChanged }) => {
  const [drafts, setDrafts] = useState<Record<string, TeamDraft>>(() => Object.fromEntries(teams.map((t) => [t.id, toDraft(t)])));
  const [newTeam, setNewTeam] = useState<TeamDraft>(toDraft());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EventTeamRow | null>(null);

  const save = async (teamId: string | null, draft: TeamDraft) => {
    setBusyId(teamId ?? 'new');
    try {
      await callSadmin('sadmin_save_team', {
        _event_id: eventId,
        _team_id: teamId,
        _team_name: draft.team_name.trim(),
        _description: draft.description.trim(),
        _points_per_hour: Number(draft.points_per_hour) || 0
      }, 'Could not save the team.');
      notify(teamId ? 'Team saved.' : 'Team added.', 'success');
      if (!teamId) setNewTeam(toDraft());
      onChanged();
    } catch (err) {
      notify(errorText(err, 'Could not save the team.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await callSadmin('sadmin_delete_team', { _event_id: eventId, _team_id: deleting.id }, 'Could not delete the team.');
      notify('Team deleted.', 'success');
      setDeleting(null);
      onChanged();
    } catch (err) {
      notify(errorText(err, 'Could not delete the team.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const row = (draft: TeamDraft, onChange: (d: TeamDraft) => void) => (
    <>
      <input value={draft.team_name} maxLength={60} onChange={(e) => onChange({ ...draft, team_name: e.target.value })} className={inputClass} placeholder="Team name" aria-label="Team name" />
      <input value={draft.description} maxLength={300} onChange={(e) => onChange({ ...draft, description: e.target.value })} className={inputClass} placeholder="Short description" aria-label="Description" />
      <input type="number" min={0} max={1000} value={draft.points_per_hour} onChange={(e) => onChange({ ...draft, points_per_hour: e.target.value })} className={inputClass} aria-label="Points per hour" />
    </>
  );

  return (
    <Panel
      title="Volunteer teams"
      subtitle="Shown in volunteer and team leader registration, team dashboards and role management. Staff roles such as Registration, Building, Info Desk, Verification and Technical Support are linked to the team with the same name."
    >
      <div className="hidden md:grid md:grid-cols-[1fr_1.5fr_120px_auto] gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 mb-2">
        <span>Team</span><span>Description</span><span>Points / hour</span><span className="w-40" />
      </div>
      <div className="space-y-3">
        {teams.map((t) => {
          const draft = drafts[t.id] ?? toDraft(t);
          const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(t));
          return (
            <div key={t.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_120px_auto] gap-3 items-center">
              {row(draft, (d) => setDrafts({ ...drafts, [t.id]: d }))}
              <div className="flex items-center gap-1 md:w-40 justify-end">
                <Badge tone={t.volunteers ? 'blue' : 'neutral'}>{t.volunteers} vol.</Badge>
                <button className={buttonClass.ghost} disabled={!dirty || busyId !== null} onClick={() => save(t.id, draft)} title="Save">
                  <MIcon name="save" className="text-lg" />
                </button>
                <button
                  className={`${buttonClass.ghost} hover:!text-red-600`}
                  disabled={busyId !== null || t.volunteers > 0}
                  onClick={() => setDeleting(t)}
                  title={t.volunteers > 0 ? 'Move its volunteers first' : 'Delete team'}
                >
                  <MIcon name="delete" className="text-lg" />
                </button>
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_120px_auto] gap-3 items-center pt-3 border-t border-slate-100 dark:border-slate-700">
          {row(newTeam, setNewTeam)}
          <div className="md:w-40 flex justify-end">
            <button className={buttonClass.primary} disabled={!newTeam.team_name.trim() || busyId !== null} onClick={() => save(null, newTeam)}>
              <MIcon name="add" className="text-lg" /> Add team
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Delete team"
        confirmLabel="Delete"
        danger
        busy={busyId !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        description={<p>Delete the <strong>{deleting?.team_name}</strong> team from this event?</p>}
      />
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
const EventEditor: React.FC<{ eventId: string; notify: Notify; onBack: () => void }> = ({ eventId, notify, onBack }) => {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('details');
  const [makeCurrentOpen, setMakeCurrentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await callSadmin<EventDetail>('sadmin_get_event', { _event_id: eventId }, 'Could not load the event.');
      setDetail(r);
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Could not load the event.'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const makeCurrent = async (reason: string, typed: string) => {
    setBusy(true);
    try {
      await callSadmin('sadmin_set_current_event', { _event_id: eventId, _confirm_name: typed, _reason: reason }, 'Could not switch the current event.');
      notify(`${detail?.event.name ?? 'The event'} is now the current event. Reloading...`, 'success');
      setMakeCurrentOpen(false);
      // Every page caches the active event at start-up, so reload to switch everything at once.
      window.setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      notify(errorText(err, 'Could not switch the current event.'), 'error');
      setBusy(false);
    }
  };

  const remove = async (reason: string, typed: string) => {
    setBusy(true);
    try {
      await callSadmin('sadmin_delete_event', { _event_id: eventId, _confirm_name: typed, _reason: reason }, 'Could not delete the event.');
      notify(`${detail?.event.name ?? 'The event'} was deleted.`, 'success');
      setDeleteOpen(false);
      onBack();
    } catch (err) {
      notify(errorText(err, 'Could not delete the event.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Publishing is what makes an event appear in the chooser people see when they
  // sign in. It is independent of "current": any number of events can be live.
  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      await callSadmin('sadmin_update_event_settings', { _event_id: eventId, _settings: { status } }, 'Could not change the event status.');
      notify(
        status === 'published'
          ? `${detail?.event.name ?? 'The event'} is live. People can now choose it when they sign in.`
          : `${detail?.event.name ?? 'The event'} is no longer live.`,
        status === 'published' ? 'success' : 'warning'
      );
      load();
    } catch (err) {
      notify(errorText(err, 'Could not change the event status.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <button className={`${buttonClass.ghost} !px-0`} onClick={onBack}>
      <ChevronLeft className="w-4 h-4" /> All events
    </button>
  );

  if (error && !detail) return <div className="space-y-4">{back}<ErrorBlock message={error} onRetry={load} /></div>;
  if (!detail) return <div className="space-y-4">{back}<LoadingBlock label="Loading the event..." /></div>;

  const { event } = detail;
  const live = isLiveStatus(event.status);
  const tabs: [View, string, string][] = [
    ['details', 'Details', 'info'],
    ['landing', 'Landing page', 'web'],
    ['teams', `Volunteer teams (${detail.teams.length})`, 'groups']
  ];

  return (
    <div className="space-y-6">
      {back}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{event.name}</h2>
            {live ? <Badge tone="green">Live</Badge> : <Badge>Not live</Badge>}
            {event.is_current && <Badge tone="amber">Current event</Badge>}
            <Badge tone="blue">{EVENT_TYPE_LABELS[event.event_type ?? ''] ?? 'Event'}</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {formatDateTime(event.start_date)} → {formatDateTime(event.end_date)}{event.venue_name ? ` · ${event.venue_name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {live ? (
            <button className={buttonClass.ghost} onClick={() => setStatus('draft')} disabled={loading || busy}>
              <MIcon name="visibility_off" className="text-lg" /> Unpublish
            </button>
          ) : (
            <button className={buttonClass.primary} onClick={() => setStatus('published')} disabled={loading || busy}>
              <MIcon name="publish" className="text-lg" /> Publish event
            </button>
          )}
          {!event.is_current && (
            <>
              <button className={buttonClass.danger} onClick={() => setMakeCurrentOpen(true)} disabled={loading || busy}>
                <MIcon name="rocket_launch" className="text-lg" /> Make current event
              </button>
              <button className={`${buttonClass.ghost} hover:!text-red-600`} onClick={() => setDeleteOpen(true)} disabled={loading || busy}>
                <MIcon name="delete" className="text-lg" /> Delete event
              </button>
            </>
          )}
        </div>
      </div>

      <div className="inline-flex flex-wrap rounded-xl bg-slate-100 dark:bg-slate-900 p-1" role="tablist">
        {tabs.map(([key, label, icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${view === key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <MIcon name={icon} className="text-lg" /> {label}
          </button>
        ))}
      </div>

      {view === 'details' && <DetailsEditor key={JSON.stringify(event)} detail={detail} notify={notify} onSaved={load} />}
      {view === 'landing' && (
        <LandingEditor eventId={event.id} stored={detail.landing} isCurrent={event.is_current} notify={notify} onSaved={load} />
      )}
      {view === 'teams' && (
        <TeamsEditor key={JSON.stringify(detail.teams)} eventId={event.id} teams={detail.teams} notify={notify} onChanged={load} />
      )}

      <ConfirmDialog
        open={makeCurrentOpen}
        title="Make this the current event"
        confirmLabel="Make current"
        danger
        reason="required"
        typeToConfirm={event.name}
        busy={busy}
        onClose={() => setMakeCurrentOpen(false)}
        onConfirm={makeCurrent}
        description={
          <ul className="list-disc pl-5 space-y-1.5">
            <li>The website, registration and every dashboard switch to <strong>{event.name}</strong> immediately.</li>
            <li>Registration, session booking and feedback start <strong>closed</strong>. Open them from Event Controls when you are ready.</li>
            <li>People keep their accounts. After logging in they join this event; staff roles are assigned again in People &amp; Access. Super admins keep access to every event.</li>
            <li>The previous event and its data stay saved.</li>
          </ul>
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this event"
        confirmLabel="Delete event"
        danger
        reason="required"
        typeToConfirm={event.name}
        busy={busy}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        description={
          <>
            <p>Deletes <strong>{event.name}</strong> with its volunteer teams and points rules. This cannot be undone.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only an empty event can be deleted. If it already has people, registrations, sessions, companies, check-ins, bookings or a schedule, you are told what is still in it and nothing is removed.
            </p>
          </>
        }
      />
    </div>
  );
};

export default EventEditor;
