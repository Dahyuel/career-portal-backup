import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAttendeeProfile } from '../../hooks/useAttendeeProfile';
import AttendeeProfileCard from '../../components/AttendeeProfileCard';
import NotificationModal from '../../components/NotificationModal';
import ScheduleEventModal from '../../components/ScheduleEventModal';
import SessionDetailModal from '../../components/SessionDetailModal';
import BookingConfirmationModal from '../../components/BookingConfirmationModal';
import CompanyDetailModal from '../../components/CompanyDetailModal';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import JobDetailModal from '../../components/attendee/JobDetailModal';
import ApplyJobModal from '../../components/attendee/ApplyJobModal';

import Toast from '../../components/shared/Toast';
import { supabase } from '../../lib/supabase';

const AttendeeDashboard = () => {
  const { user, profile } = useAuth();
  const { attendeeProfile } = useAttendeeProfile(user?.id);
  const [activeTab, setActiveTab] = useState('home');
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Schedule and Sessions state
  const attendeeId = user?.id; // ID is now the user_id (shared PK)
  // const [attendeeId, setAttendeeId] = useState<string | null>(null); // Removed
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
  const [timeFilter, setTimeFilter] = useState<string>('');
  const [loadingSessions, setLoadingSessions] = useState(true);

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
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  const [isApplying, setIsApplying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

  // Get first name from full_name
  const firstName = attendeeProfile?.full_name?.split(' ')[0] || 'Attendee';

  // Fetch notifications filtered by user role
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!profile?.role) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .contains('target_roles', [profile.role])
        .order('publish_at', { ascending: false });

      if (!error && data) {
        console.log('Notifications loaded:', data); // Add this for debugging
        setNotifications(data);
      } else if (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [profile?.role]);

  // Fetch user activities
  useEffect(() => {
    const fetchActivities = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('activity_timestamp', { ascending: false })
        .limit(10);

      if (!error && data) {
        setUserActivities(data);
      }
    };

    fetchActivities();
  }, [user?.id]);

  // Fetch upcoming events from schedule
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      const { data, error } = await supabase
        .from('schedule')
        .select('*')
        .eq('event_id', EVENT_ID)
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10);

      if (!error && data) {
        setUpcomingEvents(data);
      }
    };

    fetchUpcomingEvents();
  }, []);

  // Fetch attendee ID (Removed - id column is gone, using user.id)
  /*
  useEffect(() => {
    const fetchAttendeeId = async () => {
       // ... removed
    };
    // fetchAttendeeId();
  }, [user?.id]);
  */

  // Fetch schedule events and extract unique dates
  useEffect(() => {
    const fetchScheduleEvents = async () => {
      const { data, error } = await supabase
        .from('schedule')
        .select('*')
        .eq('event_id', EVENT_ID)
        .order('start_time', { ascending: true });

      if (!error && data) {
        setScheduleEvents(data);

        // Extract unique dates
        const dates = Array.from(
          new Set(
            data.map((event: any) =>
              new Date(event.start_time).toISOString().split('T')[0]
            )
          )
        );
        setUniqueDates(dates);
        if (dates.length > 0 && !selectedDay) {
          setSelectedDay(dates[0] as any);
        }
      }
    };

    fetchScheduleEvents();
  }, []);

  // Fetch booked sessions
  useEffect(() => {
    const fetchBookedSessions = async () => {
      if (!attendeeId) return;

      const { data, error } = await supabase
        .from('session_bookings')
        .select(`
          *,
          sessions!inner (
            *,
            speaker (
              first_name,
              last_name,
              title,
              photo_url
            )
          )
        `)
        .eq('attendee_id', attendeeId)
        .neq('booking_status', 'cancelled')
        .order('booked_at', { ascending: false });

      if (!error && data) {
        // Flatten the structure
        const sessions = data.map((booking: any) => ({
          ...booking.sessions,
          booking_id: booking.id,
          booking_status: booking.booking_status,
          booked_at: booking.booked_at,
          speaker: booking.sessions.speaker
        }));
        setBookedSessions(sessions);
      }
    };

    fetchBookedSessions();
  }, [attendeeId]);

  // Fetch available sessions (excluding booked ones)
  useEffect(() => {
    const fetchAvailableSessions = async () => {
      if (!attendeeId) return;

      // First get all sessions
      const { data: allSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          speaker (
            first_name,
            last_name,
            title,
            photo_url
          )
        `)
        .eq('event_id', EVENT_ID)
        .order('start_time', { ascending: true });

      if (sessionsError || !allSessions) return;

      // Get booked session IDs
      const { data: bookings } = await supabase
        .from('session_bookings')
        .select('session_id')
        .eq('attendee_id', attendeeId)
        .neq('booking_status', 'cancelled');

      const bookedIds = new Set(bookings?.map((b: any) => b.session_id) || []);

      // Filter out booked sessions
      const available = allSessions.filter((s: any) => !bookedIds.has(s.id));
      setAvailableSessions(available);
      setLoadingSessions(false);
    };

    setLoadingSessions(true);
    fetchAvailableSessions();
  }, [attendeeId, bookedSessions]); // Re-fetch when bookings change

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('event_id', EVENT_ID)
        .order('company_name');

      if (!error && data) {
        setCompanies(data);
        setFilteredCompanies(data);
        // Extract unique partner types
        const types = Array.from(new Set(data.map((c: any) => c.partner_type).filter(Boolean)));
        setPartnerTypes(['All', ...types]);
      }
    };

    fetchCompanies();
    fetchCompanies();
  }, []);

  // Fetch Jobs and Applications
  useEffect(() => {
    const fetchJobsData = async () => {
      // 1. Fetch all jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_positions')
        .select(`
          *,
          companies (
            company_name,
            logo_url,
            industry
          )
        `)
        .eq('is_active', true)
        .order('posted_at', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
      } else {
        setJobs(jobsData || []);
        setFilteredJobs(jobsData || []);
      }

      // 2. Fetch user's applications
      if (attendeeId) {
        const { data: applications, error: appError } = await supabase
          .from('job_applications')
          .select('job_id')
          .eq('attendee_id', attendeeId);

        if (!appError && applications) {
          setAppliedJobIds(new Set(applications.map(app => app.job_id)));
        }
      }
    };

    fetchJobsData();
  }, [attendeeId]);

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
      'Fair': 'bg-blue-100 text-blue-800',
      'Workshop': 'bg-purple-100 text-purple-800',
      'Seminar': 'bg-amber-100 text-amber-800',
      'Networking': 'bg-emerald-100 text-emerald-800',
      'Break': 'bg-slate-100 text-slate-600',
      'Full-Time': 'bg-blue-100 text-blue-800',
      'Internship': 'bg-amber-100 text-amber-800',
      'Part-Time': 'bg-emerald-100 text-emerald-800',
      'Co-op': 'bg-purple-100 text-purple-800',
      'Remote': 'bg-slate-100 text-slate-800',
      'keynote': 'bg-purple-100 text-purple-800',
      'workshop': 'bg-blue-100 text-blue-800',
      'panel': 'bg-green-100 text-green-800',
      'networking': 'bg-amber-100 text-amber-800',
      'competition': 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Handler: Book a session
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
          // Update existing cancelled booking to confirmed
          const { error: updateError } = await supabase
            .from('session_bookings')
            .update({
              booking_status: 'confirmed',
              checked_in: false,
              booked_at: new Date().toISOString()
            })
            .eq('id', existingBooking.id);

          if (updateError) throw updateError;
        } else {
          setToast({ message: 'You already have a booking for this session.', type: 'warning' });
          setShowBookingConfirm(false);
          setSessionToBook(null);
          return;
        }
        setShowBookingConfirm(false);
        setSessionToBook(null);
        return;
      }
      else {
        // Insert new booking
        const { error: bookingError } = await supabase
          .from('session_bookings')
          .insert({
            session_id: sessionToBook.id,
            attendee_id: attendeeId,
            booking_status: 'confirmed',
            checked_in: false
          });

        if (bookingError) throw bookingError;
      }

      // 3. Update session stats
      await supabase
        .from('sessions')
        .update({
          current_bookings: currentBookings + 1,
          is_full: (maxAttendees && currentBookings + 1 >= maxAttendees) ? true : false
        })
        .eq('id', sessionToBook.id);

      // 4. Refresh booked sessions
      const { data: newBookings } = await supabase
        .from('session_bookings')
        .select(`
          *,
          sessions!inner (
            *,
            speaker (
              first_name,
              last_name,
              title,
              photo_url
            )
          )
        `)
        .eq('attendee_id', attendeeId)
        .neq('booking_status', 'cancelled')
        .order('booked_at', { ascending: false });

      if (newBookings) {
        const formattedSessions = newBookings.map((booking: any) => ({
          ...booking.sessions,
          booking_id: booking.id,
          booking_status: booking.booking_status,
          booked_at: booking.booked_at,
          speaker: booking.sessions.speaker
        }));
        setBookedSessions(formattedSessions);
      }

      setShowBookingConfirm(false);
      setSessionToBook(null);

    } catch (err: any) {
      console.error('Error booking session:', err);
      setToast({ message: 'Failed to book session. Please try again.', type: 'error' });
    }
  }


  // Handler: Cancel a booking
  const handleCancelBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from('session_bookings')
      .update({ booking_status: 'cancelled' })
      .eq('id', bookingId);

    if (!error) {
      // Refresh sessions
      setBookedSessions(prev => prev.filter(s => s.booking_id !== bookingId));
      setSelectedSession(null);
    }
  }


  // Handler: Apply for a job
  const handleApplyClick = (job: any, e?: React.MouseEvent) => {
    e?.stopPropagation();

    // Check if CV is uploaded
    if (!attendeeProfile?.cv_url) {
      setToast({ message: 'Please upload your CV in your profile before applying for jobs.', type: 'warning' });
      // Suggest opening profile?
      // setShowProfile(true); // Keeping this if user wants immediate action
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
          job_id: jobToApply.id,
          attendee_id: attendeeId,
          status: 'pending'
        });

      if (error) throw error;

      // Update local state
      setAppliedJobIds(prev => new Set(prev).add(jobToApply.id));

      // Close all modals
      setJobToApply(null);
      if (selectedJob?.id === jobToApply.id) {
        // If detail modal is open, keep it open but update state? 
        // Actually no need to update selectedJob as hasApplied is derived from appliedJobIds
      }
      setToast({ message: 'Application submitted successfully!', type: 'success' });

    } catch (error: any) {
      console.error('Error applying for job:', error);
      setToast({ message: 'Failed to apply: ' + error.message, type: 'error' });
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

      // Time filter (morning: before 12pm, afternoon: 12pm-6pm, evening: after 6pm)
      let matchesTime = true;
      if (timeFilter) {
        const hour = new Date(session.start_time).getHours();
        if (timeFilter === 'morning') matchesTime = hour < 12;
        else if (timeFilter === 'afternoon') matchesTime = hour >= 12 && hour < 18;
        else if (timeFilter === 'evening') matchesTime = hour >= 18;
      }

      return matchesSearch && matchesDate && matchesTime;
    });
  };

  const renderHomeTab = () => (
    <div className="space-y-6">
      {/* Welcome Banner with Gradient Fade */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl p-8 md:p-12 min-h-[300px] flex flex-col justify-center text-white" style={{
        background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 60%, #ffffff 130%)'
      }}>
        <div className="relative z-10">
          <p className="uppercase tracking-widest text-red-100 font-semibold text-xs mb-2">Attendee</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome, {firstName}
          </h1>
          <p className="text-lg text-red-50 opacity-90 max-w-md mb-8">
            Let's make some meaningful connections today and level up your career profile.
          </p>
          <button
            onClick={() => setShowProfile(true)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit"
          >
            <span className="material-symbols-outlined text-xl">account_circle</span>
            Show Profile
          </button>
        </div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/20 rounded-full -mb-32 -mr-32 blur-3xl"></div>
      </div>



      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600">history</span>
          Recent Activity
        </h3>
        <div className="space-y-4">
          {userActivities.length > 0 ? (
            userActivities.slice(0, 5).map((activity: any, idx: number) => (
              <div key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                  <span className="material-symbols-outlined text-red-600">
                    {activity.activity_type === 'session_attendance' ? 'event' :
                      activity.activity_type === 'job_application' ? 'work' :
                        activity.activity_type === 'company_visit' ? 'business' :
                          'check_circle'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{activity.activity_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                  <p className="text-sm text-gray-600">{activity.description || 'No description'}</p>
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
            <div className="text-center py-8 text-gray-500">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-2 block">history</span>
              <p className="text-sm">No recent activities</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600">event</span>
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
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
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
            <div className="text-center py-8 text-gray-500">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-2 block">event_busy</span>
              <p className="text-sm">No upcoming events</p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Card */}
      {showProfile && attendeeProfile && (
        <AttendeeProfileCard
          profile={attendeeProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );

  const renderScheduleTab = () => {
    const getScheduleForDate = (date: string) => {
      return scheduleEvents.filter((event: any) =>
        new Date(event.start_time).toISOString().split('T')[0] === date
      );
    };

    const selectedDateEvents = selectedDay ? getScheduleForDate(selectedDay as string) : [];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Event Schedule</h2>

        {/* Date Cards */}
        <div className="overflow-x-auto pb-2">
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
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-red-300'
                    }`}
                >
                  <div className={`text-sm font-semibold mb-1 ${isSelected ? 'text-red-600' : 'text-gray-600'}`}>
                    Day {idx + 1}
                  </div>
                  <div className={`text-lg font-bold mb-1 ${isSelected ? 'text-red-700' : 'text-gray-900'}`}>
                    {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Events for Selected Date */}
        <div className="space-y-4">
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map((event: any) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="w-full border border-gray-200 rounded-xl p-4 hover:border-red-300 hover:bg-red-50/30 transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
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
            <div className="text-center py-12 text-gray-500">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-3 block">event_busy</span>
              <p className="text-lg font-semibold">No events scheduled</p>
              <p className="text-sm">Select a different date to view events</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSessionsTab = () => {
    const filteredAvailable = filterSessions(availableSessions);

    if (loadingSessions) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-red-100 border-t-red-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading sessions...</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-gray-900">Sessions</h2>

        {/* My Booked Sessions */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">event_available</span>
            My Current Bookings
          </h3>

          {bookedSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookedSessions.map((session: any) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
                >
                  <div className="mb-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(session.session_type)}`}>
                      {session.session_type}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{session.title}</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      {new Date(session.start_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {session.room_name && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">meeting_room</span>
                        {session.room_name}
                      </div>
                    )}
                    {session.speaker && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">person</span>
                        {session.speaker.first_name} {session.speaker.last_name}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-2 block">event_busy</span>
              <p className="text-gray-600">No booked sessions yet</p>
              <p className="text-sm text-gray-500 mt-1">Browse available sessions below</p>
            </div>
          )}
        </div>

        {/* All Available Sessions */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">explore</span>
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
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="">All Dates</option>
              {uniqueDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </option>
              ))}
            </select>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="">All Times</option>
              <option value="morning">Morning (before 12 PM)</option>
              <option value="afternoon">Afternoon (12-6 PM)</option>
              <option value="evening">Evening (after 6 PM)</option>
            </select>
          </div>

          {/* Available Sessions Grid */}
          {filteredAvailable.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAvailable.map((session: any) => (
                <div
                  key={session.id}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(session.session_type)}`}>
                      {session.session_type}
                    </span>
                    {session.is_full && (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">Full</span>
                    )}
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{session.title}</h4>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      {new Date(session.start_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {session.room_name && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">meeting_room</span>
                        {session.room_name}
                      </div>
                    )}
                    {session.speaker && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">person</span>
                        {session.speaker.first_name} {session.speaker.last_name}
                      </div>
                    )}
                    {session.max_attendees && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">groups</span>
                        {session.current_bookings}/{session.max_attendees} booked
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setSessionToBook(session);
                        setShowBookingConfirm(true);
                      }}
                      disabled={session.is_full}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-3 block">search_off</span>
              <p className="text-lg font-semibold text-gray-600">No sessions found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderJobsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Job Opportunities</h2>
        <span className="text-sm text-gray-500">{filteredJobs.length} Jobs Found</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            placeholder="Search jobs, companies, skills..."
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
          />
        </div>

        <div className="relative min-w-[200px]">
          <select
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-600 appearance-none cursor-pointer"
          >
            <option value="All">All Job Types</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Internship">Internship</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Co-op">Co-op</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
        </div>
      </div>

      {/* Job Listings */}
      <div className="space-y-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => {
            const hasApplied = appliedJobIds.has(job.id);
            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* Company Logo/Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100">
                    {job.companies?.logo_url ? (
                      <img src={job.companies.logo_url} alt={job.companies.company_name} className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <span className="material-symbols-outlined text-gray-400 text-2xl">business</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-red-600 transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-gray-600 font-medium">{job.companies?.company_name || 'Unknown Company'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getTypeBadgeColor(job.job_type)}`}>
                        {job.job_type}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{job.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {new Date(job.posted_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">work_history</span>
                        {job.employment_mode}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleApplyClick(job, e)}
                      disabled={hasApplied}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all shadow-sm ${hasApplied
                        ? 'bg-green-50 text-green-700 cursor-not-allowed border border-green-100'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-md active:scale-95'
                        }`}
                    >
                      {hasApplied ? 'Applied' : 'Apply Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
            <span className="material-symbols-outlined text-5xl text-gray-300 mb-2 block">work_off</span>
            <p className="text-gray-600 font-medium">No matching jobs found</p>
            <button
              onClick={() => { setJobSearch(''); setJobTypeFilter('All'); }}
              className="mt-2 text-red-600 text-sm font-bold hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderCompaniesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Participating Companies</h2>
        <span className="text-sm text-gray-500">{filteredCompanies.length} Companies</span>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            placeholder="Search companies, industry..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="relative min-w-[200px]">
          <select
            value={companyTypeFilter}
            onChange={(e) => setCompanyTypeFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all appearance-none cursor-pointer"
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
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => (
          <div
            key={company.id}
            onClick={() => setSelectedCompany(company)}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center p-2 border border-gray-100 group-hover:border-red-100 transition-colors">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.company_name} className="w-full h-full object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-gray-300 text-3xl">business</span>
                )}
              </div>
              {company.partner_type && (
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${company.partner_type === 'platinum' ? 'bg-slate-100 text-slate-700' :
                  company.partner_type === 'gold' ? 'bg-yellow-50 text-yellow-700' :
                    company.partner_type === 'silver' ? 'bg-gray-50 text-gray-600' :
                      'bg-blue-50 text-blue-700'
                  }`}>
                  {company.partner_type}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-red-600 transition-colors">
              {company.company_name}
            </h3>
            <p className="text-sm text-gray-500 font-medium mb-3">{company.industry || 'Multi-industry'}</p>

            <p className="text-gray-600 text-sm line-clamp-2 mb-4 h-10">
              {company.description || 'No description available'}
            </p>

            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
              {company.booth_number && (
                <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-sm">storefront</span>
                  Booth {company.booth_number}
                </span>
              )}
              <span className="flex items-center gap-1 text-red-600 ml-auto group-hover:translate-x-1 transition-transform">
                View Details
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>
          </div>
        ))}

        {filteredCompanies.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-3xl">search_off</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No companies found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
            <button
              onClick={() => { setCompanySearch(''); setCompanyTypeFilter('All'); }}
              className="mt-4 text-red-600 font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );

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
      notifications={notifications}  // Make sure this line exists
      onNotificationClick={(notification) => setSelectedNotification(notification)}
      hideDock={showProfile || !!selectedNotification || !!selectedEvent}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      {/* Profile Card */}
      {showProfile && attendeeProfile && (
        <AttendeeProfileCard
          profile={attendeeProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Notification Modal */}
      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}

      {/* Schedule Event Modal */}
      {selectedEvent && (
        <ScheduleEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
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
              await handleCancelBooking(booking.booking_id);
            }
            setSelectedSession(null);
          }}
        />
      )}

      {/* Booking Confirmation Modal */}
      {showBookingConfirm && sessionToBook && (
        <BookingConfirmationModal
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



      {/* Company Detail Modal */}
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApply={() => handleApplyClick(selectedJob)}
          hasApplied={appliedJobIds.has(selectedJob.id)}
        />
      )}


      {/* Apply Job Modal */}
      {jobToApply && (
        <ApplyJobModal
          jobTitle={jobToApply.title}
          onClose={() => setJobToApply(null)}
          onConfirm={handleConfirmApply}
          loading={isApplying}
        />
      )}

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
