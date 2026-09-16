// pages/EventSelection.tsx
// Post-login screen where the user picks which active event to join.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, AlertCircle, LogOut, Loader2 } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';
import { getActiveEvents, checkEventRegistration, FairEvent } from '../lib/supabase';
import { logger } from '../utils/logger';
import DashboardLoading from '../components/DashboardLoading';

export const EventSelection: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user, getRoleBasedRedirect, refreshProfile } = useAuth();

  const [events, setEvents] = useState<FairEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await getActiveEvents();
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        setEvents(data || []);
      } catch (err: any) {
        logger.error('EventSelection load error:', err);
        setError('Could not load events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const handleSelectEvent = async (event: FairEvent) => {
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
        // Already registered → bind event_id to the profile and go to dashboard.
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

      // Not registered yet → navigate to registration form.
      // Do NOT refresh profile here — the user has no role yet for this event,
      // and the AuthContext would refuse to cache a role-less profile.
      // The registration flow itself (register_attendee + refreshProfile after)
      // will persist the event_id once the role exists.
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
          <p className="text-red-100">Choose the event you would like to register for.</p>
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
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{event.name}</h3>
                        {event.is_current && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            Current
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