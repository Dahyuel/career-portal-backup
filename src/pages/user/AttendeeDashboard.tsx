import { useState, useEffect, useMemo, useCallback } from 'react';
import FeedbackTab from '../../components/shared/FeedbackTab';
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
import ViewAllActivitiesModal from '../../components/attendee/ViewAllActivitiesModal';
import DashboardLoading from '../../components/DashboardLoading';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

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
import { logger } from '../../utils/logger';

const AttendeeDashboard = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showProfile, setShowProfile] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);
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
  const [searchQueryDraft, setSearchQueryDraft] = useState(''); // display-only; committed on Enter/blur
  const [dateFilter, setDateFilter] = useState<string>('');
  const [sessionTypeFilter, setSessionTypeFilter] = useState('All');
  const [sessionsTotalCount, setSessionsTotalCount] = useState(0);
  const [bookingToCancel, setBookingToCancel] = useState<{ id: string, title: string } | null>(null);

  // Companies state
  const [companies, setCompanies] = useState<any[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('All');
  const [partnerTypes, setPartnerTypes] = useState<string[]>([]);

  // Jobs state
  const [jobs, setJobs] = useState<any[]>([]); // current page's jobs
  const [jobsTotalCount, setJobsTotalCount] = useState(0); // total across all pages
  const [jobSearch, setJobSearch] = useState('');
  const [jobSearchDraft, setJobSearchDraft] = useState(''); // display-only; committed on Enter/blur
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [jobExperienceFilter, setJobExperienceFilter] = useState('All');
  const [jobModeFilter, setJobModeFilter] = useState('All');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobToApply, setJobToApply] = useState<any>(null);
  const [jobToWithdraw, setJobToWithdraw] = useState<any>(null);
  // Map of job_id → application status ('pending' | 'approved' | 'rejected')
  const [appliedJobIds, setAppliedJobIds] = useState<Map<string, string>>(new Map());

  // Lazy Loading States
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['home']));
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const [jobFacultyFilter, setJobFacultyFilter] = useState('All');
  const [availableFaculties, setAvailableFaculties] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  // ── Pagination ────────────────────────────────────────────
  const PAGE_SIZE = 30;
  const [jobsPage, setJobsPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);

  // Full dashboard loading state - Blocks render until profile and critical data (schedule) are ready
  const [dashboardReady, setDashboardReady] = useState(false);
  const [homeDataLoaded, setHomeDataLoaded] = useState(false);

  const EVENT_ID = profile?.event_id;

  // Get first name from full_name
  const attendeeProfile = useMemo(() => {
    // Only build attendeeProfile once the full profile has loaded (not just cached routing data)
    if (!profile || !profile.full_name) return null;

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
      university: profile.attendee?.university,
      faculty: profile.attendee?.faculty,
      department: profile.attendee?.department,
      year: profile.attendee?.year,
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

  // Initial dashboard load - wait for profile to be fully loaded
  useEffect(() => {
    if (profile && attendeeProfile) {
      setDashboardReady(true);
    }
  }, [profile, attendeeProfile]);

  // Helper to fetch user activities independently
  const fetchUserActivities = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .rpc('get_attendee_activities', { p_limit: 5 });

      if (error) throw error;
      if (data) setUserActivities(data);
    } catch (err) {
      logger.error('Error fetching user activities:', err);
    }
  };

  const fetchInitialDashboardData = useCallback(async () => {
    if (!user?.id || !EVENT_ID) return;

    try {
      // AFTER
      const [notificationsResult, activitiesResult, scheduleResult] = await Promise.all([
        supabase.rpc('get_attendee_notifications', {
          p_event_id: EVENT_ID
        }),
        supabase.rpc('get_attendee_activities', { p_limit: 10 }),
        supabase.rpc('get_attendee_schedule', { p_event_id: EVENT_ID })
      ]);

      if (notificationsResult.data) setNotifications(notificationsResult.data);
      if (activitiesResult.data) setUserActivities(activitiesResult.data);
      if (scheduleResult.data) {
        setScheduleEvents(scheduleResult.data);
        const dates = Array.from(
          new Set(scheduleResult.data.map((event: any) =>
            new Date(event.start_time).toISOString().split('T')[0]
          ))
        ) as string[];
        setUniqueDates(dates);
        if (dates.length > 0) setSelectedDay(dates[0]);
      }

      setLoadedTabs(prev => new Set(prev).add('home').add('schedule'));
    } catch (error) {
      logger.error('Error fetching initial dashboard data:', error);
    } finally {
      setLoadingSchedule(false);
      setHomeDataLoaded(true);
    }
  }, [user?.id, EVENT_ID]);


  useEffect(() => {
    if (dashboardReady && EVENT_ID) {
      fetchInitialDashboardData();
    }
  }, [dashboardReady, EVENT_ID, fetchInitialDashboardData]);

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
  // ── Server-side sessions fetch with filters passed directly to RPC ──────────
  const fetchSessionsPage = useCallback(async (
    page: number,
    search: string,
    date: string,
    sessionType: string
  ) => {
    if (!attendeeId) return;
    setLoadingSessions(true);
    try {
      const params: Record<string, any> = {
        p_event_id: EVENT_ID,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      };

      if (search.trim()) params.p_search = search.trim();
      if (date) params.p_date = date;
      if (sessionType !== 'All') params.p_session_type = sessionType;

      const { data, error } = await supabase
        .rpc('get_attendee_available_sessions', params);

      if (error) throw error;

      if (data) {
        setAvailableSessions(data.sessions || []);
        setSessionsTotalCount(data.total_count ?? 0);
        setLoadedTabs(prev => new Set(prev).add('sessions'));
      }
    } catch (error) {
      logger.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  }, [attendeeId, EVENT_ID]);

  // Fetch booked sessions once when tab first opens
  useEffect(() => {
    const fetchBookedSessions = async () => {
      if (!attendeeId || activeTab !== 'sessions' || loadedTabs.has('sessions')) return;
      try {
        const { data, error } = await supabase.rpc('get_attendee_booked_sessions');
        if (error) throw error;
        if (data) setBookedSessions(data);
      } catch (error) {
        logger.error('Error fetching booked sessions:', error);
      }
    };
    fetchBookedSessions();
  }, [attendeeId, activeTab, loadedTabs]);

  // Trigger fetch when tab opens or page changes
  useEffect(() => {
    if (activeTab !== 'sessions') return;
    fetchSessionsPage(sessionsPage, searchQuery, dateFilter, sessionTypeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sessionsPage]);

  // Trigger fetch & reset to page 1 when filters change
  useEffect(() => {
    if (activeTab !== 'sessions') return;
    setSessionsPage(1);
    fetchSessionsPage(1, searchQuery, dateFilter, sessionTypeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, dateFilter, sessionTypeFilter]);

  // Fetch companies via RPC
  useEffect(() => {
    const fetchCompanies = async () => {
      if (activeTab !== 'companies' || loadedTabs.has('companies')) return;

      setLoadingCompanies(true);

      try {
        const { data, error } = await supabase
          .rpc('get_attendee_companies', { p_event_id: EVENT_ID });

        if (error) throw error;

        if (data) {
          setCompanies(data);
          setFilteredCompanies(data);
          const types = Array.from(new Set(data.map((c: any) => c.partner_type).filter(Boolean))) as string[];
          setPartnerTypes(['All', ...types]);
          setLoadedTabs(prev => new Set(prev).add('companies'));
        }
        setLoadingCompanies(false);
      } catch (error) {
        logger.error('Error fetching companies:', error);
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, [activeTab, loadedTabs, EVENT_ID]);

  // ── Server-side jobs fetch with filters passed directly to RPC ───────────────
  const fetchJobsPage = useCallback(async (
    page: number,
    search: string,
    type: string,
    faculty: string,
    experience: string,
    mode: string
  ) => {
    if (!attendeeId) return;
    setLoadingJobs(true);
    try {
      const params: Record<string, any> = {
        p_event_id: EVENT_ID,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      };

      if (search.trim()) params.p_search = search.trim();
      if (type !== 'All') params.p_job_type = type;
      if (faculty !== 'All') params.p_faculty = faculty;
      if (experience !== 'All') params.p_experience_level = experience;
      if (mode !== 'All') params.p_employment_mode = mode;

      const { data, error } = await supabase.rpc('get_attendee_jobs', params);

      if (error) throw error;

      if (data) {
        setJobs(data.jobs || []);
        setJobsTotalCount(data.total_count ?? 0);

        // Build faculties list from the unfiltered first load
        if (page === 1 && !search.trim() && type === 'All' && faculty === 'All' && experience === 'All' && mode === 'All') {
          const faculties = Array.from(
            new Set(
              (data.jobs || []).flatMap((job: any) => job.companies?.faculties || []).filter(Boolean)
            )
          ) as string[];
          if (faculties.length > 0) setAvailableFaculties(faculties);
        }

        // Applied jobs (always returned regardless of page)
        if (data.applied_jobs && Array.isArray(data.applied_jobs)) {
          const statusMap = new Map<string, string>();
          (data.applied_jobs as { job_id: string; status: string }[]).forEach(a =>
            statusMap.set(a.job_id, a.status || 'pending')
          );
          setAppliedJobIds(statusMap);
        }
        setLoadedTabs(prev => new Set(prev).add('jobs'));
      }
    } catch (err) {
      logger.error('Error fetching jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  }, [attendeeId, EVENT_ID]);

  // Trigger fetch when tab opens or page changes
  useEffect(() => {
    if (activeTab !== 'jobs') return;
    fetchJobsPage(jobsPage, jobSearch, jobTypeFilter, jobFacultyFilter, jobExperienceFilter, jobModeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, jobsPage]);

  // Trigger fetch & reset to page 1 when filters change
  useEffect(() => {
    if (activeTab !== 'jobs') return;
    setJobsPage(1);
    fetchJobsPage(1, jobSearch, jobTypeFilter, jobFacultyFilter, jobExperienceFilter, jobModeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobSearch, jobTypeFilter, jobFacultyFilter, jobExperienceFilter, jobModeFilter]);

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

  // (session page reset is now handled inside the filter-change useEffect above)

  // Reset schedule page when selected day changes
  useEffect(() => { setSchedulePage(1); }, [selectedDay]);


  // Define navigation tabs
  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'schedule', label: 'Schedule', icon: 'calendar_month' },
    { key: 'sessions', label: 'Sessions', icon: 'event' },
    { key: 'jobs', label: 'Jobs', icon: 'work' },
    { key: 'companies', label: 'Companies', icon: 'business' },
    { key: 'feedback', label: 'Feedback', icon: 'rate_review' }
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
      'competition': 'bg-red-100 text-red-800',
      'mentorship_circle': 'bg-indigo-100 text-indigo-800',
      'career_coaching': 'bg-teal-100 text-teal-800'
    };
    return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Frontend time-conflict guard: called before opening BookingConfirmationModal
  const handleInitiateBooking = (session: any) => {
    const newStart = new Date(session.start_time).getTime();
    const conflict = bookedSessions.find((booked: any) =>
      new Date(booked.start_time).getTime() === newStart
    );
    if (conflict) {
      setToast({
        message: `You already have "${conflict.title}" booked at this time. Please cancel it first.`,
        type: 'error'
      });
      return;
    }
    setSessionToBook(session);
    setShowBookingConfirm(true);
  };

  const handleBookSession = async (target?: any) => {
    const session = target ?? sessionToBook;
    if (!attendeeId || !session) {
      logger.warn('handleBookSession: missing session or attendeeId');
      return;
    }

    try {
      // Single atomic RPC call handles capacity check, duplicate detection, and booking
      const { data, error } = await supabase
        .rpc('attendee_book_session', { p_session_id: session.id });

      if (error) throw error;

      if (data && !data.success) {
        // Server returned a validation message (e.g., session full, already booked)
        setToast({ message: data.message, type: data.message.includes('full') ? 'error' : 'warning' });
        setShowBookingConfirm(false);
        setSessionToBook(null);
        return;
      }

      // OPTIMISTIC UPDATE
      const newBookedSession = {
        ...session,
        booking_id: data?.booking_id,
        booking_status: 'confirmed',
        booked_at: new Date().toISOString(),
        checked_in: false,
        checked_in_at: null
      };

      setBookedSessions(prev => [...prev, newBookedSession].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ));
      setAvailableSessions(prev => prev.filter(s => s.id !== session.id));

      setToast({ message: 'Session booked successfully!', type: 'success' });
      setShowBookingConfirm(false);
      setSessionToBook(null);
      setSelectedSession(null);

      // Invalidate cache for next refresh
      setLoadedTabs(prev => {
        const next = new Set(prev);
        next.delete('sessions');
        return next;
      });

    } catch (err: any) {
      logger.error('Error booking session:', err);
      setToast({ message: 'Failed to book session. Please try again.', type: 'error' });
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

        // Normalize for the available list:
        //  - guarantee `id` exists (booked sessions use `session_id` from the RPC)
        //  - strip booking-only fields so it behaves like a fresh available session
        const sessionId = cancelledSession.id ?? cancelledSession.session_id;
        const normalizedForAvailable = {
          id: sessionId,
          session_id: sessionId,
          title: cancelledSession.title,
          session_type: cancelledSession.session_type,
          description: cancelledSession.description,
          start_time: cancelledSession.start_time,
          end_time: cancelledSession.end_time,
          room_name: cancelledSession.room_name,
          room_capacity: cancelledSession.room_capacity ?? null,
          max_attendees: cancelledSession.max_attendees ?? null,
          current_bookings: cancelledSession.current_bookings ?? 0,
          is_full: false,
          status: cancelledSession.status ?? 'scheduled',
          speaker: cancelledSession.speaker ?? null,
        };

        setBookedSessions(prev => prev.filter(s => s.booking_id !== bookingId));
        setAvailableSessions(prev => [...prev, normalizedForAvailable].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ));

        setToast({ message: 'Booking cancelled successfully.', type: 'info' });
        setBookingToCancel(null);
        setSelectedSession(null);

        // Perform actual cancel via RPC
        const { error } = await supabase
          .rpc('attendee_cancel_booking', { p_booking_id: bookingId });

        if (error) throw error;

        // Invalidate cache in background so the next tab visit re-fetches fresh data
        setLoadedTabs(prev => {
          const next = new Set(prev);
          next.delete('sessions');
          return next;
        });
      }

    } catch (error) {
      logger.error('Error cancelling booking:', error);
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
        .rpc('attendee_apply_job', { p_job_position_id: jobToApply.id });

      if (error) throw error;

      // Refresh current jobs page to reflect new application status
      fetchJobsPage(jobsPage, jobSearch, jobTypeFilter, jobFacultyFilter, jobExperienceFilter, jobModeFilter);

      setJobToApply(null);
      setSelectedJob(null); // Close detail modal too
      setToast({ message: 'Application submitted successfully!', type: 'success' });
      fetchUserActivities(); // Refresh activities

    } catch (err: any) {
      logger.error('Error applying for job:', err);
      setToast({ message: err?.message || 'Failed to submit application.', type: 'error' });
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
        .rpc('attendee_withdraw_job', { p_job_position_id: jobToWithdraw.id });

      if (error) throw error;

      // Refresh current jobs page to reflect withdrawn application
      fetchJobsPage(jobsPage, jobSearch, jobTypeFilter, jobFacultyFilter, jobExperienceFilter, jobModeFilter);

      setToast({ message: 'Application withdrawn successfully.', type: 'success' });
      setJobToWithdraw(null);
      setSelectedJob(null); // Close detail modal too
      fetchUserActivities(); // Refresh activities
    } catch (err: any) {
      logger.error('Error withdrawing application:', err);
      setToast({ message: err?.message || 'Failed to withdraw application.', type: 'error' });
      setJobToWithdraw(null);
      setSelectedJob(null);
    } finally {
      setIsApplying(false);
    }
  };


  // (session filtering is now server-side via fetchSessionsPage)

  // Full Loading Screen - Waits for Profile to be fully loaded
  if (!dashboardReady || !attendeeProfile) {
    return <DashboardLoading message="Loading Your Dashboard" subMessage="Preparing your experience..." />;
  }

  const renderHomeTab = () => {
    if (!homeDataLoaded) {
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
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading your dashboard...</p>
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
              onClick={() => setShowQRModal(true)}
              className="bg-white text-red-600 hover:bg-red-50 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">qr_code_2</span>
              Show QR Code
            </button>
          </div>
        </motion.div>



        {/* Recent Activity */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">history</span>
              Recent Activity
            </h3>
            <button
              onClick={() => setShowAllActivitiesModal(true)}
              className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              View All
            </button>
          </div>
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
                      {event.speaker && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          with {event.speaker.first_name} {event.speaker.last_name}
                        </p>
                      )}
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
  }
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
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">calendar_month</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Event Schedule</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span>Browse all sessions and plan your day</span>
            </div>
          </div>
        </div>


        {/* Date Cards */}
        <motion.div
          variants={itemVariants}
          className="pb-4"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {uniqueDates.map((date, idx) => {
              const dateObj = new Date(date);
              const dayEvents = getScheduleForDate(date);
              const isSelected = selectedDay === date;

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDay(date as any)}
                  className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all flex flex-col items-center sm:items-start text-center sm:text-left ${isSelected
                    ? 'border-red-600 bg-red-50 dark:bg-red-900/20 shadow-sm'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md'
                    }`}
                >
                  <div className={`text-sm font-bold mb-1 ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    Day {idx + 1}
                  </div>
                  <div className={`text-lg sm:text-xl font-black mb-1 ${isSelected ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                    {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className={`text-xs font-semibold ${isSelected ? 'text-red-500 dark:text-red-400/80' : 'text-gray-500 dark:text-gray-500'}`}>
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Events for Selected Date — paginated */}
        <motion.div
          variants={itemVariants}
          className="space-y-4"
        >
          {selectedDateEvents.length > 0 ? (
            <>
              {selectedDateEvents.slice((schedulePage - 1) * PAGE_SIZE, schedulePage * PAGE_SIZE).map((event: any) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full border border-gray-200 dark:border-slate-800 rounded-xl p-4 hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{event.title}</h4>
                      {event.speaker && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          with {event.speaker.first_name} {event.speaker.last_name}
                        </p>
                      )}
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
              ))}
              {/* Schedule Pagination */}
              {Math.ceil(selectedDateEvents.length / PAGE_SIZE) > 1 && (
                <div className="flex flex-col flex-wrap sm:flex-row items-center justify-between pt-4 gap-4 sm:gap-0">
                  <p className="text-sm text-slate-500 dark:text-slate-400 shrink-0 text-center sm:text-left">
                    Showing {(schedulePage - 1) * PAGE_SIZE + 1}–{Math.min(schedulePage * PAGE_SIZE, selectedDateEvents.length)} of {selectedDateEvents.length} events
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                    <button
                      onClick={() => setSchedulePage(p => Math.max(1, p - 1))}
                      disabled={schedulePage === 1}
                      className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    {Array.from({ length: Math.ceil(selectedDateEvents.length / PAGE_SIZE) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setSchedulePage(page)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${schedulePage === page
                          ? 'bg-red-600 text-white shadow-md'
                          : 'border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setSchedulePage(p => Math.min(Math.ceil(selectedDateEvents.length / PAGE_SIZE), p + 1))}
                      disabled={schedulePage === Math.ceil(selectedDateEvents.length / PAGE_SIZE)}
                      className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
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
    const totalPages = Math.ceil(sessionsTotalCount / PAGE_SIZE);

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
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">event</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span>Book and manage your session reservations</span>
            </div>
          </div>
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
                        {session.session_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
          <div className="flex flex-col gap-3">
            {/* Search Row */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Search by title, speaker, description..."
                value={searchQueryDraft}
                onChange={(e) => setSearchQueryDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                    setSearchQuery(searchQueryDraft);
                  }
                }}
                onBlur={() => setSearchQuery(searchQueryDraft)}
                className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
              />
              {searchQueryDraft && (
                <button
                  onClick={() => { setSearchQueryDraft(''); setSearchQuery(''); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap gap-3">
              {/* Date filter */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
              />

              {/* Session Type filter */}
              <select
                value={sessionTypeFilter}
                onChange={(e) => setSessionTypeFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
              >
                <option value="All">All Types</option>
                <option value="keynote">Keynote</option>
                <option value="workshop">Workshop</option>
                <option value="panel">Panel</option>
                <option value="networking">Networking</option>
                <option value="competition">Competition</option>
                <option value="mentorship_circle">Mentorship Circle</option>
                <option value="career_coaching">Career Coaching</option>
                <option value="other">Other</option>
              </select>

              {/* Clear Filters */}
              {(searchQueryDraft || dateFilter || sessionTypeFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQueryDraft('');
                    setSearchQuery('');
                    setDateFilter('');
                    setSessionTypeFilter('All');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Available Sessions Grid — server-side paginated */}
          {availableSessions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableSessions.map((session: any) => (
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
                          {session.session_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
                              handleInitiateBooking(session);
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
              {/* Sessions Pagination — server-side */}
              {totalPages > 1 && (
                <div className="flex flex-col flex-wrap sm:flex-row items-center justify-between pt-4 gap-4 sm:gap-0">
                  <p className="text-sm text-slate-500 dark:text-slate-400 shrink-0 text-center sm:text-left">
                    Showing {(sessionsPage - 1) * PAGE_SIZE + 1}–{Math.min(sessionsPage * PAGE_SIZE, sessionsTotalCount)} of {sessionsTotalCount} sessions
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                    <button
                      onClick={() => setSessionsPage(p => Math.max(1, p - 1))}
                      disabled={sessionsPage === 1}
                      className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setSessionsPage(page)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${sessionsPage === page
                          ? 'bg-red-600 text-white shadow-md'
                          : 'border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setSessionsPage(p => Math.min(totalPages, p + 1))}
                      disabled={sessionsPage === totalPages}
                      className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
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

    // Split current page's jobs into applied and new
    const appliedJobs = jobs.filter((job) => appliedJobIds.has(job.id));
    const newJobs = jobs.filter((job) => !appliedJobIds.has(job.id));
    // Server-side total pages (based on full result set)
    const totalPages = Math.ceil(jobsTotalCount / PAGE_SIZE);

    const renderJobCard = (job: any) => {
      const applicationStatus = appliedJobIds.get(job.id);
      const hasApplied = applicationStatus !== undefined;
      const isLocked = applicationStatus === 'approved' || applicationStatus === 'rejected';

      return (
        <motion.div
          key={job.id}
          variants={itemVariants}
          whileHover={{ y: -5 }}
          onClick={() => setSelectedJob(job)}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full group relative overflow-hidden"
        >
          <div className="flex items-start gap-4 mb-4">
            {/* Company Logo */}
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

            {/* Application Status Badge */}
            {hasApplied && (
              <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border ${applicationStatus === 'approved'
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50'
                : applicationStatus === 'rejected'
                  ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50'
                  : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50'
                }`}>
                <span className="material-symbols-outlined text-sm">
                  {applicationStatus === 'approved' ? 'check_circle' : applicationStatus === 'rejected' ? 'cancel' : 'schedule'}
                </span>
                {applicationStatus === 'approved' ? 'Approved' : applicationStatus === 'rejected' ? 'Rejected' : 'Pending'}
              </span>
            )}
          </div>

          {/* Badges Row */}
          <div className="space-y-3 flex-1 mb-4">
            <div className="flex flex-wrap gap-2">
              {/* Job Type Badge */}
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${getTypeBadgeColor(job.job_type)}`}>
                {job.job_type}
              </span>

              {/* Experience Level Badge */}
              {job.experience_level && (
                <span className="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                  {job.experience_level}
                </span>
              )}

              {/* Employment Mode Badge */}
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

            {/* ── NEW: Faculty Badges ── */}
            {job.companies?.faculties && job.companies.faculties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.companies.faculties.map((faculty: string) => (
                  <span
                    key={faculty}
                    className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1 border border-indigo-100 dark:border-indigo-800/40"
                  >
                    <span className="material-symbols-outlined text-[11px]">school</span>
                    {faculty}
                  </span>
                ))}
              </div>
            )}

            {/* Description Snippet */}
            {job.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {job.description}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-sm">schedule</span>
                Posted {new Date(job.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {job.no_of_applicants !== null && job.no_of_applicants !== undefined && (
                <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-sm">group</span>
                  {job.no_of_applicants} {job.no_of_applicants === 1 ? 'applicant' : 'applicants'}
                </span>
              )}
            </div>

            {!hasApplied ? (
              <span className="text-red-600 dark:text-red-400 text-xs font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                View Details
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            ) : isLocked ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                {applicationStatus === 'approved' ? 'Offer received 🎉' : 'Application closed'}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">pending</span>
                Under review
              </span>
            )}
          </div>
        </motion.div>
      );
    };

    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center gap-4 pt-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">work</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Job Opportunities</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span>Explore and apply for open positions</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3">
          {/* Search Row */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Search by title, company, skills..."
              value={jobSearchDraft}
              onChange={(e) => setJobSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                  setJobSearch(jobSearchDraft);
                }
              }}
              onBlur={() => setJobSearch(jobSearchDraft)}
              className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
            />
            {jobSearchDraft && (
              <button
                onClick={() => { setJobSearchDraft(''); setJobSearch(''); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>

          {/* Filter Chips Row */}
          <div className="flex flex-wrap gap-3">
            {/* Job Type filter */}
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
            >
              <option value="All">All Types</option>
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
              <option value="freelance">Freelance</option>
            </select>

            {/* Experience Level filter */}
            <select
              value={jobExperienceFilter}
              onChange={(e) => setJobExperienceFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
            >
              <option value="All">All Levels</option>
              <option value="entry">Entry</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
              <option value="executive">Executive</option>
            </select>

            {/* Employment Mode filter */}
            <select
              value={jobModeFilter}
              onChange={(e) => setJobModeFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
            >
              <option value="All">All Modes</option>
              <option value="on-site">On-Site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>

            {/* Faculty filter (populated from data) */}
            {availableFaculties.length > 0 && (
              <select
                value={jobFacultyFilter}
                onChange={(e) => setJobFacultyFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
              >
                <option value="All">All Faculties</option>
                {availableFaculties.map((faculty) => (
                  <option key={faculty} value={faculty}>{faculty}</option>
                ))}
              </select>
            )}

            {/* Clear Filters button — only show when any filter is active */}
            {(jobSearchDraft || jobTypeFilter !== 'All' || jobExperienceFilter !== 'All' || jobModeFilter !== 'All' || jobFacultyFilter !== 'All') && (
              <button
                onClick={() => {
                  setJobSearchDraft('');
                  setJobSearch('');
                  setJobTypeFilter('All');
                  setJobExperienceFilter('All');
                  setJobModeFilter('All');
                  setJobFacultyFilter('All');
                }}
                className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ── SECTION 1: Applied Jobs ── */}
        {appliedJobs.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl">send</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Applied Jobs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{appliedJobs.length} application{appliedJobs.length !== 1 ? 's' : ''} submitted</p>
              </div>
            </div>

            <div className="space-y-4">
              {appliedJobs.map((job) => renderJobCard(job))}
            </div>

            {/* Divider before New Jobs */}
            {newJobs.length > 0 && (
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-slate-700" />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── SECTION 2: New Opportunities ── */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">explore</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Opportunities</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{jobsTotalCount} position{jobsTotalCount !== 1 ? 's' : ''} available</p>
            </div>
          </div>

          {newJobs.length > 0 || jobsTotalCount > 0 ? (
            <>
              <div className="space-y-4">
                {newJobs.map((job) => renderJobCard(job))}
              </div>
              {/* Server-side Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col flex-wrap sm:flex-row items-center justify-between pt-4 gap-4 sm:gap-0">
                  <p className="text-sm text-slate-500 dark:text-slate-400 shrink-0 text-center sm:text-left">
                    Showing {(jobsPage - 1) * PAGE_SIZE + 1}–{Math.min(jobsPage * PAGE_SIZE, jobsTotalCount)} of {jobsTotalCount} positions
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                    <button
                      onClick={() => setJobsPage(p => Math.max(1, p - 1))}
                      disabled={jobsPage === 1}
                      className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setJobsPage(page)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${jobsPage === page
                          ? 'bg-red-600 text-white shadow-md'
                          : 'border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setJobsPage(p => Math.min(totalPages, p + 1))}
                      disabled={jobsPage === totalPages}
                      className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-2 block">work_off</span>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {jobs.length === 0 ? 'No matching jobs found' : 'You\'ve applied to all on this page!'}
              </p>
              {(jobSearch || jobTypeFilter !== 'All' || jobFacultyFilter !== 'All') && (
                <button
                  onClick={() => { setJobSearch(''); setJobTypeFilter('All'); setJobFacultyFilter('All'); }}
                  className="mt-2 text-red-600 dark:text-red-400 text-sm font-bold hover:underline"
                >
                  Clear Filters
                </button>
              )}
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
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">business</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Participating Companies</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span>Discover companies and explore their booths</span>
            </div>
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
                  {type === 'All' ? 'All Partner Types' : type.split('_').map((w) => w === 'a' || w === 'b' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              expand_more
            </span>
          </div>
        </motion.div>

        {/* Grouped by Partner Type */}
        {(() => {
          const groups = ['diamond', 'platinum', 'gold', 'silver', 'exhibitor_a', 'exhibitor_b', 'student_activity_partner', 'community_partner', 'catering_partner', 'career_coaching_partner'];
          const labelMap: Record<string, string> = {
            diamond: 'Diamond Partners',
            platinum: 'Platinum Partners',
            gold: 'Gold Partners',
            silver: 'Silver Partners',
            exhibitor_a: 'Exhibitors A',
            exhibitor_b: 'Exhibitors B',
            student_activity_partner: 'Student Activity Partners',
            community_partner: 'Community Partners',
            catering_partner: 'Catering Partners',
            career_coaching_partner: 'Career Coaching Partners',
          };
          return groups.map((partnerType) => {
            const grouped = filteredCompanies.filter((c) => c.partner_type === partnerType);
            if (grouped.length === 0) return null;
            return (
              <motion.div key={partnerType} variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-700 pb-2">
                  {labelMap[partnerType]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {grouped.map((company) => (
                    <motion.div
                      key={company.id}
                      variants={itemVariants}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedCompany(company)}
                      className="group bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-700/50 cursor-pointer transition-all duration-300 relative overflow-hidden"
                    >
                      {/* Partner Badge */}
                      <div className="absolute top-4 right-4 z-10">
                        <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${company.partner_type === 'diamond' ? 'bg-cyan-100 text-cyan-700' :
                          company.partner_type === 'platinum' ? 'bg-slate-100 text-slate-700' :
                            company.partner_type === 'gold' ? 'bg-amber-50 text-amber-700' :
                              company.partner_type === 'silver' ? 'bg-gray-100 text-gray-700' :
                                company.partner_type === 'exhibitor_a' ? 'bg-indigo-100 text-indigo-700' :
                                  company.partner_type === 'exhibitor_b' ? 'bg-teal-100 text-teal-700' :
                                    company.partner_type === 'student_activity_partner' ? 'bg-violet-100 text-violet-700' :
                                      company.partner_type === 'community_partner' ? 'bg-emerald-100 text-emerald-700' :
                                        company.partner_type === 'catering_partner' ? 'bg-orange-100 text-orange-700' :
                                          company.partner_type === 'career_coaching_partner' ? 'bg-sky-100 text-sky-700' :
                                            'bg-slate-100 text-slate-600'}`}>
                          {company.partner_type.split('&').map((part: string) => part.split('_').map((w: string) => w === 'a' || w === 'b' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' & ')}
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
                  ))}
                </div>
              </motion.div>
            );
          });
        })()}

        {/* Empty state */}
        {filteredCompanies.length === 0 && (
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
      case 'feedback': return <FeedbackTab subtitle="Tell us how the event went for you. Your answers help us improve." />;
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

      {/* QR Code Modal border */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600">qr_code_2</span>
                  Your QR Code
                </h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-8 flex flex-col items-center justify-center">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                  <QRCodeCanvas value={profile?.id || ''} size={200} level="H" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Use this code to check in at events, sessions, and booths.
                </p>
              </div>
            </motion.div>
          </div>
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
              setSelectedSession(null);
              handleInitiateBooking(selectedSession);
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
      <AnimatePresence>
        {showBookingConfirm && sessionToBook && (
          <BookingConfirmationModal
            key="booking-modal"
            session={sessionToBook}
            onConfirm={async () => {
              if (sessionToBook) {
                await handleBookSession(sessionToBook);
              }
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

      {/* View All Activities Modal */}
      <AnimatePresence>
        {showAllActivitiesModal && (
          <ViewAllActivitiesModal eventId={EVENT_ID} onClose={() => setShowAllActivitiesModal(false)} />
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