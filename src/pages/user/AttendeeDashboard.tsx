import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AttendeeProfileCard from '../../components/AttendeeProfileCard';
import NotificationModal from '../../components/NotificationModal';
import ScheduleEventModal from '../../components/ScheduleEventModal';
import SessionDetailModal from '../../components/SessionDetailModal';
import BookingConfirmationModal from '../../components/BookingConfirmationModal';
import CompanyDetailModal from '../../components/CompanyDetailModal';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import JobDetailModal from '../../components/attendee/JobDetailModal';
import ApplyJobModal from '../../components/attendee/ApplyJobModal';
import WithdrawJobModal from '../../components/attendee/WithdrawJobModal';
import CancelBookingModal from '../../components/attendee/CancelBookingModal';
import DashboardLoading from '../../components/DashboardLoading';
import { motion, AnimatePresence } from 'framer-motion';

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  },
  exit: { opacity: 0 }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};



import Toast from '../../components/shared/Toast';
import { supabase } from '../../lib/supabase';

const AttendeeDashboard = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Schedule and Sessions state
  const attendeeId = user?.id;
  const [scheduleEvents, setScheduleEvents] = useState<any[]>([]);
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionToBook, setSessionToBook] = useState<any>(null);
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [bookingToCancel, setBookingToCancel] = useState<{ id: string, title: string } | null>(null);

  // Companies state
  const [companies, setCompanies] = useState<any[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('All');
  const [partnerTypes, setPartnerTypes] = useState<string[]>([]);

  // Jobs state
  const [jobs, setJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [jobSearch, setJobSearch] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobToApply, setJobToApply] = useState<any>(null);
  const [jobToWithdraw, setJobToWithdraw] = useState<any>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  // Lazy Loading States
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['home']));
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const [isApplying, setIsApplying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  // Full dashboard loading state - Blocks render until profile and critical data (schedule) are ready
  const [dashboardReady, setDashboardReady] = useState(false);

  const EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

  // Get first name from full_name
  const attendeeProfile = useMemo(() => {
    if (!profile) return null;

    return {
      // From user_profiles (already in profile)
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      personal_id: profile.personal_id,
      preferred_language: profile.preferred_language,
      score: profile.score,
      created_at: profile.created_at,

      // From attendees table (in profile.attendee)
      attendee_id: profile.id,
      is_asu_student: profile.attendee?.is_asu_student,
      student_id: profile.attendee?.student_id,
      university: profile.attendee?.university,
      faculty: profile.attendee?.faculty,
      department: profile.attendee?.department,
      cv_url: profile.attendee?.cv_url,
      enrollment_proof_url: profile.attendee?.enrollment_proof_url,
      registration_status: profile.attendee?.registration_status,
      payment_status: profile.attendee?.payment_status,
      registered_at: profile.attendee?.registered_at
    };
  }, [profile]);

  const firstName = useMemo(() =>
    attendeeProfile?.full_name?.split(' ')[0],
    [attendeeProfile?.full_name]
  );

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Initial dashboard load - wait for profile AND schedule (upcoming events)
  useEffect(() => {
    if (profile && attendeeProfile) {
      setDashboardReady(true);
      // Ensure we show loading state until schedule is fetched initially
      if (!loadedTabs.has('schedule') && !loadingSchedule) {
        setLoadingSchedule(true); // Pre-set loading
      }
    }
  }, [profile, attendeeProfile]);

  // COMPREHENSIVE INITIAL DATA LOAD: Parallelize all critical home-tab dependencies
  const fetchInitialDashboardData = useCallback(async () => {
    if (!user?.id || !profile?.roles) return;

    setLoadingSchedule(true);

    try {
      const [notificationsResult, activitiesResult, scheduleResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('id, title, content, publish_at, target_roles')
          .eq('event_id', EVENT_ID)
          .contains('target_roles', profile.roles) // Note: GIN index would be better, but composite index on (event_id, publish_at) helps
          .order('publish_at', { ascending: false })
          .limit(20), // Limit notifications
        supabase
          .from('user_activities')
          .select('id, activity_type, description, activity_timestamp, points_earned')
          .eq('user_id', user.id)
          .order('activity_timestamp', { ascending: false })
          .limit(10),
        !loadedTabs.has('schedule')
          ? supabase
            .from('schedule')
            .select('id, title, start_time, end_time, location, schedule_type, description')
            .eq('event_id', EVENT_ID)
            .order('start_time', { ascending: true })
          : Promise.resolve({ data: scheduleEvents, error: null })
      ]);

      if (notificationsResult.data) setNotifications(notificationsResult.data);
      if (activitiesResult.data) setUserActivities(activitiesResult.data);

      if (!loadedTabs.has('schedule') && scheduleResult.data) {
        setScheduleEvents(scheduleResult.data);
        const dates = Array.from(
          new Set(scheduleResult.data.map((event: any) =>
            new Date(event.start_time).toISOString().split('T')[0]
          ))
        );
        setUniqueDates(dates);
        if (dates.length > 0 && !selectedDay) setSelectedDay(dates[0] as any);
        setLoadedTabs(prev => new Set(prev).add('schedule'));
      }
      setLoadedTabs(prev => new Set(prev).add('schedule'));
    } catch (error) {
      console.error('Error fetching initial dashboard data:', error);
      // Mark as loaded even on error to prevent infinite loading screen
      setLoadedTabs(prev => new Set(prev).add('schedule'));
    } finally {
      setLoadingSchedule(false);
    }
  }, [user?.id, profile?.roles, loadedTabs, scheduleEvents, selectedDay]);

  useEffect(() => {
    if (dashboardReady) {
      fetchInitialDashboardData();
    }
  }, [dashboardReady]); // Only run once dashboard is ready

  // Derive upcoming events from scheduleEvents - optimized to use shared data
  useEffect(() => {
    if (scheduleEvents.length > 0) {
      const now = new Date();
      const upcoming = scheduleEvents
        .filter((event: any) => new Date(event.start_time) > now)
        .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 4);

      setUpcomingEvents(upcoming);
    }
  }, [scheduleEvents]);

  // Secondary effect to handle tab switches to schedule if not already loaded (fallback)
  useEffect(() => {
    if ((activeTab === 'schedule' || activeTab === 'home') && !loadedTabs.has('schedule')) {
      // This will be caught by the composite effect above, but kept as a safety guard for tab logic
    }
  }, [activeTab, loadedTabs]);
  // Fetch booked sessions - Query from sessions table for better ordering
  useEffect(() => {
    const fetchBookedSessions = async () => {
      if (!attendeeId) return;
      if (activeTab !== 'sessions' && !loadedTabs.has('sessions')) return;

      try {
        // SINGLE OPTIMIZED QUERY with JS sorting for safety
        const { data, error } = await supabase
          .from('session_bookings')
          .select(`
            id,
            booking_status,
            checked_in,
            checked_in_at,
            booked_at,
            session:sessions!inner (
              id,
              title,
              start_time,
              end_time,
              room_name,
              session_type,
              status,
              speaker:speaker_id (
                first_name,
                last_name,
                photo_url
              )
            )
          `)
          .eq('attendee_id', attendeeId)
          .eq('booking_status', 'confirmed')
          .neq('session.status', 'cancelled')
          .gte('session.start_time', new Date().toISOString())
          .limit(50); // Fetch enough to sort

        if (error) throw error;

        if (data) {
          // Sort in JS to avoid complex joined ordering issues
          const sorted = data.sort((a: any, b: any) =>
            new Date(a.session.start_time).getTime() - new Date(b.session.start_time).getTime()
          );

          const formattedSessions = sorted.map((b: any) => ({
            ...b.session,
            booking_id: b.id,
            booking_status: b.booking_status,
            booked_at: b.booked_at,
            checked_in: b.checked_in,
            checked_in_at: b.checked_in_at,
            speaker: Array.isArray(b.session.speaker) ? b.session.speaker[0] : (b.session.speaker || null)
          }));

          setBookedSessions(formattedSessions);
        }
      } catch (error) {
        console.error('Error fetching booked sessions:', error);
      }
    };

    fetchBookedSessions();
  }, [attendeeId, activeTab, loadedTabs]);


  useEffect(() => {
    const fetchAvailableSessions = async () => {
      if (!attendeeId) return;
      // Fixed: Load if NOT loaded yet (removed the activeTab check that was preventing load)
      if (loadedTabs.has('sessions')) return;

      setLoadingSessions(true);

      try {
        // Fixed: Changed speaker!inner to left join and added description
        const { data, error } = await supabase
          .from('sessions')
          .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          room_name,
          session_type,
          max_attendees,
          current_bookings,
          is_full,
          status,
          speaker_id,
          speaker:speaker_id (
            first_name,
            last_name,
            photo_url
          )
        `)
          .eq('event_id', EVENT_ID)
          .in('status', ['scheduled', 'ongoing'])
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(50);

        if (error) throw error;

        if (data) {
          // RACE CONDITION FIX: Do NOT filter by bookedSessions here.
          // Store ALL valid future sessions. Filter in renderSessionsTab.
          const available = data.map((session: any) => ({
            ...session,
            speaker: session.speaker
              ? (Array.isArray(session.speaker) ? session.speaker[0] : session.speaker)
              : null
          }));

          setAvailableSessions(available);
          setLoadedTabs(prev => new Set(prev).add('sessions'));
        }
      } catch (error) {
        console.error('Error fetching available sessions:', error);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchAvailableSessions();
  }, [attendeeId, activeTab, loadedTabs]); // Removed bookedSessions dependency

  // Fetch companies - optimized
  useEffect(() => {
    const fetchCompanies = async () => {
      if (activeTab !== 'companies' || loadedTabs.has('companies')) return;

      setLoadingCompanies(true);

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, company_name, industry, logo_url, partner_type, booth_number, description, email, website')
          .eq('event_id', EVENT_ID)
          .order('partner_type', { ascending: true }) // Show platinum first
          .order('company_name', { ascending: true })
          .limit(100); // Pagination

        if (error) throw error;

        if (!error && data) {
          setCompanies(data);
          setFilteredCompanies(data);
          // Extract unique partner types
          const types = Array.from(new Set(data.map((c: any) => c.partner_type).filter(Boolean)));
          setPartnerTypes(['All', ...types]);
          setLoadedTabs(prev => new Set(prev).add('companies'));
        }
        setLoadingCompanies(false);
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, [activeTab, loadedTabs]);

  // Fetch Jobs - OPTIMIZED with minimal fields and pagination
  useEffect(() => {
    const fetchJobsData = async () => {
      if (activeTab !== 'jobs' || loadedTabs.has('jobs')) return;

      setLoadingJobs(true);

      try {
        // Parallel fetch with optimized queries
        const [jobsResult, applicationsResult] = await Promise.all([
          supabase
            .from('job_positions')
            .select(`
            id,
            title,
            job_type,
            experience_level,
            employment_mode,
            location,
            description,
            posted_at,
            no_of_applicants,
            companies!inner (
              company_name,
              logo_url,
              industry
            )
          `, { count: 'exact' })
            .eq('event_id', EVENT_ID)
            .eq('is_active', true)
            .order('posted_at', { ascending: false })
            .limit(50),
          attendeeId ? supabase
            .from('job_applications')
            .select('job_position_id')
            .eq('attendee_id', attendeeId)
            : Promise.resolve({ data: null, error: null })
        ]);

        if (jobsResult.error) throw jobsResult.error;

        if (jobsResult.data) {
          setJobs(jobsResult.data);
          setFilteredJobs(jobsResult.data);
        }

        if (applicationsResult.data) {
          const appliedIds = new Set(applicationsResult.data.map((app: any) => app.job_position_id));
          setAppliedJobIds(appliedIds);
        }

        setLoadedTabs(prev => new Set(prev).add('jobs'));
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobsData();
  }, [activeTab, loadedTabs, attendeeId]);

  // Filter Jobs
  useEffect(() => {
    let result = jobs;

    if (jobSearch) {
      const query = jobSearch.toLowerCase();
      result = result.filter((job: any) =>
        job.title.toLowerCase().includes(query) ||
        job.companies?.company_name?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query)
      );
    }

    if (jobTypeFilter !== 'All') {
      result = result.filter((job: any) => job.job_type === jobTypeFilter);
    }

    setFilteredJobs(result);
  }, [jobSearch, jobTypeFilter, jobs]);

  // Filter companies
  useEffect(() => {
    let result = companies;

    if (companySearch) {
      const query = companySearch.toLowerCase();
      result = result.filter((c: any) =>
        c.company_name.toLowerCase().includes(query) ||
        c.industry?.toLowerCase().includes(query)
      );
    }

    if (companyTypeFilter !== 'All') {
      result = result.filter((c: any) => c.partner_type === companyTypeFilter);
    }

    setFilteredCompanies(result);
  }, [companySearch, companyTypeFilter, companies]);


  // Define navigation tabs
  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'schedule', label: 'Schedule', icon: 'calendar_month' },
    { key: 'sessions', label: 'Sessions', icon: 'event' },
    { key: 'jobs', label: 'Jobs', icon: 'work' },
    { key: 'companies', label: 'Companies', icon: 'business' }
  ];


  //Helper: Get type badge color
  const getTypeBadgeColor = (type: string): string => {
    const colors: Record<string, string> = {
      // Job Types
      'full-time': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'part-time': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      'internship': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      'contract': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'freelance': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',

      // Experience Levels (for consistency)
      'entry': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'junior': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      'mid': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'senior': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'lead': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'executive': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',

      // Employment Modes
      'remote': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'hybrid': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'on-site': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',

      // Session Types (existing)
      'Fair': 'bg-blue-100 text-blue-800',
      'Workshop': 'bg-purple-100 text-purple-800',
      'Seminar': 'bg-amber-100 text-amber-800',
      'Networking': 'bg-emerald-100 text-emerald-800',
      'Break': 'bg-slate-100 text-slate-600',
      'keynote': 'bg-purple-100 text-purple-800',
      'workshop': 'bg-blue-100 text-blue-800',
      'panel': 'bg-green-100 text-green-800',
      'networking': 'bg-amber-100 text-amber-800',
      'competition': 'bg-red-100 text-red-800'
    };
    return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const handleBookSession = async () => {
    if (!attendeeId || !sessionToBook) return;

    try {
      // 1. Verify current booking status and capacity
      const { data: sessionData, error: sessionFetchError } = await supabase
        .from('sessions')
        .select('current_bookings, max_attendees')
        .eq('id', sessionToBook.id)
        .single();

      if (sessionFetchError) throw sessionFetchError;

      const currentBookings = sessionData.current_bookings || 0;
      const maxAttendees = sessionData.max_attendees;

      if (maxAttendees && currentBookings >= maxAttendees) {
        setToast({ message: 'This session is full', type: 'error' });
        setShowBookingConfirm(false);
        setSessionToBook(null);
        return;
      }

      // 2. Check for existing booking (cancelled or not)
      const { data: existingBooking, error: checkError } = await supabase
        .from('session_bookings')
        .select('id, booking_status')
        .eq('session_id', sessionToBook.id)
        .eq('attendee_id', attendeeId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingBooking) {
        if (existingBooking.booking_status === 'cancelled') {
          // OPTIMISTIC UPDATE: Update local state immediately
          const rebookedSession = {
            ...sessionToBook,
            booking_id: existingBooking.id,
            booking_status: 'confirmed',
            booked_at: new Date().toISOString(),
            checked_in: false,
            checked_in_at: null
          };

          // Update UI instantly
          setBookedSessions(prev => [...prev, rebookedSession].sort((a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          ));
          setAvailableSessions(prev => prev.filter(s => s.id !== sessionToBook.id));

          setToast({ message: 'Session booked successfully!', type: 'success' });
          setShowBookingConfirm(false);
          setSessionToBook(null);
          setSelectedSession(null);

          // Perform actual update in background
          const { error: updateError } = await supabase
            .from('session_bookings')
            .update({
              booking_status: 'confirmed',
              checked_in: false,
              booked_at: new Date().toISOString()
            })
            .eq('id', existingBooking.id);

          // ✅ TRIGGER HANDLES: current_bookings increment & is_full update automatically

          if (updateError) {
            // Revert on error
            throw updateError;
          }

          // Invalidate cache for next refresh (background)
          setLoadedTabs(prev => {
            const next = new Set(prev);
            next.delete('sessions');
            return next;
          });
        } else {
          setToast({ message: 'You already have a booking for this session.', type: 'warning' });
          setShowBookingConfirm(false);
          setSessionToBook(null);
          return;
        }
      }
      else {
        // OPTIMISTIC UPDATE for New Booking
        const newBookingId = crypto.randomUUID(); // Temporary ID for UI
        const newBookedSession = {
          ...sessionToBook,
          booking_id: newBookingId,
          booking_status: 'confirmed',
          booked_at: new Date().toISOString(),
          checked_in: false,
          checked_in_at: null
        };

        // Update UI instantly
        setBookedSessions(prev => [...prev, newBookedSession].sort((a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ));
        setAvailableSessions(prev => prev.filter(s => s.id !== sessionToBook.id));

        setToast({ message: 'Session booked successfully!', type: 'success' });
        setShowBookingConfirm(false);
        setSessionToBook(null);
        setSelectedSession(null);

        // Insert actual booking
        const { error: bookingError } = await supabase
          .from('session_bookings')
          .insert({
            session_id: sessionToBook.id,
            attendee_id: attendeeId,
            booking_status: 'confirmed',
            checked_in: false
          })
          .select('id')
          .single();

        // ✅ TRIGGER HANDLES: current_bookings increment & is_full update automatically

        if (bookingError) throw bookingError;

        // Update the temporary ID with real one if needed, or let refresh handle it
        setLoadedTabs(prev => {
          const next = new Set(prev);
          next.delete('sessions');
          return next;
        });
      }

      // ❌ REMOVED: Manual session statistics update
      // The database trigger now handles this automatically when we insert/update session_bookings

    } catch (err: any) {
      console.error('Error booking session:', err);
      setToast({ message: 'Failed to book session. Please try again.', type: 'error' });
      // Revert optimistic updates if needed (simplified here by force reload on next visit)
      setLoadedTabs(prev => {
        const next = new Set(prev);
        next.delete('sessions');
        return next;
      });
      setShowBookingConfirm(false);
      setSessionToBook(null);
      setSelectedSession(null);
    }
  }


  const handleCancelBooking = async (bookingId: string) => {
    try {
      // OPTIMISTIC UPDATE: Remove from booked, Add to available
      const cancelledSessionIndex = bookedSessions.findIndex(s => s.booking_id === bookingId);
      if (cancelledSessionIndex > -1) {
        const cancelledSession = bookedSessions[cancelledSessionIndex];

        setBookedSessions(prev => prev.filter(s => s.booking_id !== bookingId));
        setAvailableSessions(prev => [...prev, cancelledSession].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ));

        setToast({ message: 'Booking cancelled successfully.', type: 'info' });
        setBookingToCancel(null);
        setSelectedSession(null);

        // Perform actual update
        const { error } = await supabase
          .from('session_bookings')
          .update({ booking_status: 'cancelled' })
          .eq('id', bookingId);

        // ✅ TRIGGER HANDLES: current_bookings decrement & is_full update automatically

        if (error) throw error;

        // Invalidate cache in background
        setLoadedTabs(prev => {
          const next = new Set(prev);
          next.delete('sessions');
          return next;
        });
      }

      // ❌ REMOVED: Manual session statistics decrement
      // The database trigger now handles this automatically when we update booking_status

    } catch (error) {
      console.error('Error cancelling booking:', error);
      setToast({ message: 'Failed to cancel booking.', type: 'error' });
      // Revert optimistic update by forcing reload
      setLoadedTabs(prev => {
        const next = new Set(prev);
        next.delete('sessions');
        return next;
      });
    }
  }


  // Handler: Apply for a job
  const handleApplyClick = (job: any, e?: React.MouseEvent) => {
    e?.stopPropagation();

    // Check if CV is uploaded using attendeeProfile
    const hasCv = attendeeProfile?.cv_url;

    if (!hasCv) {
      setToast({ message: 'Please upload your CV in your profile before applying for jobs.', type: 'warning' });
      return;
    }

    setJobToApply(job);
  };

  const handleConfirmApply = async () => {
    if (!jobToApply || !attendeeId) return;

    try {
      setIsApplying(true);

      const { error } = await supabase
        .from('job_applications')
        .insert({
          job_position_id: jobToApply.id,
          attendee_id: attendeeId,
          cv_url: attendeeProfile?.cv_url
        });

      if (error) throw error;

      // Update local state by invalidating loadedTabs
      setLoadedTabs(prev => {
        const next = new Set(prev);
        next.delete('jobs');
        return next;
      });

      setJobToApply(null);
      setSelectedJob(null); // Close detail modal too
      setToast({ message: 'Application submitted successfully!', type: 'success' });

    } catch (err: any) {
      console.error('Error applying for job:', err);
      setToast({ message: 'Failed to submit application.', type: 'error' });
      setJobToApply(null);
      setSelectedJob(null);
    } finally {
      setIsApplying(false);
    }
  };

  // Handler: Confirm Withdraw
  const handleConfirmWithdraw = async () => {
    if (!jobToWithdraw || !attendeeId) return;

    try {
      setIsApplying(true);

      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('job_position_id', jobToWithdraw.id)
        .eq('attendee_id', attendeeId);

      if (error) throw error;

      // Update local state by invalidating loadedTabs
      setLoadedTabs(prev => {
        const next = new Set(prev);
        next.delete('jobs');
        return next;
      });

      setToast({ message: 'Application withdrawn successfully.', type: 'success' });
      setJobToWithdraw(null);
      setSelectedJob(null); // Close detail modal too
    } catch (err: any) {
      console.error('Error withdrawing application:', err);
      setToast({ message: 'Failed to withdraw application.', type: 'error' });
      setJobToWithdraw(null);
      setSelectedJob(null);
    } finally {
      setIsApplying(false);
    }
  };


  // Filter available sessions by search and filters
  const filterSessions = (sessions: any[]) => {
    return sessions.filter((session: any) => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Date filter
      const matchesDate = dateFilter === '' ||
        new Date(session.start_time).toISOString().split('T')[0] === dateFilter;

      return matchesSearch && matchesDate;
    });
  };

  // Full Loading Screen - Waits for Profile & Schedule (Upcoming Events)
  if (!dashboardReady || !attendeeProfile || !loadedTabs.has('schedule')) {
    return <DashboardLoading message="Loading Your Dashboard" subMessage="Preparing your experience..." />;
  }

  const renderHomeTab = () => (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Welcome Banner with Gradient Fade */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 shadow-lg shadow-red-500/20 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-9xl text-white transform rotate-12">
            school
          </span>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Welcome, {firstName || 'Attendee'}!
          </h2>
          <p className="text-red-100 text-lg mb-6 max-w-xl">
            Ready to explore new opportunities? Check out the schedule and find your next career move.
          </p>
          <button
            onClick={() => setShowProfile(true)}
            className="bg-white text-red-600 hover:bg-red-50 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined">person</span>
            My Profile
          </button>
        </div>
      </motion.div>



      {/* Recent Activity */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600">history</span>
          Recent Activity
        </h3>
        <div className="space-y-4">
          {userActivities.length > 0 ? (
            userActivities.slice(0, 5).map((activity: any, idx: number) => (
              <div key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-slate-800 last:border-0 last:pb-0">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg flex-shrink-0">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                    {activity.activity_type === 'session_attendance' ? 'event' :
                      activity.activity_type === 'job_application' ? 'work' :
                        activity.activity_type === 'company_visit' ? 'business' :
                          'check_circle'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{activity.activity_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description || 'No description'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-400">
                      {new Date(activity.activity_timestamp).toLocaleString()}
                    </p>
                    {activity.points_earned && activity.points_earned > 0 && (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        +{activity.points_earned} pts
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-2 block">history</span>
              <p className="text-sm">No recent activities</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Upcoming Events */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400">event</span>
          Upcoming Events
        </h3>
        <div className="space-y-3">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.slice(0, 5).map((event: any) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="w-full border border-gray-200 rounded-xl p-4 hover:border-red-300 hover:bg-red-50/30 transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{event.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {new Date(event.start_time).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(event.schedule_type || event.type || 'Other')}`}>
                    {event.schedule_type || event.type || 'Event'}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-2 block">event_busy</span>
              <p className="text-sm">No upcoming events</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  const renderScheduleTab = () => {
    if (loadingSchedule) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading schedule...</p>
        </div>
      );
    }

    const getScheduleForDate = (date: string) => {
      return scheduleEvents.filter((event: any) =>
        new Date(event.start_time).toISOString().split('T')[0] === date
      );
    };

    const selectedDateEvents = selectedDay ? getScheduleForDate(selectedDay as string) : [];

    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">calendar_month</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Event Schedule</h2>
        </div>

        {/* Date Cards */}
        <motion.div
          variants={itemVariants}
          className="overflow-x-auto pb-2"
        >
          <div className="flex gap-3 md:grid md:grid-cols-3 lg:grid-cols-5 min-w-min">
            {uniqueDates.map((date, idx) => {
              const dateObj = new Date(date);
              const dayEvents = getScheduleForDate(date);
              const isSelected = selectedDay === date;

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDay(date as any)}
                  className={`flex-shrink-0 w-40 md:w-auto p-4 rounded-xl border-2 transition-all ${isSelected
                    ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300 dark:hover:border-red-700'
                    }`}
                >
                  <div className={`text-sm font-semibold mb-1 ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    Day {idx + 1}
                  </div>
                  <div className={`text-lg font-bold mb-1 ${isSelected ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                    {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Events for Selected Date */}
        <motion.div
          variants={itemVariants}
          className="space-y-4"
        >
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map((event: any) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="w-full border border-gray-200 dark:border-slate-800 rounded-xl p-4 hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{event.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {new Date(event.start_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {new Date(event.end_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(event.schedule_type || 'other')}`}>
                    {event.schedule_type || 'Event'}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-3 block">event_busy</span>
              <p className="text-lg font-semibold">No events scheduled</p>
              <p className="text-sm">Select a different date to view events</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  const renderSessionsTab = () => {
    // RACE CONDITION FIX: Filter booked sessions at RENDER time
    // This ensures that as soon as bookedSessions loads, they disappear from available list
    const bookedIds = new Set(bookedSessions.map((s: any) => s.id));
    const reallyAvailableSessions = availableSessions.filter(s => !bookedIds.has(s.id));
    const filteredAvailable = filterSessions(reallyAvailableSessions);

    if (loadingSessions) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading sessions...</p>
        </div>
      );
    }

    return (
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">event</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</h2>
        </div>

        {/* My Booked Sessions */}
        <motion.div
          variants={itemVariants}
          className="space-y-4"
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">event_available</span>
            My Current Bookings
          </h3>

          {bookedSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookedSessions.map((session: any) => (
                <motion.div
                  key={session.id}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedSession(session)}
                  className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-slate-100 dark:border-slate-700 flex flex-col h-full"
                >
                  {/* Image Header with Glassmorphism Badge */}
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={session.speaker?.photo_url || 'https://images.unsplash.com/photo-1544531320-98514ea28924?auto=format&fit=crop&w=800&q=80'}
                      alt={session.speaker?.first_name || 'Speaker'}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />

                    {/* Date/Time Badge */}
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide shadow-sm">
                      {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Attended / Status Badge */}
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTypeBadgeColor(session.session_type)} shadow-sm`}>
                        {session.session_type}
                      </span>
                      {session.checked_in && (
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500 text-white shadow-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">check_circle</span>
                          Attended
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight">
                        {session.title}
                      </h4>

                      {session.speaker && (
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            with <span className="text-slate-700 dark:text-slate-300">{session.speaker.first_name} {session.speaker.last_name}</span>
                          </p>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          <span className="material-symbols-outlined text-sm text-red-500">calendar_today</span>
                          {new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>

                        {session.room_name && (
                          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-sm text-red-500">location_on</span>
                            {session.room_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                        <span className="material-symbols-outlined text-sm">confirmation_number</span>
                        Confirmed
                      </div>

                      {!session.checked_in && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookingToCancel({ id: session.booking_id, title: session.title });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-2 block">event_busy</span>
              <p className="text-gray-600 dark:text-gray-400">No booked sessions yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Browse available sessions below</p>
            </div>
          )}
        </motion.div>

        {/* All Available Sessions */}
        <motion.div
          variants={itemVariants}
          className="space-y-4"
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">explore</span>
            All Available Sessions
          </h3>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="">All Days</option>
              {/* Generate dates dynamically from available sessions */}
              {Array.from(new Set(availableSessions.map((s: any) =>
                new Date(s.start_time).toISOString().split('T')[0]
              ))).sort().map((date: string) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </option>
              ))}
            </select>
          </div>

          {/* Available Sessions Grid */}
          {filteredAvailable.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAvailable.map((session: any) => (
                <motion.div
                  key={session.id}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedSession(session)}
                  className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-slate-100 dark:border-slate-700 flex flex-col h-full"
                >
                  {/* Image Header with Glassmorphism Badge */}
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={session.speaker?.photo_url || 'https://images.unsplash.com/photo-1544531320-98514ea28924?auto=format&fit=crop&w=800&q=80'}
                      alt={session.speaker?.first_name || 'Speaker'}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />

                    {/* Date/Time Badge */}
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide shadow-sm">
                      {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Category Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTypeBadgeColor(session.session_type)} shadow-sm`}>
                        {session.session_type}
                      </span>
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight">
                        {session.title}
                      </h4>

                      {session.speaker && (
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            with <span className="text-slate-700 dark:text-slate-300">{session.speaker.first_name} {session.speaker.last_name}</span>
                          </p>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          <span className="material-symbols-outlined text-sm text-red-500">calendar_today</span>
                          {new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>

                        {session.room_name && (
                          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-sm text-red-500">location_on</span>
                            {session.room_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      {session.max_attendees && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm">group</span>
                          {session.current_bookings}/{session.max_attendees}
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!session.is_full) {
                            setSessionToBook(session);
                            setShowBookingConfirm(true);
                          }
                        }}
                        disabled={session.is_full}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${session.is_full
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-md active:scale-95'
                          }`}
                      >
                        {session.is_full ? 'Full' : 'Book Now'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-3 block">search_off</span>
              <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">No sessions found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          )
          }
        </motion.div >
      </motion.div >
    );
  };

  const renderJobsTab = () => {
    if (loadingJobs) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading jobs...</p>
        </div>
      );
    }

    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">work</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Job Opportunities</h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{filteredJobs.length} Jobs Found</span>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Search jobs..."
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
            />
          </div>
          <select
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
          >
            <option value="All">All Types</option>
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="internship">Internship</option>
            <option value="contract">Contract</option>
          </select>
        </div>

        {/* Job Listings */}
        <motion.div
          variants={itemVariants}
          className="space-y-4"
        >
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => {
              const hasApplied = appliedJobIds.has(job.id);
              return (
                <motion.div
                  key={job.id}
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedJob(job)}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full group relative overflow-hidden"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {/* Company Logo - Left Aligned */}
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-white p-2 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:border-red-100 dark:group-hover:border-red-500 transition-colors">
                      {job.companies?.logo_url ? (
                        <img
                          src={job.companies.logo_url}
                          alt={job.companies.company_name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-slate-300 text-3xl">business</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate group-hover:text-red-600 transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                          {job.companies?.company_name}
                        </p>
                        {job.companies?.industry && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                              {job.companies.industry}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Applied Status Badge - Top Right */}
                    {hasApplied && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-md border border-green-200 dark:border-green-900/50">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Applied
                      </span>
                    )}
                  </div>

                  {/* Enhanced Badge Row - Now includes Experience + Employment Mode */}
                  <div className="space-y-3 flex-1 mb-4">
                    <div className="flex flex-wrap gap-2">
                      {/* Job Type Badge */}
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${getTypeBadgeColor(job.job_type)}`}>
                        {job.job_type}
                      </span>

                      {/* Experience Level Badge - NEW */}
                      {job.experience_level && (
                        <span className="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                          {job.experience_level}
                        </span>
                      )}

                      {/* Employment Mode Badge - NEW */}
                      {job.employment_mode && (
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${job.employment_mode === 'remote'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : job.employment_mode === 'hybrid'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          }`}>
                          <span className="material-symbols-outlined text-[12px]">
                            {job.employment_mode === 'remote' ? 'home' : job.employment_mode === 'hybrid' ? 'autorenew' : 'apartment'}
                          </span>
                          {job.employment_mode}
                        </span>
                      )}

                      {/* Location Badge */}
                      {job.location && (
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {job.location}
                        </span>
                      )}
                    </div>

                    {/* Description Snippet */}
                    {job.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>
                    )}
                  </div>

                  {/* Footer - Enhanced with Applicant Count */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                      {/* Posted Date */}
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        Posted {new Date(job.posted_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>

                      {/* Applicant Count - NEW with Social Proof */}
                      {job.no_of_applicants !== null && job.no_of_applicants !== undefined && (
                        <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm">group</span>
                          {job.no_of_applicants} {job.no_of_applicants === 1 ? 'applicant' : 'applicants'}
                        </span>
                      )}
                    </div>

                    {/* View Details Arrow */}
                    {!hasApplied && (
                      <span className="text-red-600 dark:text-red-400 text-xs font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        View Details
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-2 block">work_off</span>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No matching jobs found</p>
              <button
                onClick={() => { setJobSearch(''); setJobTypeFilter('All'); }}
                className="mt-2 text-red-600 dark:text-red-400 text-sm font-bold hover:underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  const renderCompaniesTab = () => {
    if (loadingCompanies) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading companies...</p>
        </div>
      );
    }

    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">business</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Participating Companies</h2>
          </div>
        </div>

        {/* Search & Filters */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row gap-4 mb-8"
        >
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Search companies, industry..."
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div className="relative min-w-[200px]">
            <select
              value={companyTypeFilter}
              onChange={(e) => setCompanyTypeFilter(e.target.value)}
              className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all appearance-none cursor-pointer shadow-sm"
            >
              {partnerTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'All' ? 'All Partner Types' : type}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              expand_more
            </span>
          </div>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => (
              <motion.div
                key={company.id}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                onClick={() => setSelectedCompany(company)}
                className="group bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-700/50 cursor-pointer transition-all duration-300 relative overflow-hidden"
              >
                {/* Partner Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${company.partner_type === 'platinum' ? 'bg-slate-100 text-slate-700' :
                    company.partner_type === 'gold' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                    {company.partner_type}
                  </span>
                </div>

                {/* Logo Area */}
                <div className="h-32 mb-6 flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl group-hover:bg-gray-100 dark:group-hover:bg-slate-900 transition-colors">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-110"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">business</span>
                  )}
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-red-600 transition-colors truncate">
                    {company.company_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-3 truncate">
                    {company.industry}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-slate-700 pt-3">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">storefront</span>
                      Booth {company.booth_number || 'TBA'}
                    </span>
                    <span className="group-hover:translate-x-1 transition-transform text-red-500 font-bold flex items-center">
                      View Details
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-2 block">business_center</span>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No matching companies found</p>
              <button
                onClick={() => { setCompanySearch(''); setCompanyTypeFilter('All'); }}
                className="mt-2 text-red-600 font-bold hover:underline text-sm"
              >
                Clear Filters
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  };



  // Render current tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return renderHomeTab();
      case 'schedule': return renderScheduleTab();
      case 'sessions': return renderSessionsTab();
      case 'jobs': return renderJobsTab();
      case 'companies': return renderCompaniesTab();
      default: return renderHomeTab();
    }
  };

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      onProfileClick={() => setShowProfile(true)}
      notifications={notifications}
      onNotificationClick={(notification) => setSelectedNotification(notification)}
      hideDock={showProfile || !!selectedNotification || !!selectedEvent}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} className="h-full">
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showProfile && (
          <AttendeeProfileCard
            key="profile-card"
            profile={attendeeProfile}
            loading={false}
            hasActiveApplications={appliedJobIds.size > 0}
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <NotificationModal
            key="notification-modal"
            notification={selectedNotification}
            onClose={() => setSelectedNotification(null)}
          />
        )}
      </AnimatePresence>

      {/* Schedule Event Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <ScheduleEventModal
            key="schedule-modal"
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {selectedSession && (
          <SessionDetailModal
            key="session-modal"
            session={selectedSession}
            isBooked={bookedSessions.some((s: any) => s.id === selectedSession.id)}
            onClose={() => setSelectedSession(null)}
            onBook={() => {
              setSessionToBook(selectedSession);
              setShowBookingConfirm(true);
              setSelectedSession(null);
            }}
            onCancel={async () => {
              const booking = bookedSessions.find((s: any) => s.id === selectedSession.id);
              if (booking?.booking_id) {
                setBookingToCancel({ id: booking.booking_id, title: selectedSession.title });
              }
              setSelectedSession(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Booking Confirmation Modal */}
      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {showBookingConfirm && sessionToBook && (
          <BookingConfirmationModal
            key="booking-modal"
            session={sessionToBook}
            onConfirm={async () => {
              await handleBookSession();
              setShowBookingConfirm(false);
              setSessionToBook(null);
            }}
            onCancel={() => {
              setShowBookingConfirm(false);
              setSessionToBook(null);
            }}
          />
        )}
      </AnimatePresence>



      {/* Company Detail Modal */}
      {/* Company Detail Modal */}
      {/* Company Detail Modal */}
      <AnimatePresence>
        {selectedCompany && (
          <CompanyDetailModal
            key="company-modal"
            company={selectedCompany}
            isOpen={!!selectedCompany}
            onClose={() => setSelectedCompany(null)}
          />
        )}
      </AnimatePresence>

      {/* Job Detail Modal */}
      <AnimatePresence>
        {selectedJob && (
          <JobDetailModal
            key="job-modal"
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onApply={() => handleApplyClick(selectedJob)}
            hasApplied={appliedJobIds.has(selectedJob.id)}
            onWithdraw={() => setJobToWithdraw(selectedJob)}
          />
        )}
      </AnimatePresence>

      {/* Apply Job Modal */}
      <AnimatePresence>
        {jobToApply && (
          <ApplyJobModal
            key="apply-modal"
            jobTitle={jobToApply.title}
            onClose={() => setJobToApply(null)}
            onConfirm={handleConfirmApply}
            loading={isApplying}
          />
        )}
      </AnimatePresence>

      {/* Withdraw Job Modal */}
      <AnimatePresence>
        {jobToWithdraw && (
          <WithdrawJobModal
            jobTitle={jobToWithdraw?.title || ''}
            onClose={() => setJobToWithdraw(null)}
            onConfirm={handleConfirmWithdraw}
            loading={isApplying}
          />
        )}

        {bookingToCancel && (
          <CancelBookingModal
            sessionTitle={bookingToCancel.title}
            onClose={() => setBookingToCancel(null)}
            onConfirm={() => handleCancelBooking(bookingToCancel.id)}
          />
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

    </SharedNavigation>
  );
};
export default AttendeeDashboard;