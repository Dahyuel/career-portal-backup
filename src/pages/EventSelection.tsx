// pages/EventSelection.tsx
// Post-login screen where the user picks which event to join.
// All roles except sadmin/super_admin land here. If the user already has a role
// in the picked event they go straight to their dashboard; otherwise employer
// company events open as employer, and everything else registers as an attendee.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, AlertCircle, LogOut, Loader2, Building2, Lock } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';
import { getActiveEvents, checkEventRegistration, FairEvent } from '../lib/supabase';
import { getEmployerStatus, openEmployerEvent } from '../lib/employer';
import { getActiveEventId } from '../lib/currentEvent';
import { logger } from '../utils/logger';
import DashboardLoading from '../components/DashboardLoading';

// An event in the merged picker list. Employer-only events (company participates
// but the event isn't in get_active_events) are merged in as well.
interface PickableEvent extends FairEvent {
  isEmployerEvent?: boolean;
  companyName?: string | null;
}

export const EventSelection: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user, profile, getRoleBasedRedirect, refreshProfile } = useAuth();

  const [events, setEvents] = useState<PickableEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Employer events where the company takes part but the user has no employers
  // row yet. Selecting one runs employer_open_event.
  const [employerOpenable, setEmployerOpenable] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        // Timebox the employer-status lookup so a hanging RPC can never keep
        // the event picker stuck on its loading state.
        const employerStatusPromise = Promise.race([
          getEmployerStatus().catch(() => null),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
        ]);

        const [{ data: activeEvents, error: fetchError }, employerStatus] = await Promise.all([
          getActiveEvents(),
          employerStatusPromise,
        ]);

        if (fetchError) {
          // Fallback: if the picker list can't be loaded, at least surface the
          // system_config active event so the user isn't fully locked out.
          const fallbackId = getActiveEventId();
          logger.warn('EventSelection: using system_config fallback', fallbackId);
          setError(fetchError.message);
          return;
        }

        const merged: PickableEvent[] = [...(Array.isArray(activeEvents) ? activeEvents : [])];
        const seen = new Set(merged.map((e) => e.id));
        const openable = new Set<string>();

        if (employerStatus?.is_employer) {
          for (const ev of employerStatus.events) {
            const existing = merged.find((m) => m.id === ev.event_id);
            if (existing) {
              existing.isEmployerEvent = true;
              existing.companyName = ev.company_name;
              // Company participates but the user has no employers row yet.
              if (!profile?.employer || profile.employer.company_id !== ev.company_id) {
                openable.add(ev.event_id);
              }
            } else if (!seen.has(ev.event_id)) {
              seen.add(ev.event_id);
              merged.push({
                id: ev.event_id,
                name: ev.event_name,
                event_type: ev.event_type,
                start_date: ev.start_date ?? undefined,
                end_date: ev.end_date ?? undefined,
                status: ev.status ?? undefined,
                venue_name: ev.venue_name,
                is_current: ev.is_current,
                is_ended: ev.is_ended,
                can_register: false,
                isEmployerEvent: true,
                companyName: ev.company_name,
              });
              openable.add(ev.event_id);
            }
          }
        }

        merged.sort(
          (a, b) => new Date(b.start_date ?? 0).getTime() - new Date(a.start_date ?? 0).getTime()
        );

        setEmployerOpenable(openable);
        setEvents(merged);
      } catch (err: any) {
        logger.error('EventSelection load error:', err);
        setError('Could not load events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [profile?.employer]);

  const handleSelectEvent = async (event: PickableEvent) => {
    if (!user) return;
    setSelectingId(event.id);
    setError(null);

    try {
      const { data: registration, error: regError } = await checkEventRegistration(event.id);

      if (regError) {
        setError(regError.message);
        setSelectingId(null);
        return;
      }

      if (registration) {
        // Already has a role in this event → bind event_id and go to dashboard.
        const updated = await refreshProfile(event.id, user.id, user.email, true);

        if (!updated?.event_id) {
          logger.error('Profile refresh did not bind event_id', { eventId: event.id, updated });
          setError(
            'Could not activate this event. The server did not return an event-scoped profile. ' +
            'Please contact support if this persists.'
          );
          setSelectingId(null);
          return;
        }

        const role = registration.role || updated.role || 'attendee';
        const redirectPath = getRoleBasedRedirect(role);
        logger.log(`✅ Event ${event.id} bound. Redirecting ${role} → ${redirectPath}`);
        navigate(redirectPath, { replace: true });
        return;
      }

      // Employer company event with no employers row: complete the profile
      // first (same as the old /employer-start flow), then open the event.
      if (event.isEmployerEvent && employerOpenable.has(event.id)) {
        if (!profile?.profile_complete) {
          navigate(`/employer-start?eventId=${event.id}`, { replace: false });
          return;
        }

        const opened = await openEmployerEvent(event.id);
        if (opened.success) {
          const updated = await refreshProfile(event.id, user.id, user.email, true);
          if (updated?.roles?.includes('employer')) {
            navigate('/employer', { replace: true });
            return;
          }
        }
        // Otherwise fall through to attendee registration / ended handling.
      }

      // Event has ended and the user has no role there → blocked.
      if (event.is_ended) {
        setError('This event has ended and you cannot join it.');
        setSelectingId(null);
        return;
      }

      // Joinable → attendee registration form.
      // Do NOT refresh profile here — the user has no role yet for this event,
      // and the AuthContext would refuse to cache a role-less profile.
      navigate(`/register-event?eventId=${event.id}`, { replace: false });
    } catch (err: any) {
      logger.error('Error selecting event:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setSelectingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLoading
        message="Loading Events..."
        subMessage="Please wait while we fetch active events"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-100 dark:border-gray-700"
      >
        <div className="bg-gradient-to-r from-asu-red to-asu-red-light p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Calendar className="w-8 h-8 text-asu-red" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">Select an Event</h1>
          <p className="text-red-100">Choose the event you would like to open.</p>
        </div>

        <div className="p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-asu-red flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </motion.div>
          )}

          {events.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                There are no active events available for registration at the moment.
              </p>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => (
                <motion.button
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => handleSelectEvent(event)}
                  disabled={!!selectingId}
                  className="w-full text-left group relative bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-5 hover:border-asu-red dark:hover:border-red-400 hover:shadow-md transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{event.name}</h3>
                        {event.is_current && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            Current
                          </span>
                        )}
                        {event.isEmployerEvent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                            <Building2 className="w-3 h-3" />
                            Employer{event.companyName ? ` · ${event.companyName}` : ''}
                          </span>
                        )}
                        {event.is_ended && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200 rounded-full">
                            <Lock className="w-3 h-3" />
                            Ended
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {event.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(event.start_date)}
                            {event.end_date && ` - ${formatDate(event.end_date)}`}
                          </span>
                        )}
                        {event.venue_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.venue_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {selectingId === event.id ? (
                        <Loader2 className="w-6 h-6 text-asu-red animate-spin" />
                      ) : (
                        <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-asu-red transition-colors" />
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EventSelection;