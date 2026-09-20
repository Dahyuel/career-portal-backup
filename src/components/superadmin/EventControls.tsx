// Event Controls: open/close registration, booking and feedback for ONE event
// (each event has its own switches since v2_06), plus site-wide maintenance and
// the event's details.
import React, { useCallback, useEffect, useState } from 'react';
import {
  buttonClass,
  callSadmin,
  errorText,
  eventId,
  formatDateTime,
  fromLocalInput,
  inputClass,
  labelClass,
  toLocalInput,
  type EventControl,
  type EventControlName,
  type EventControlsState,
  type EventSettings,
  type EventSummary,
  type MaintenanceState,
  type Notify
} from './sadminApi';
import { Badge, ConfirmDialog, ErrorBlock, LoadingBlock, MIcon, PageHeader, Panel, RefreshButton, Toggle } from './ui';
import { COLOUR_PRESETS, DEFAULT_ACCENT, isHexColour, normaliseHex, buildThemeVars } from '../../lib/theme';

const DEFAULT_MESSAGE = 'System is under maintenance. Please try again later.';
const STATUS_OPTIONS = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];

const SWITCHES: { key: EventControlName; effective: keyof EventControlsState; title: string; on: string; off: string }[] = [
  {
    key: 'registration',
    effective: 'registration_open',
    title: 'Attendee registration',
    on: 'New attendees can register for this event.',
    off: 'New registrations are refused. Admins can still add attendees.'
  },
  {
    key: 'booking',
    effective: 'booking_open',
    title: 'Session booking',
    on: 'Attendees can book sessions.',
    off: 'Attendees cannot book sessions. Staff (for example the building team) still can. Existing bookings stay.'
  },
  {
    key: 'feedback',
    effective: 'feedback_open',
    title: 'Event feedback',
    on: 'Attendees and volunteers can submit feedback.',
    off: 'The feedback form is closed. Feedback already submitted stays visible to its author.'
  }
];

interface SettingsResult {
  event: EventSettings;
  controls: EventControlsState;
  maintenance: MaintenanceState;
}

interface EventForm {
  name: string;
  venue_name: string;
  start_date: string;
  end_date: string;
  status: string;
  allow_non_asu_attendees: boolean;
  non_asu_ticket_price: string;
}

const toForm = (e: EventSettings): EventForm => ({
  name: e.name ?? '',
  venue_name: e.venue_name ?? '',
  start_date: toLocalInput(e.start_date),
  end_date: toLocalInput(e.end_date),
  status: e.status ?? '',
  allow_non_asu_attendees: !!e.allow_non_asu_attendees,
  non_asu_ticket_price: e.non_asu_ticket_price === null || e.non_asu_ticket_price === undefined ? '' : String(e.non_asu_ticket_price)
});

const EMPTY_CONTROL: EventControl = { open: true, opens_at: null, closes_at: null };

const EventControls: React.FC<{ notify: Notify }> = ({ notify }) => {
  const [data, setData] = useState<SettingsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Controls belong to an event, so this tab works on whichever event you pick.
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [targetEventId, setTargetEventId] = useState<string>(eventId());

  const [pendingSwitch, setPendingSwitch] = useState<{ key: EventControlName; value: boolean } | null>(null);
  const [schedule, setSchedule] = useState<Record<string, { opens_at: string; closes_at: string }>>({});
  const [maintenanceMessage, setMaintenanceMessage] = useState(DEFAULT_MESSAGE);
  const [maintenanceEnds, setMaintenanceEnds] = useState('');
  const [maintenanceDialog, setMaintenanceDialog] = useState<'on' | 'off' | null>(null);
  const [form, setForm] = useState<EventForm | null>(null);
  const [saveDialog, setSaveDialog] = useState(false);

  // Dashboard theme state
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [savedAccent, setSavedAccent] = useState(DEFAULT_ACCENT);
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    let cancelled = false;
    callSadmin<{ events: EventSummary[] }>('sadmin_list_events', undefined, 'Could not load the events.')
      .then((r) => {
        if (cancelled) return;
        setEvents(r.events);
        setTargetEventId((prev) => prev || r.events.find((e) => e.is_current)?.id || r.events[0]?.id || '');
      })
      .catch(() => {
        /* The picker stays hidden and the active event is used. */
      });
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    if (!targetEventId) return;
    setLoading(true);
    try {
      const r = await callSadmin<SettingsResult>('sadmin_get_event_settings', { _event_id: targetEventId }, 'Could not load the event settings.');
      setData(r);
      setForm(toForm(r.event));
      setMaintenanceMessage(r.maintenance.stored_enabled ? r.maintenance.message : DEFAULT_MESSAGE);
      // Seed the schedule inputs from what is stored for this event.
      setSchedule(Object.fromEntries(SWITCHES.map((s) => {
        const c = (r.controls[s.key] as EventControl | undefined) ?? EMPTY_CONTROL;
        return [s.key, { opens_at: toLocalInput(c.opens_at), closes_at: toLocalInput(c.closes_at) }];
      })));
      setError(null);

      // Load the current accent colour from the event's landing content.
      try {
        const eventDetail = await callSadmin<{ event: Record<string, unknown>; landing: Record<string, unknown> | null }>('sadmin_get_event', { _event_id: targetEventId }, '');
        const theme = eventDetail?.landing?.theme as Record<string, unknown> | null | undefined;
        const accent = normaliseHex(theme?.accent as string | undefined);
        setAccentColor(accent);
        setSavedAccent(accent);
      } catch {
        // Not critical — the colour picker stays at the default.
      }
    } catch (err) {
      setError(errorText(err, 'Could not load the event settings.'));
    } finally {
      setLoading(false);
    }
  }, [targetEventId]);

  useEffect(() => { load(); }, [load]);

  if (error && !data) return <ErrorBlock message={error} onRetry={load} />;
  if (loading && !data) return <LoadingBlock label="Loading event settings..." />;
  if (!data || !form) return null;

  const { controls, maintenance, event } = data;
  const selectedEvent = events.find((e) => e.id === targetEventId) ?? null;
  const selectedEventName = selectedEvent?.name ?? event.name ?? 'this event';

  const sendControls = async (payload: Record<string, Partial<EventControl>>, message: string, tone: 'success' | 'warning') => {
    setBusy(true);
    try {
      const r = await callSadmin<{ controls: EventControlsState }>(
        'sadmin_set_event_controls',
        { _event_id: targetEventId, _controls: payload },
        'Could not change the setting.'
      );
      setData((prev) => (prev ? { ...prev, controls: r.controls } : prev));
      notify(message, tone);
      return true;
    } catch (err) {
      notify(errorText(err, 'Could not change the setting.'), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const applySwitch = async () => {
    if (!pendingSwitch) return;
    const title = SWITCHES.find((s) => s.key === pendingSwitch.key)?.title ?? 'Setting';
    const ok = await sendControls(
      { [pendingSwitch.key]: { open: pendingSwitch.value } },
      `${title} is now ${pendingSwitch.value ? 'open' : 'closed'} for ${selectedEventName}.`,
      pendingSwitch.value ? 'success' : 'warning'
    );
    if (ok) setPendingSwitch(null);
  };

  const applySchedule = async (key: EventControlName) => {
    const entry = schedule[key] ?? { opens_at: '', closes_at: '' };
    const opensAt = entry.opens_at ? fromLocalInput(entry.opens_at) : null;
    const closesAt = entry.closes_at ? fromLocalInput(entry.closes_at) : null;
    if (entry.opens_at && !opensAt) return notify('The opening time is not valid.', 'error');
    if (entry.closes_at && !closesAt) return notify('The closing time is not valid.', 'error');

    const title = SWITCHES.find((s) => s.key === key)?.title ?? 'Setting';
    await sendControls(
      { [key]: { opens_at: opensAt, closes_at: closesAt } },
      opensAt || closesAt ? `${title} schedule saved.` : `${title} schedule cleared.`,
      'success'
    );
  };

  const applyMaintenance = async (enabled: boolean) => {
    const endsAt = enabled ? fromLocalInput(maintenanceEnds) : null;
    if (enabled && maintenanceEnds && !endsAt) return notify('The end time is not valid.', 'error');
    setBusy(true);
    try {
      const r = await callSadmin<{ maintenance: MaintenanceState }>('sadmin_set_maintenance', {
        _enabled: enabled,
        _message: maintenanceMessage.trim() || DEFAULT_MESSAGE,
        _ends_at: endsAt
      }, 'Could not change maintenance mode.');
      setData((prev) => (prev ? { ...prev, maintenance: r.maintenance } : prev));
      notify(enabled ? 'Maintenance mode is on. Everyone except super admins is blocked.' : 'Maintenance mode is off. The site is open again.', enabled ? 'warning' : 'success');
      setMaintenanceDialog(null);
      setMaintenanceEnds('');
    } catch (err) {
      notify(errorText(err, 'Could not change maintenance mode.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Only fields that actually changed are sent.
  const original = toForm(event);
  const changes: Record<string, unknown> = {};
  if (form.name.trim() !== original.name) changes.name = form.name.trim();
  if (form.venue_name.trim() !== original.venue_name) changes.venue_name = form.venue_name.trim();
  if (form.start_date !== original.start_date) changes.start_date = fromLocalInput(form.start_date);
  if (form.end_date !== original.end_date) changes.end_date = fromLocalInput(form.end_date);
  if (form.status !== original.status) changes.status = form.status;
  if (form.allow_non_asu_attendees !== original.allow_non_asu_attendees) changes.allow_non_asu_attendees = form.allow_non_asu_attendees;
  if (form.non_asu_ticket_price !== original.non_asu_ticket_price) changes.non_asu_ticket_price = form.non_asu_ticket_price === '' ? null : Number(form.non_asu_ticket_price);
  const changedKeys = Object.keys(changes);

  const saveEvent = async () => {
    setBusy(true);
    try {
      await callSadmin('sadmin_update_event_settings', { _event_id: targetEventId, _settings: changes }, 'Could not save the event details.');
      notify('Event details saved.', 'success');
      setSaveDialog(false);
      load();
    } catch (err) {
      notify(errorText(err, 'Could not save the event details.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const statusOptions = STATUS_OPTIONS.includes(original.status) || !original.status ? STATUS_OPTIONS : [original.status, ...STATUS_OPTIONS];
  const expired = maintenance.stored_enabled && !maintenance.enabled;
  const pendingInfo = pendingSwitch ? SWITCHES.find((s) => s.key === pendingSwitch.key) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon="tune"
        title="Event Controls"
        subtitle={`Settings for ${selectedEventName}. Every change takes effect immediately and is saved in the activity log.`}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      {events.length > 1 && (
        <Panel>
          <label className={labelClass}>Event</label>
          <select
            value={targetEventId}
            onChange={(e) => setTargetEventId(e.target.value)}
            aria-label="Choose the event to control"
            className={`${inputClass} md:w-96`}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}{e.is_current ? ' (current)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Each event opens and closes on its own, so one can take registrations while another is closed.
          </p>
        </Panel>
      )}

      {/* Maintenance — the one setting that is not per event */}
      <Panel
        title="Maintenance mode (whole site)"
        subtitle="Closes every event for everyone except super admins."
        className={maintenance.enabled ? 'border-red-300 dark:border-red-800' : ''}
        actions={maintenance.enabled ? <Badge tone="red">On</Badge> : <Badge tone="green">Off</Badge>}
      >
        {maintenance.enabled ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-4">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Visitors see: “{maintenance.message}”</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                {maintenance.ends_at ? `Ends automatically ${formatDateTime(maintenance.ends_at)}.` : 'Stays on until a super admin turns it off.'}
              </p>
            </div>
            <button className={buttonClass.primary} onClick={() => setMaintenanceDialog('off')} disabled={busy}>
              <MIcon name="power_settings_new" className="text-lg" /> Turn off and reopen the site
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {expired && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The last maintenance window ended {formatDateTime(maintenance.ends_at)}.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className={labelClass}>Message shown to visitors</label>
                <input value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value.slice(0, 300))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ends automatically (optional)</label>
                <input type="datetime-local" value={maintenanceEnds} onChange={(e) => setMaintenanceEnds(e.target.value)} className={inputClass} />
              </div>
            </div>
            <button className={buttonClass.danger} onClick={() => setMaintenanceDialog('on')} disabled={busy}>
              <MIcon name="construction" className="text-lg" /> Turn on maintenance mode
            </button>
          </div>
        )}
      </Panel>

      {/* Per-event switches, each with an optional time window */}
      <Panel
        title={`Open and close · ${selectedEventName}`}
        subtitle="Enforced by the database, so nobody can get around them from the browser. Leave the times empty to control it by hand."
      >
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {SWITCHES.map((s) => {
            const on = !!controls[s.effective];
            const stored = (controls[s.key] as EventControl | undefined) ?? EMPTY_CONTROL;
            const entry = schedule[s.key] ?? { opens_at: '', closes_at: '' };
            const scheduled = !!(stored.opens_at || stored.closes_at);
            const dirty =
              entry.opens_at !== toLocalInput(stored.opens_at) || entry.closes_at !== toLocalInput(stored.closes_at);

            return (
              <li key={s.key} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                      {s.title}
                      <Badge tone={on ? 'green' : 'amber'}>{on ? 'Open' : 'Closed'}</Badge>
                      {scheduled && <Badge tone="blue">Scheduled</Badge>}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{on ? s.on : s.off}</p>
                    {scheduled && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {stored.opens_at ? `Opens ${formatDateTime(stored.opens_at)}. ` : ''}
                        {stored.closes_at ? `Closes ${formatDateTime(stored.closes_at)}.` : ''}
                        {' '}The switch must also be on.
                      </p>
                    )}
                  </div>
                  <Toggle checked={on} label={s.title} disabled={busy} onChange={(value) => setPendingSwitch({ key: s.key, value })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mt-3 items-end">
                  <div>
                    <label className={labelClass}>Opens automatically (optional)</label>
                    <input
                      type="datetime-local"
                      value={entry.opens_at}
                      onChange={(e) => setSchedule({ ...schedule, [s.key]: { ...entry, opens_at: e.target.value } })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Closes automatically (optional)</label>
                    <input
                      type="datetime-local"
                      value={entry.closes_at}
                      onChange={(e) => setSchedule({ ...schedule, [s.key]: { ...entry, closes_at: e.target.value } })}
                      className={inputClass}
                    />
                  </div>
                  <button className={buttonClass.ghost} disabled={!dirty || busy} onClick={() => applySchedule(s.key)}>
                    <MIcon name="schedule" className="text-lg" /> Save times
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Event details */}
      <Panel
        title="Event details"
        subtitle="Used across the site, in tickets and in the statistics."
        actions={changedKeys.length > 0 ? <Badge tone="amber">{changedKeys.length} unsaved change{changedKeys.length === 1 ? '' : 's'}</Badge> : undefined}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Event name</label>
            <input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Venue</label>
            <input value={form.venue_name} maxLength={200} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} className={inputClass} />
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
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              {statusOptions.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
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
          <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Allow non-ASU attendees</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Students from other universities can register (paid ticket).</p>
            </div>
            <Toggle checked={form.allow_non_asu_attendees} label="Allow non-ASU attendees" onChange={(v) => setForm({ ...form, allow_non_asu_attendees: v })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button className={buttonClass.ghost} disabled={changedKeys.length === 0 || busy} onClick={() => setForm(original)}>Discard</button>
          <button className={buttonClass.primary} disabled={changedKeys.length === 0 || busy} onClick={() => setSaveDialog(true)}>Save changes</button>
        </div>
      </Panel>

      {/* Dashboard Theme — accent colour for all dashboards */}
      <Panel
        title={`Dashboard theme · ${selectedEventName}`}
        subtitle="Choose the accent colour for all dashboards (attendee, admin, employer, volunteer). The landing page follows the same colour."
        actions={accentColor !== savedAccent ? <Badge tone="amber">Unsaved</Badge> : <Badge tone="green">Saved</Badge>}
      >
        <div className="space-y-5">
          {/* Preset colour swatches */}
          <div>
            <label className={labelClass}>Preset colours</label>
            <div className="flex flex-wrap gap-3 mt-2">
              {COLOUR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setAccentColor(preset.hex)}
                  className={`group relative flex flex-col items-center gap-1.5 transition-transform ${
                    accentColor === preset.hex ? 'scale-110' : 'hover:scale-105'
                  }`}
                  title={preset.label}
                >
                  <div
                    className={`w-10 h-10 rounded-full border-2 transition-all shadow-md ${
                      accentColor === preset.hex
                        ? 'border-white ring-2 ring-offset-2 ring-offset-slate-900 ring-white/60 scale-110'
                        : 'border-slate-600 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className={`text-[10px] font-medium ${
                    accentColor === preset.hex ? 'text-white' : 'text-slate-400'
                  }`}>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom hex input */}
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className={labelClass}>Custom colour (hex)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer bg-transparent p-0.5"
                />
                <input
                  value={accentColor}
                  maxLength={7}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.length <= 7) setAccentColor(v);
                  }}
                  className={inputClass + ' font-mono'}
                  placeholder="#dc2626"
                />
              </div>
            </div>
          </div>

          {/* Live preview strip */}
          <div>
            <label className={labelClass}>Preview</label>
            <div className="flex gap-1 mt-2 rounded-xl overflow-hidden">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => {
                const vars = buildThemeVars({ accent: accentColor });
                const rgb = vars[`--a-${shade}-rgb`];
                return (
                  <div
                    key={shade}
                    className="flex-1 h-8 first:rounded-l-lg last:rounded-r-lg relative group"
                    style={{ backgroundColor: rgb ? `rgb(${rgb})` : undefined }}
                    title={`${shade}`}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity text-white drop-shadow">
                      {shade}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-3">
              {(() => {
                const vars = buildThemeVars({ accent: accentColor });
                const bg600 = vars['--a-600-rgb'] ? `rgb(${vars['--a-600-rgb']})` : accentColor;
                const bg700 = vars['--a-700-rgb'] ? `rgb(${vars['--a-700-rgb']})` : accentColor;
                return (
                  <>
                    <div className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: bg600 }}>
                      Sample Button
                    </div>
                    <div className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: bg700 }}>
                      Sample Dark
                    </div>
                    <div className="rounded-lg px-4 py-2 text-sm font-semibold border-2" style={{ borderColor: bg600, color: bg600 }}>
                      Outline
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Save / discard buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              className={buttonClass.ghost}
              disabled={accentColor === savedAccent || savingTheme}
              onClick={() => setAccentColor(savedAccent)}
            >
              Discard
            </button>
            <button
              className={buttonClass.primary}
              disabled={accentColor === savedAccent || !isHexColour(accentColor) || savingTheme}
              onClick={async () => {
                setSavingTheme(true);
                try {
                  await callSadmin('sadmin_set_event_theme', {
                    _event_id: targetEventId,
                    _theme: { accent: accentColor.toLowerCase() }
                  }, 'Could not save the dashboard theme.');
                  setSavedAccent(accentColor);
                  notify(`Dashboard colour updated to ${accentColor}. All dashboards will reflect this colour.`, 'success');
                } catch (err) {
                  notify(errorText(err, 'Could not save the dashboard theme.'), 'error');
                } finally {
                  setSavingTheme(false);
                }
              }}
            >
              <MIcon name="palette" className="text-lg" />
              {savingTheme ? 'Saving...' : 'Save colour'}
            </button>
          </div>
        </div>
      </Panel>

      <ConfirmDialog
        open={!!pendingSwitch}
        title={pendingSwitch?.value ? `Open ${pendingInfo?.title.toLowerCase()}?` : `Close ${pendingInfo?.title.toLowerCase()}?`}
        confirmLabel={pendingSwitch?.value ? 'Open' : 'Close'}
        danger={pendingSwitch?.value === false}
        busy={busy}
        onClose={() => setPendingSwitch(null)}
        onConfirm={applySwitch}
        description={
          <>
            <p>{pendingSwitch?.value ? pendingInfo?.on : pendingInfo?.off}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">This affects <strong>{selectedEventName}</strong> only.</p>
          </>
        }
      />

      <ConfirmDialog
        open={maintenanceDialog === 'on'}
        title="Turn on maintenance mode"
        confirmLabel="Close the site"
        danger
        typeToConfirm="FREEZE"
        busy={busy}
        onClose={() => setMaintenanceDialog(null)}
        onConfirm={() => applyMaintenance(true)}
        description={
          <>
            <p>Everyone except super admins will be signed out and blocked, including admins and volunteers working at the event.</p>
            <p>This covers <strong>every event</strong>, not just {selectedEventName}.</p>
            <p>{maintenanceEnds ? `It ends automatically ${formatDateTime(fromLocalInput(maintenanceEnds))}.` : 'It stays on until you turn it off.'}</p>
          </>
        }
      />
      <ConfirmDialog
        open={maintenanceDialog === 'off'}
        title="Reopen the site"
        confirmLabel="Reopen"
        busy={busy}
        onClose={() => setMaintenanceDialog(null)}
        onConfirm={() => applyMaintenance(false)}
        description={<p>Everyone can use the site again straight away.</p>}
      />

      <ConfirmDialog
        open={saveDialog}
        title="Save event details"
        confirmLabel="Save"
        busy={busy}
        onClose={() => setSaveDialog(false)}
        onConfirm={saveEvent}
        description={<p>You are changing: {changedKeys.map((k) => k.replace(/_/g, ' ')).join(', ')}.</p>}
      />
    </div>
  );
};

export default EventControls;
