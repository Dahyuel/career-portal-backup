import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAttendeeProfile } from '../../hooks/useAttendeeProfile';
import AttendeeProfileCard from '../../components/AttendeeProfileCard';
import { supabase } from '../../lib/supabase';
import {
  Plus,
  TrendingUp,
  Building2,
  Calendar,
  Megaphone,
  ArrowRight,
  UserCheck,
  X,
  Loader2,
  Globe,
  Mail,
  MapPin,
  Key,
  Hash,
  Search,
  Pencil,
  Copy,
  Check,
  Clock,
  Users,
  Send,
  Briefcase,
  Eye,
  ChevronRight
} from 'lucide-react';
import JobApplicantsModal from '../../components/employer/JobApplicantsModal';

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  },
  exit: { opacity: 0 }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

// --- Types ---
interface Company {
  id: string;
  event_id: string;
  company_name: string;
  industry: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  booth_number: string | null;
  logo_url: string | null;
  partner_type: 'platinum' | 'gold' | 'silver' | 'bronze' | 'startup' | null;
  company_key: string | null;
  created_at: string | null;
}

interface AdminJob {
  id: string;
  title: string;
  company_id: string;
  employer_id: string;
  event_id: string;
  job_type: string;
  location: string;
  experience_level: string;
  employment_mode: string;
  posted_at: string;
  is_active: boolean;
  no_of_applicants: number;
  description: string;
  required_skills: string;
  company_name?: string;
  company_logo?: string | null;
}

interface AdminEvent {
  id: string;
  name: string;
  event_type: string | null;
  start_date: string;
  end_date: string;
  status: string;
  allow_non_asu_attendees: boolean;
  non_asu_ticket_price: number;
  venue_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Speaker {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  linkedin_url: string | null;
  photo_url: string | null;
}

interface Session {
  id: string;
  event_id: string;
  speaker_id: string;
  title: string;
  description: string | null;
  session_type: string;
  start_time: string;
  end_time: string;
  room_name: string | null;
  room_capacity: number | null;
  max_attendees: number | null;
  current_bookings: number;
  is_full: boolean;
  requires_booking: boolean;
  status: string;
  created_at: string | null;
  speaker?: Speaker;
}

interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  personal_id: string;
  email: string | null;
}

interface DashboardStats {
  totalAttendees: number;
  approvedAttendees: number;
  todayEntries: number;
  totalCompanies: number;
  totalSessions: number;
}

const PARTNER_TYPE_OPTIONS = ['platinum', 'gold', 'silver', 'bronze', 'startup'] as const;
const SESSION_TYPE_OPTIONS = ['keynote', 'workshop', 'panel', 'networking', 'competition', 'other'] as const;
const SESSION_STATUS_OPTIONS = ['scheduled', 'ongoing', 'completed', 'cancelled'] as const;
const ANNOUNCEMENT_TYPE_OPTIONS = ['general', 'urgent', 'update', 'reminder'] as const;

const PARTNER_TYPE_COLORS: Record<string, string> = {
  platinum: 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100',
  gold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  silver: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  bronze: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  startup: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  keynote: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  workshop: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  panel: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  networking: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  competition: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  other: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

const JOB_TYPE_COLORS: Record<string, string> = {
  'full-time': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Full-Time': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'part-time': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Part-Time': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'internship': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Internship': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'contract': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Contract': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'freelance': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'Freelance': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

const EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

export function AdminPanel() {
  const { user } = useAuth();
  useTheme();
  const { attendeeProfile } = useAttendeeProfile(user?.id);
  const [showProfile, setShowProfile] = useState(false);

  const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'statistics', label: 'Statistics', icon: 'bar_chart' },
    { key: 'sessions', label: 'Sessions', icon: 'event' },
    { key: 'events', label: 'Events', icon: 'campaign' },
    { key: 'companies', label: 'Companies', icon: 'business' },
    { key: 'jobs', label: 'Jobs', icon: 'work' }
  ];

  const [activeTab, setActiveTab] = useState('dashboard');
  const [statisticsView, setStatisticsView] = useState<'general' | 'filter' | 'day'>('general');
  const [selectedDay, setSelectedDay] = useState(1);

  // Modal states
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAddMapModal, setShowAddMapModal] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // ===== JOBS STATE =====
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);
  const [showJobDetailModal, setShowJobDetailModal] = useState(false);
  const [showJobApplicantsModal, setShowJobApplicantsModal] = useState(false);

  // ===== EVENTS STATE =====
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);

  // Add/Edit Event State
  const [showAddEditEventModal, setShowAddEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    name: '', event_type: '', start_date: '', end_date: '',
    status: 'draft', venue_name: '', allow_non_asu_attendees: false, non_asu_ticket_price: 0
  });
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState('');

  // ===== DASHBOARD STATS STATE =====
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalAttendees: 0, approvedAttendees: 0, todayEntries: 0, totalCompanies: 0, totalSessions: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // ===== SESSIONS STATE =====
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  // Add Session form state
  const [sessionForm, setSessionForm] = useState({
    title: '', description: '', session_type: 'workshop' as string, speaker_id: '' as string,
    start_time: '', end_time: '', room_name: '', max_attendees: '' as string,
    requires_booking: false, status: 'scheduled' as string,
    new_speaker_first_name: '', new_speaker_last_name: '', new_speaker_title: '',
    new_speaker_linkedin: '', new_speaker_photo: '',
  });
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [sessionFormError, setSessionFormError] = useState('');
  const [useNewSpeaker, setUseNewSpeaker] = useState(false);

  // ===== ANNOUNCEMENT STATE =====
  const [announcementForm, setAnnouncementForm] = useState({
    title: '', content: '', announcement_type: 'general' as string,
  });
  const [announcementTargets, setAnnouncementTargets] = useState<string[]>([]);
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
  const [announcementFormError, setAnnouncementFormError] = useState('');
  const [individualSearch, setIndividualSearch] = useState('');
  const [individualResults, setIndividualResults] = useState<UserProfile[]>([]);
  const [selectedIndividual, setSelectedIndividual] = useState<UserProfile | null>(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // ===== STATISTICS STATE =====
  type CountMap = { label: string; count: number }[];
  interface StatsData {
    totalRegistrations: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    asuStudents: number;
    nonAsuStudents: number;
    paidCount: number;
    unpaidCount: number;
    paymentPendingCount: number;
    totalCheckIns: number;
    uniqueCheckIns: number;
    universities: CountMap;
    faculties: CountMap;
    departments: CountMap;
    totalCompanies: number;
    totalSessions: number;
    dayStats: { date: string; label: string; checkIns: number; uniqueAttendees: number; asuCheckIns: number; nonAsuCheckIns: number; universities: CountMap; faculties: CountMap }[];
  }
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);
  const [statsFilterCategory, setStatsFilterCategory] = useState<'university' | 'faculty' | 'registration' | 'payment' | 'asu'>('university');

  // ===== COMPANIES STATE =====
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showViewCompanyModal, setShowViewCompanyModal] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Add Company form state
  const [companyForm, setCompanyForm] = useState({
    company_name: '', industry: '', email: '', website: '',
    description: '', booth_number: '', logo_url: '', partner_type: '' as string,
  });
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [companyFormError, setCompanyFormError] = useState('');

  // Edit Company state
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editCompanyForm, setEditCompanyForm] = useState({
    company_name: '', industry: '', email: '', website: '',
    description: '', booth_number: '', logo_url: '', partner_type: '' as string,
  });
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // ===== DASHBOARD STATS FETCHING =====
  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const [attendeesRes, approvedRes, todayRes, companiesRes, sessionsRes] = await Promise.all([
        supabase.from('attendees').select('*', { count: 'exact', head: true }),
        supabase.from('attendees').select('*', { count: 'exact', head: true }).eq('registration_status', 'approved'),
        (() => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
          return supabase.from('attendee_attendance').select('*', { count: 'exact', head: true })
            .eq('event_id', EVENT_ID).gte('check_in_time', today.toISOString()).lt('check_in_time', tomorrow.toISOString());
        })(),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID),
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID),
      ]);
      setDashboardStats({
        totalAttendees: attendeesRes.count || 0,
        approvedAttendees: approvedRes.count || 0,
        todayEntries: todayRes.count || 0,
        totalCompanies: companiesRes.count || 0,
        totalSessions: sessionsRes.count || 0,
      });
    } catch (err) { console.error('Error fetching dashboard stats:', err); }
    finally { setIsLoadingStats(false); }
  }, []);

  // ===== SESSIONS FETCHING =====
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, speaker:speaker_id(id, first_name, last_name, title, linkedin_url, photo_url)')
        .eq('event_id', EVENT_ID)
        .order('start_time', { ascending: true });
      if (error) { console.error('Error fetching sessions:', error); return; }
      setSessions(data || []);
    } catch (err) { console.error('Error fetching sessions:', err); }
    finally { setIsLoadingSessions(false); }
  }, []);

  const fetchSpeakers = useCallback(async () => {
    try {
      const { data } = await supabase.from('speaker').select('*').order('first_name');
      setSpeakers(data || []);
    } catch (err) { console.error('Error fetching speakers:', err); }
  }, []);

  // ===== COMPANIES DATA FETCHING =====
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies').select('*').eq('event_id', EVENT_ID)
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching companies:', error); return; }
      setCompanies(data || []);
    } catch (err) { console.error('Error fetching companies:', err); }
    finally { setIsLoadingCompanies(false); }
  }, []);

  // ===== JOBS DATA FETCHING =====
  const fetchJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('job_positions')
        .select(`
          *,
          job_applications(count),
          companies:company_id(company_name, logo_url)
        `)
        .eq('event_id', EVENT_ID)
        .order('posted_at', { ascending: false });

      if (error) { console.error('Error fetching jobs:', error); return; }

      const mappedJobs: AdminJob[] = (data || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        company_id: job.company_id,
        employer_id: job.employer_id,
        event_id: job.event_id,
        job_type: job.job_type,
        location: job.location,
        experience_level: job.experience_level,
        employment_mode: job.employment_mode,
        posted_at: job.posted_at,
        is_active: job.is_active,
        no_of_applicants: job.job_applications?.[0]?.count || 0,
        description: job.description,
        required_skills: job.required_skills,
        company_name: job.companies?.company_name || 'Unknown Company',
        company_logo: job.companies?.logo_url || null,
      }));

      setJobs(mappedJobs);
    } catch (err) { console.error('Error fetching jobs:', err); }
    finally { setIsLoadingJobs(false); }
  }, []);

  // ===== EVENTS DATA FETCHING =====
  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) { console.error('Error fetching events:', error); return; }
      setEvents(data || []);
    } catch (err) { console.error('Error fetching events:', err); }
    finally { setIsLoadingEvents(false); }
  }, []);

  // ===== STATISTICS FETCHING =====
  const fetchStatistics = useCallback(async () => {
    setIsLoadingStatistics(true);
    try {
      const [attendeesRes, attendanceRes, companiesCountRes, sessionsCountRes] = await Promise.all([
        supabase.from('attendees').select('user_id, is_asu_student, university, faculty, department, registration_status, payment_status'),
        supabase.from('attendee_attendance').select('attendee_id, check_in_time, attendees!inner(is_asu_student, university, faculty)').eq('event_id', EVENT_ID),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID),
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID),
      ]);

      const attendees = attendeesRes.data || [];
      const attendance = (attendanceRes.data || []) as any[];

      // Registration counts
      const approved = attendees.filter(a => a.registration_status === 'approved').length;
      const pending = attendees.filter(a => a.registration_status === 'pending').length;
      const rejected = attendees.filter(a => a.registration_status === 'rejected').length;
      const asu = attendees.filter(a => a.is_asu_student === true).length;
      const nonAsu = attendees.filter(a => a.is_asu_student === false).length;
      const paid = attendees.filter(a => a.payment_status === 'paid').length;
      const paymentPending = attendees.filter(a => a.payment_status === 'pending').length;
      const unpaid = attendees.filter(a => !a.payment_status || (a.payment_status !== 'paid' && a.payment_status !== 'pending')).length;

      // University breakdown
      const uniMap = new Map<string, number>();
      attendees.forEach(a => { const u = a.university || 'Unknown'; uniMap.set(u, (uniMap.get(u) || 0) + 1); });
      const universities = Array.from(uniMap.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

      // Faculty breakdown
      const facMap = new Map<string, number>();
      attendees.forEach(a => { const f = a.faculty || 'Unknown'; facMap.set(f, (facMap.get(f) || 0) + 1); });
      const faculties = Array.from(facMap.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

      // Department breakdown
      const deptMap = new Map<string, number>();
      attendees.forEach(a => { const d = a.department || 'Unknown'; deptMap.set(d, (deptMap.get(d) || 0) + 1); });
      const departments = Array.from(deptMap.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

      // Unique check-ins
      const uniqueCheckInIds = new Set(attendance.map(a => a.attendee_id));

      // Day-based stats (only two days)
      const dayMap = new Map<string, any[]>();
      attendance.forEach(a => {
        const date = new Date(a.check_in_time).toISOString().split('T')[0];
        if (!dayMap.has(date)) dayMap.set(date, []);
        dayMap.get(date)!.push(a);
      });
      const sortedDays = Array.from(dayMap.keys()).sort();
      const dayStats = sortedDays.slice(0, 2).map((date, i) => {
        const records = dayMap.get(date)!;
        const dayUniqueIds = new Set(records.map((r: any) => r.attendee_id));
        const dayAsu = records.filter((r: any) => r.attendees?.is_asu_student === true).length;
        const dayNonAsu = records.filter((r: any) => r.attendees?.is_asu_student === false).length;
        // university breakdown for this day
        const dayUniMap = new Map<string, number>();
        records.forEach((r: any) => { const u = r.attendees?.university || 'Unknown'; dayUniMap.set(u, (dayUniMap.get(u) || 0) + 1); });
        const dayUniversities = Array.from(dayUniMap.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
        // faculty breakdown for this day
        const dayFacMap = new Map<string, number>();
        records.forEach((r: any) => { const f = r.attendees?.faculty || 'Unknown'; dayFacMap.set(f, (dayFacMap.get(f) || 0) + 1); });
        const dayFaculties = Array.from(dayFacMap.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

        return { date, label: `Day ${i + 1} — ${new Date(date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}`, checkIns: records.length, uniqueAttendees: dayUniqueIds.size, asuCheckIns: dayAsu, nonAsuCheckIns: dayNonAsu, universities: dayUniversities, faculties: dayFaculties };
      });

      setStatsData({
        totalRegistrations: attendees.length, approvedCount: approved, pendingCount: pending, rejectedCount: rejected,
        asuStudents: asu, nonAsuStudents: nonAsu, paidCount: paid, unpaidCount: unpaid, paymentPendingCount: paymentPending,
        totalCheckIns: attendance.length, uniqueCheckIns: uniqueCheckInIds.size,
        universities, faculties, departments,
        totalCompanies: companiesCountRes.count || 0, totalSessions: sessionsCountRes.count || 0,
        dayStats,
      });
    } catch (err) { console.error('Error fetching statistics:', err); }
    finally { setIsLoadingStatistics(false); }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    if (activeTab === 'sessions') { fetchSessions(); fetchSpeakers(); }
    if (activeTab === 'companies') { fetchCompanies(); }
    if (activeTab === 'jobs') { fetchJobs(); }
    if (activeTab === 'events') { fetchEvents(); }
    if (activeTab === 'statistics') { fetchStatistics(); }
  }, [activeTab, fetchSessions, fetchSpeakers, fetchCompanies, fetchJobs, fetchEvents, fetchStatistics]);

  // ===== UNIQUE COMPANY KEY GENERATION =====
  const generateUniqueCompanyKey = async (): Promise<string> => {
    let key = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 50) {
      const num = Math.floor(Math.random() * 900) + 100; // 100-999
      key = `COMP${num}`;
      const { data } = await supabase
        .from('companies')
        .select('id')
        .eq('company_key', key)
        .maybeSingle();
      if (!data) isUnique = true;
      attempts++;
    }
    return key;
  };

  // ===== OPEN EDIT EVENT =====
  const openEditEvent = (event: AdminEvent) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name || '',
      event_type: event.event_type || '',
      start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
      end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
      status: event.status || 'draft',
      venue_name: event.venue_name || '',
      allow_non_asu_attendees: event.allow_non_asu_attendees || false,
      non_asu_ticket_price: event.non_asu_ticket_price || 0,
    });
    setEventFormError('');
    setShowAddEditEventModal(true);
  };

  // ===== ADD/EDIT EVENT HANDLER =====
  const handleAddEditEvent = async () => {
    if (!eventForm.name.trim()) {
      setEventFormError('Event name is required.');
      return;
    }
    if (!eventForm.start_date || !eventForm.end_date) {
      setEventFormError('Start date and end date are required.');
      return;
    }
    if (new Date(eventForm.start_date) >= new Date(eventForm.end_date)) {
      setEventFormError('End date must be after start date.');
      return;
    }

    setIsSubmittingEvent(true);
    setEventFormError('');

    try {
      const data: any = {
        name: eventForm.name.trim(),
        event_type: eventForm.event_type.trim() || null,
        start_date: new Date(eventForm.start_date).toISOString(),
        end_date: new Date(eventForm.end_date).toISOString(),
        status: eventForm.status,
        venue_name: eventForm.venue_name.trim() || null,
        allow_non_asu_attendees: eventForm.allow_non_asu_attendees,
        non_asu_ticket_price: eventForm.allow_non_asu_attendees ? eventForm.non_asu_ticket_price : 0,
      };

      if (editingEvent) {
        data.updated_at = new Date().toISOString();
        const { error } = await supabase.from('events').update(data).eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert(data);
        if (error) throw error;
      }

      setEventForm({
        name: '', event_type: '', start_date: '', end_date: '',
        status: 'draft', venue_name: '', allow_non_asu_attendees: false, non_asu_ticket_price: 0
      });
      setShowAddEditEventModal(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      console.error('Error saving event:', err);
      setEventFormError(err.message || 'Failed to save event');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // ===== ADD COMPANY HANDLER =====
  const handleAddCompany = async () => {
    if (!companyForm.company_name.trim()) {
      setCompanyFormError('Company name is required.');
      return;
    }

    setIsSubmittingCompany(true);
    setCompanyFormError('');

    try {
      const companyKey = await generateUniqueCompanyKey();

      const insertData: any = {
        event_id: EVENT_ID,
        company_name: companyForm.company_name.trim(),
        company_key: companyKey,
      };

      if (companyForm.industry.trim()) insertData.industry = companyForm.industry.trim();
      if (companyForm.email.trim()) insertData.email = companyForm.email.trim();
      if (companyForm.website.trim()) insertData.website = companyForm.website.trim();
      if (companyForm.description.trim()) insertData.description = companyForm.description.trim();
      if (companyForm.booth_number.trim()) insertData.booth_number = companyForm.booth_number.trim();
      if (companyForm.logo_url.trim()) insertData.logo_url = companyForm.logo_url.trim();
      if (companyForm.partner_type) insertData.partner_type = companyForm.partner_type;

      const { error } = await supabase
        .from('companies')
        .insert(insertData);

      if (error) {
        console.error('Error adding company:', error);
        setCompanyFormError(error.message);
        return;
      }

      // Reset form and close modal
      setCompanyForm({
        company_name: '',
        industry: '',
        email: '',
        website: '',
        description: '',
        booth_number: '',
        logo_url: '',
        partner_type: '',
      });
      setShowAddCompanyModal(false);
      fetchCompanies();
    } catch (err: any) {
      console.error('Error adding company:', err);
      setCompanyFormError(err.message || 'Failed to add company');
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  // ===== COPY COMPANY KEY =====
  const handleCopyKey = (companyId: string, key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKeyId(companyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    });
  };

  // ===== OPEN EDIT COMPANY =====
  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditCompanyForm({
      company_name: company.company_name || '',
      industry: company.industry || '',
      email: company.email || '',
      website: company.website || '',
      description: company.description || '',
      booth_number: company.booth_number || '',
      logo_url: company.logo_url || '',
      partner_type: company.partner_type || '',
    });
    setEditFormError('');
    setShowEditCompanyModal(true);
  };

  // ===== EDIT COMPANY HANDLER =====
  const handleEditCompany = async () => {
    if (!editingCompany) return;
    if (!editCompanyForm.company_name.trim()) {
      setEditFormError('Company name is required.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditFormError('');

    try {
      const updateData: any = {
        company_name: editCompanyForm.company_name.trim(),
        industry: editCompanyForm.industry.trim() || null,
        email: editCompanyForm.email.trim() || null,
        website: editCompanyForm.website.trim() || null,
        description: editCompanyForm.description.trim() || null,
        booth_number: editCompanyForm.booth_number.trim() || null,
        logo_url: editCompanyForm.logo_url.trim() || null,
        partner_type: editCompanyForm.partner_type || null,
      };

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', editingCompany.id);

      if (error) {
        console.error('Error editing company:', error);
        setEditFormError(error.message);
        return;
      }

      setShowEditCompanyModal(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (err: any) {
      console.error('Error editing company:', err);
      setEditFormError(err.message || 'Failed to update company');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ===== DASHBOARD TAB =====
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-red-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <span className="material-symbols-outlined text-9xl text-white transform rotate-12">admin_panel_settings</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome, Admin</h1>
          <p className="text-red-100 text-lg mb-6 max-w-2xl">
            Monitor and manage all aspects of the career fair event from one central hub.
          </p>
          <button
            onClick={() => setShowProfile(true)}
            className="bg-white text-red-600 px-6 py-3 rounded-xl font-semibold hover:bg-red-50 transition-all flex items-center gap-2 shadow-lg"
          >
            <UserCheck className="h-5 w-5" />
            Show Profile
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowAddCompanyModal(true)}
          className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group shadow-md shadow-red-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="font-semibold text-lg">Add Company</span>
          </div>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => setShowAddSessionModal(true)}
          className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group shadow-md shadow-red-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
            <span className="font-semibold text-lg">Add Session</span>
          </div>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => setShowAnnouncementModal(true)}
          className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group shadow-md shadow-red-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Megaphone className="h-6 w-6" />
            </div>
            <span className="font-semibold text-lg">Send Announcement</span>
          </div>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Registrations */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">person_add</span>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-400 text-xs font-bold">Live</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">TOTAL REGISTRATIONS</p>
          <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{dashboardStats.totalAttendees}</div>
          <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Approved</p>
              <p className="text-xl font-bold text-green-600">{dashboardStats.approvedAttendees}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pending</p>
              <p className="text-xl font-bold text-amber-600">{dashboardStats.totalAttendees - dashboardStats.approvedAttendees}</p>
            </div>
          </div>
        </div>

        {/* Today's Entries */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">login</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">TODAY'S CHECK-INS</p>
          <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{dashboardStats.todayEntries}</div>
        </div>

        {/* Companies */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
              <Building2 className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">COMPANIES</p>
          <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{dashboardStats.totalCompanies}</div>
        </div>

        {/* Sessions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
              <Calendar className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">SESSIONS</p>
          <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{dashboardStats.totalSessions}</div>
        </div>
      </div>
    </div>
  );

  // ===== STATISTICS TAB =====
  // Helper: stat card
  const StatCard = ({ label, value, sub, icon, color }: { label: string; value: number | string; sub?: string; icon: string; color: string }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );

  // Helper: breakdown table
  const BreakdownTable = ({ title, data, icon }: { title: string; data: { label: string; count: number }[]; icon: string }) => {
    const total = data.reduce((s, d) => s + d.count, 0);
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500">{icon}</span>
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">{data.length} items</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
          {data.map((item, i) => {
            const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
            return (
              <div key={i} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <span className="text-sm font-medium text-slate-900 dark:text-white flex-1 truncate">{item.label}</span>
                <div className="w-32 bg-slate-100 dark:bg-slate-700 rounded-full h-2 hidden sm:block">
                  <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white w-12 text-right">{item.count}</span>
                <span className="text-sm font-medium text-slate-400 w-14 text-right">{pct}%</span>
              </div>
            );
          })}
          {data.length === 0 && <p className="px-6 py-8 text-center text-sm text-slate-400">No data available</p>}
        </div>
      </div>
    );
  };

  // ===== STATISTICS TAB =====
  const renderStatistics = () => {
    if (isLoadingStatistics || !statsData) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading statistics...</p>
        </div>
      );
    }

    const s = statsData;

    // Filter view data
    const filterData: Record<string, { label: string; count: number }[]> = {
      university: s.universities,
      faculty: s.faculties,
      registration: [
        { label: 'Approved', count: s.approvedCount },
        { label: 'Pending', count: s.pendingCount },
        { label: 'Rejected', count: s.rejectedCount },
      ],
      payment: [
        { label: 'Paid', count: s.paidCount },
        { label: 'Pending', count: s.paymentPendingCount },
        { label: 'Unpaid', count: s.unpaidCount },
      ],
      asu: [
        { label: 'ASU Students', count: s.asuStudents },
        { label: 'Other Universities', count: s.nonAsuStudents },
      ],
    };
    const filterLabels: Record<string, string> = { university: 'University', faculty: 'Faculty', registration: 'Registration Status', payment: 'Payment Status', asu: 'ASU vs Others' };
    const filterIcons: Record<string, string> = { university: 'school', faculty: 'account_balance', registration: 'how_to_reg', payment: 'payments', asu: 'groups' };

    return (
      <div className="space-y-6">
        {/* View Selector */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-200 dark:border-slate-700 inline-flex gap-2">
          {(['general', 'filter', 'day'] as const).map(v => (
            <button key={v} onClick={() => setStatisticsView(v)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${statisticsView === v ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              {v === 'general' ? 'General Analytics' : v === 'filter' ? 'By Filter' : 'By Day'}
            </button>
          ))}
        </div>

        {/* ===== GENERAL VIEW ===== */}
        {statisticsView === 'general' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Overview Cards — 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Registrations" value={s.totalRegistrations} icon="people" color="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" />
              <StatCard label="Approved" value={s.approvedCount} sub={`${s.totalRegistrations > 0 ? ((s.approvedCount / s.totalRegistrations) * 100).toFixed(0) : 0}%`} icon="check_circle" color="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" />
              <StatCard label="Pending" value={s.pendingCount} icon="schedule" color="bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" />
              <StatCard label="Rejected" value={s.rejectedCount} icon="cancel" color="bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400" />
            </div>

            {/* Second row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Check-ins" value={s.totalCheckIns} sub={`${s.uniqueCheckIns} unique`} icon="login" color="bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />
              <StatCard label="ASU Students" value={s.asuStudents} icon="school" color="bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" />
              <StatCard label="Other Universities" value={s.nonAsuStudents} icon="domain" color="bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" />
              <StatCard label="Paid" value={s.paidCount} icon="paid" color="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" />
            </div>

            {/* Third row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Companies" value={s.totalCompanies} icon="business" color="bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" />
              <StatCard label="Sessions" value={s.totalSessions} icon="event" color="bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400" />
            </div>

            {/* University + Faculty breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BreakdownTable title="Universities" data={s.universities} icon="school" />
              <BreakdownTable title="Faculties" data={s.faculties} icon="account_balance" />
            </div>
          </motion.div>
        )}

        {/* ===== FILTER VIEW ===== */}
        {statisticsView === 'filter' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Filter Category Chips */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(filterLabels) as Array<keyof typeof filterLabels>).map(key => (
                <button key={key} onClick={() => setStatsFilterCategory(key as any)}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${statsFilterCategory === key
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-red-300'}`}>
                  <span className="material-symbols-outlined text-base">{filterIcons[key]}</span>
                  {filterLabels[key]}
                </button>
              ))}
            </div>

            {/* Filtered Results */}
            <BreakdownTable title={`Breakdown by ${filterLabels[statsFilterCategory]}`} data={filterData[statsFilterCategory] || []} icon={filterIcons[statsFilterCategory]} />

            {/* Summary card */}
            {(() => {
              const currentData = filterData[statsFilterCategory] || [];
              const total = currentData.reduce((sum, d) => sum + d.count, 0);
              const topItem = currentData.length > 0 ? currentData[0] : null;
              const topPct = topItem && total > 0 ? ((topItem.count / total) * 100).toFixed(1) : '0';
              const colors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-sky-500', 'bg-pink-500', 'bg-indigo-500'];
              return (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500">insights</span>
                    <h3 className="font-bold text-slate-900 dark:text-white">Summary — {filterLabels[statsFilterCategory]}</h3>
                  </div>

                  <div className="p-6">
                    {/* Metric cards row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {/* Total */}
                      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">functions</span>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total</span>
                        </div>
                        <p className="text-4xl font-extrabold text-blue-700 dark:text-blue-300">{total}</p>
                      </div>

                      {/* Highest */}
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-sm">trending_up</span>
                          </div>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Top</span>
                        </div>
                        <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 truncate">{topItem?.label || '—'}</p>
                        <p className="text-sm text-emerald-500 mt-0.5">{topItem ? `${topItem.count} (${topPct}%)` : ''}</p>
                      </div>
                    </div>

                    {/* Distribution bar */}
                    {currentData.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Distribution</p>
                        <div className="flex h-4 rounded-full overflow-hidden mb-3">
                          {currentData.map((item, i) => (
                            <div key={i} className={`${colors[i % colors.length]} transition-all`} style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }} title={`${item.label}: ${item.count}`} />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {currentData.slice(0, 6).map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <div className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                              <span className="text-xs text-slate-600 dark:text-slate-400">{item.label} <span className="font-semibold text-slate-900 dark:text-white">({item.count})</span></span>
                            </div>
                          ))}
                          {currentData.length > 6 && <span className="text-xs text-slate-400">+{currentData.length - 6} more</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )
        }

        {/* ===== BY DAY VIEW ===== */}
        {
          statisticsView === 'day' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Day Selector — exactly 2 days */}
              <div className="flex gap-3 flex-wrap">
                {s.dayStats.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 w-full text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-3">event_busy</span>
                    <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No check-in data yet</p>
                    <p className="text-sm text-slate-500 mt-1">Check-in statistics will appear here once attendees start checking in.</p>
                  </div>
                ) : (
                  <>
                    {s.dayStats.map((day, i) => (
                      <button key={day.date} onClick={() => setSelectedDay(i + 1)}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${selectedDay === i + 1
                          ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-red-300'}`}>
                        <span className="material-symbols-outlined text-base">calendar_today</span>
                        {day.label}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Selected Day Stats */}
              {s.dayStats.length > 0 && (() => {
                const dayIndex = Math.min(selectedDay - 1, s.dayStats.length - 1);
                const day = s.dayStats[dayIndex];
                return (
                  <div className="space-y-6">
                    {/* Day overview cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <StatCard label="Total Check-ins" value={day.checkIns} icon="login" color="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" />
                      <StatCard label="Unique Attendees" value={day.uniqueAttendees} icon="badge" color="bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />
                      <StatCard label="ASU Check-ins" value={day.asuCheckIns} icon="school" color="bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" />
                      <StatCard label="Other Uni Check-ins" value={day.nonAsuCheckIns} icon="domain" color="bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" />
                    </div>

                    {/* Day breakdowns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <BreakdownTable title={`${day.label} — Universities`} data={day.universities} icon="school" />
                      <BreakdownTable title={`${day.label} — Faculties`} data={day.faculties} icon="account_balance" />
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )
        }
      </div >
    );
  };


  // ===== SESSIONS TAB =====
  const renderSessions = () => (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sessions</h2>
        <button
          onClick={() => setShowAddSessionModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md shadow-red-500/20"
        >
          <Plus className="h-5 w-5" />
          Add Session
        </button>
      </div>

      {/* Sessions Grid */}
      {isLoadingSessions ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No sessions yet</p>
          <p className="text-sm text-slate-500 mt-1">Click "Add Session" to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const speakerName = session.speaker ? `${session.speaker.first_name} ${session.speaker.last_name}` : 'TBD';
            const startDate = new Date(session.start_time);
            const endDate = new Date(session.end_time);
            const timeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            const dateStr = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
            return (
              <motion.div
                key={session.id}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${SESSION_TYPE_COLORS[session.session_type] || SESSION_TYPE_COLORS.other}`}>
                    {session.session_type}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{dateStr}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{session.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Users className="w-4 h-4" /> {speakerName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {timeStr}
                </p>
                <div className="flex items-center justify-between text-sm pt-4 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">{session.room_name || 'No room'}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {session.current_bookings}/{session.max_attendees || '∞'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ===== EVENTS TAB =====
  const filteredEvents = events.filter((e) => {
    if (!eventSearchQuery.trim()) return true;
    const q = eventSearchQuery.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.event_type && e.event_type.toLowerCase().includes(q)) ||
      (e.venue_name && e.venue_name.toLowerCase().includes(q))
    );
  });

  const activeEventsCount = events.filter(e => e.status === 'published' && new Date(e.end_date) >= new Date()).length;
  const upcomingEventsCount = events.filter(e => new Date(e.start_date) > new Date()).length;

  const renderEvents = () => (
    <motion.div
      key="events"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Events</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage all events and career fairs</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-red-500 shadow-sm dark:text-white"
              placeholder="Search events..."
              type="text"
              value={eventSearchQuery}
              onChange={(e) => setEventSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setEditingEvent(null);
              setEventForm({
                name: '', event_type: '', start_date: '', end_date: '',
                status: 'draft', venue_name: '', allow_non_asu_attendees: false, non_asu_ticket_price: 0
              });
              setEventFormError('');
              setShowAddEditEventModal(true);
            }}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/20"
          >
            <Plus className="h-5 w-5" />
            Add Event
          </button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      {events.length > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Events</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{events.length}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active/Published</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{activeEventsCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upcoming</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{upcomingEventsCount}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoadingEvents ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700 mb-4 block">event_busy</span>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No events found</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Create an event to get started</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700 mb-4 block">search_off</span>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No events match your search</p>
        </div>
      ) : (
        /* Events Grid */
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event, index) => {
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);
            const isOngoing = startDate <= new Date() && endDate >= new Date();
            const isUpcoming = startDate > new Date();

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index, duration: 0.3 }}
                whileHover={{ y: -5 }}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventDetailModal(true);
                }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full"
              >
                <div className="space-y-4">
                  {/* Top Row: Icon + Status Badges */}
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${isOngoing ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      isUpcoming ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400'
                      }`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${event.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        event.status === 'archived' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                        {event.status}
                      </span>
                      {event.event_type && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1).replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white leading-tight group-hover:text-red-600 transition-colors line-clamp-2">
                    {event.name}
                  </h3>

                  {/* Meta Details */}
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                      <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <div className="flex flex-col">
                        <span>{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-xs text-slate-500">
                          {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} to {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {event.venue_name && (
                      <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{event.venue_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                      <Users className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{event.allow_non_asu_attendees ? `Public (Non-ASU: ${event.non_asu_ticket_price} EGP)` : 'ASU Students Only'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );

  // ===== EVENT DETAIL MODAL =====
  const renderEventDetailModal = () => (
    <AnimatePresence>
      {showEventDetailModal && selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEventDetailModal(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-red-600 to-red-800 px-8 pt-10 pb-12">
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowEventDetailModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
              >
                <X className="w-5 h-5" />
              </motion.button>

              <div className="flex gap-4 items-start">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg shrink-0">
                  <Calendar className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${selectedEvent.status === 'published' ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30' :
                      selectedEvent.status === 'archived' ? 'bg-slate-500/20 text-slate-200 border border-slate-500/30' :
                        'bg-amber-500/20 text-amber-100 border border-amber-500/30'
                      }`}>
                      {selectedEvent.status}
                    </span>
                    {selectedEvent.event_type && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                        {selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1).replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-3xl font-bold text-white leading-tight">{selectedEvent.name}</h3>
                </div>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Start</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedEvent.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {new Date(selectedEvent.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">End</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedEvent.end_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {new Date(selectedEvent.end_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Venue & Location</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedEvent.venue_name || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <Users className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Attendance Rules</p>
                    {selectedEvent.allow_non_asu_attendees ? (
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Open to ASU students and external attendees.</p>
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                          Non-ASU Ticket Price: {selectedEvent.non_asu_ticket_price} EGP
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Restricted to ASU students only.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                <button
                  onClick={() => setShowEventDetailModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowEventDetailModal(false);
                    openEditEvent(selectedEvent);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Event
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ===== ADD/EDIT EVENT MODAL =====
  const renderAddEditEventModal = () => (
    <AnimatePresence>
      {showAddEditEventModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isSubmittingEvent && setShowAddEditEventModal(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </h2>
              <button
                onClick={() => !isSubmittingEvent && setShowAddEditEventModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
              {eventFormError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800/30">
                  {eventFormError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Event Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={eventForm.name}
                    onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                    placeholder="e.g., Annual Career Fair 2026"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Event Type</label>
                  <input
                    type="text"
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                    placeholder="e.g., career_fair"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 transition-all outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Venue Name</label>
                  <input
                    type="text"
                    value={eventForm.venue_name}
                    onChange={(e) => setEventForm({ ...eventForm, venue_name: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 transition-all outline-none"
                    placeholder="e.g., Main Campus Expo Hall"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Start Date & Time <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">End Date & Time <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={eventForm.end_date}
                    onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 transition-all outline-none"
                  />
                </div>

                <div className="space-y-4 md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">Allow Non-ASU Attendees</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Toggle to open event registration to external attendees</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={eventForm.allow_non_asu_attendees}
                        onChange={(e) => setEventForm({ ...eventForm, allow_non_asu_attendees: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {eventForm.allow_non_asu_attendees && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ticket Price (EGP)</label>
                      <input
                        type="number"
                        min="0"
                        value={eventForm.non_asu_ticket_price}
                        onChange={(e) => setEventForm({ ...eventForm, non_asu_ticket_price: parseInt(e.target.value) || 0 })}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 transition-all outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowAddEditEventModal(false)}
                disabled={isSubmittingEvent}
                className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddEditEvent}
                disabled={isSubmittingEvent}
                className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-red-500/20"
              >
                {isSubmittingEvent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {editingEvent ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ===== COMPANIES TAB =====
  const filteredCompanies = companies.filter((c) => {
    if (!companySearchQuery.trim()) return true;
    const q = companySearchQuery.toLowerCase();
    return (
      c.company_name.toLowerCase().includes(q) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      (c.company_key && c.company_key.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const renderCompanies = () => (
    <motion.div
      key="companies"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      {/* Header with Add Button */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Companies</h2>
        <button
          onClick={() => setShowAddCompanyModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md shadow-red-500/20"
        >
          <Plus className="h-5 w-5" />
          Add Company
        </button>
      </motion.div>

      {/* Search Bar */}
      {companies.length > 0 && (
        <motion.div variants={itemVariants} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, industry, key, or email..."
            value={companySearchQuery}
            onChange={(e) => setCompanySearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
          />
          {companySearchQuery && (
            <button
              onClick={() => setCompanySearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </motion.div>
      )}

      {/* Content */}
      {isLoadingCompanies ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading companies...</p>
        </div>
      ) : companies.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No companies added yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 mb-6">Click "Add Company" to get started</p>
          <button
            onClick={() => setShowAddCompanyModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition-all shadow-md shadow-red-500/20"
          >
            <Plus className="h-5 w-5" />
            Add Company
          </button>
        </motion.div>
      ) : filteredCompanies.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Search className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No companies match your search</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Try a different search term</p>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <motion.div
              key={company.id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              onClick={() => {
                setSelectedCompany(company);
                setShowViewCompanyModal(true);
              }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all cursor-pointer group"
            >
              {/* Company Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/10 flex items-center justify-center shrink-0">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <Building2 className="w-7 h-7 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 truncate">
                    {company.company_name}
                  </h3>
                  {company.industry && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{company.industry}</p>
                  )}
                </div>
              </div>

              {/* Partner Type Badge */}
              {company.partner_type && (
                <div className="mb-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${PARTNER_TYPE_COLORS[company.partner_type] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {company.partner_type}
                  </span>
                </div>
              )}

              {/* Company Key with Copy Button */}
              {company.company_key && (
                <div className="flex items-center justify-between mb-4 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{company.company_key}</span>
                  </div>
                  <button
                    onClick={() => handleCopyKey(company.id, company.company_key!)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Copy company key"
                  >
                    {copiedKeyId === company.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                    )}
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                {company.booth_number ? (
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Booth {company.booth_number}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-500">No booth assigned</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditCompany(company);
                  }}
                  className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1.5 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );

  // ===== JOBS TAB =====
  const filteredJobs = jobs.filter((job) => {
    const q = jobSearchQuery.toLowerCase();
    if (!q) return true;
    return (
      job.title.toLowerCase().includes(q) ||
      (job.company_name || '').toLowerCase().includes(q) ||
      (job.location || '').toLowerCase().includes(q) ||
      (job.job_type || '').toLowerCase().includes(q)
    );
  });

  const totalApplicants = jobs.reduce((sum, job) => sum + job.no_of_applicants, 0);
  const activeJobs = jobs.filter(j => j.is_active).length;

  const renderJobs = () => (
    <motion.div
      key="jobs"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Job Opportunities</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage all job postings across companies</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-red-500 shadow-sm dark:text-white"
              placeholder="Search jobs, companies..."
              type="text"
              value={jobSearchQuery}
              onChange={(e) => setJobSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* Stats Bar */}
      {jobs.length > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Jobs</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{jobs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeJobs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Applications</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalApplicants}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoadingJobs ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading jobs...</p>
        </div>

      ) : jobs.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700 mb-4 block">work_off</span>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No jobs posted yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Job postings from companies will appear here</p>
        </div>

      ) : filteredJobs.length === 0 ? (
        /* No Search Results */
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700 mb-4 block">search_off</span>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No jobs match your search</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Try a different keyword</p>
        </div>

      ) : (
        /* Jobs Grid */
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index, duration: 0.3 }}
              whileHover={{ y: -5 }}
              onClick={() => {
                setSelectedJob(job);
                setShowJobDetailModal(true);
              }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full"
            >
              <div className="space-y-4">
                {/* Top Row: Company Logo + Badges */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {job.company_logo ? (
                      <img src={job.company_logo} alt={job.company_name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{job.company_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!job.is_active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">Inactive</span>
                    )}
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${JOB_TYPE_COLORS[job.job_type] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {job.job_type ? job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1).replace('-', ' ') : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight group-hover:text-red-600 transition-colors">{job.title}</h3>

                {/* Meta Info */}
                <div className="space-y-1.5">
                  {job.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">apartment</span>
                      {job.employment_mode ? job.employment_mode.charAt(0).toUpperCase() + job.employment_mode.slice(1).replace('-', ' ') : 'N/A'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      {job.experience_level ? job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {job.no_of_applicants} applicant{job.no_of_applicants !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );

  // ===== JOB DETAIL MODAL =====
  const renderJobDetailModal = () => (
    <AnimatePresence>
      {showJobDetailModal && selectedJob && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowJobDetailModal(false)}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Gradient */}
            <div className="relative bg-gradient-to-r from-red-600 to-red-500 px-8 pt-8 pb-14">
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowJobDetailModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
              >
                <X className="w-5 h-5" />
              </motion.button>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-red-200 text-sm font-semibold uppercase tracking-wider mb-1">{selectedJob.company_name}</p>
                <h3 className="text-2xl font-bold text-white">{selectedJob.title}</h3>
              </motion.div>

              {/* Icon */}
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.15, type: "spring" }}
                className="absolute -bottom-8 right-8"
              >
                {selectedJob.company_logo ? (
                  <img src={selectedJob.company_logo} alt={selectedJob.company_name} className="w-16 h-16 rounded-2xl border-4 border-white dark:border-slate-900 object-cover shadow-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg">
                    <Building2 className="w-8 h-8 text-red-600" />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-8 pt-12 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {/* Metadata Chips */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap gap-2"
              >
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${JOB_TYPE_COLORS[selectedJob.job_type] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {selectedJob.job_type ? selectedJob.job_type.charAt(0).toUpperCase() + selectedJob.job_type.slice(1).replace('-', ' ') : 'N/A'}
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">apartment</span>
                  {selectedJob.employment_mode ? selectedJob.employment_mode.charAt(0).toUpperCase() + selectedJob.employment_mode.slice(1).replace('-', ' ') : 'N/A'}
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  {selectedJob.experience_level ? selectedJob.experience_level.charAt(0).toUpperCase() + selectedJob.experience_level.slice(1) : 'N/A'}
                </span>
                {selectedJob.location && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedJob.location}
                  </span>
                )}
                {!selectedJob.is_active && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Inactive</span>
                )}
              </motion.div>

              {/* Posted date */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Posted {new Date(selectedJob.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </motion.p>

              {/* Description */}
              {selectedJob.description && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5"
                >
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
                </motion.div>
              )}

              {/* Required Skills */}
              {selectedJob.required_skills && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.required_skills.split(',').map((skill, i) => (
                      <span key={i} className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800/30">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Applicants Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedJob.no_of_applicants} Applicant{selectedJob.no_of_applicants !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">People who applied for this job</p>
                  </div>
                </div>
                {selectedJob.no_of_applicants > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowJobDetailModal(false);
                      setShowJobApplicantsModal(true);
                    }}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-red-600/20"
                  >
                    <Eye className="w-4 h-4" />
                    View Applicants
                  </motion.button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ===== SIMPLE MODALS (Placeholder for non-company modals) =====
  const SimpleModal: React.FC<{ show: boolean; onClose: () => void; title: string }> = ({
    show,
    onClose,
    title
  }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This modal is a placeholder. Add your form content here.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===== ADD COMPANY MODAL =====
  const renderAddCompanyModal = () => {
    if (!showAddCompanyModal) return null;

    const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddCompanyModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Company</h3>
              </div>
              <button
                onClick={() => setShowAddCompanyModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <div className="px-8 py-6 space-y-5">
              {companyFormError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300"
                >
                  {companyFormError}
                </motion.div>
              )}

              {/* Company Name */}
              <div>
                <label className={labelClass}>Company Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Acme Corporation"
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                />
              </div>

              {/* Two Column Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Industry</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Technology, Finance"
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Partner Type</label>
                  <select
                    className={inputClass}
                    value={companyForm.partner_type}
                    onChange={(e) => setCompanyForm({ ...companyForm, partner_type: e.target.value })}
                  >
                    <option value="">Select partner type</option>
                    {PARTNER_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      className={`${inputClass} pl-10`}
                      placeholder="company@email.com"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      className={`${inputClass} pl-10`}
                      placeholder="https://example.com"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Booth Number & Logo URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Booth Number</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      className={`${inputClass} pl-10`}
                      placeholder="e.g. A12"
                      value={companyForm.booth_number}
                      onChange={(e) => setCompanyForm({ ...companyForm, booth_number: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Logo URL</label>
                  <input
                    type="url"
                    className={inputClass}
                    placeholder="https://example.com/logo.png"
                    value={companyForm.logo_url}
                    onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Brief description of the company..."
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                />
              </div>

              {/* Auto-generated company key note */}
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <Key className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  A unique <span className="font-mono font-bold">COMP###</span> key will be auto-generated for this company.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowAddCompanyModal(false)}
                className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                disabled={isSubmittingCompany}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCompany}
                disabled={isSubmittingCompany}
                className="px-6 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-red-500/20"
              >
                {isSubmittingCompany ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Company
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // ===== VIEW COMPANY DETAILS MODAL =====
  const renderViewCompanyModal = () => {
    if (!showViewCompanyModal || !selectedCompany) return null;

    const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => {
      if (!value) return null;
      return (
        <div className="flex items-start gap-3 py-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm text-slate-900 dark:text-white break-words">{value}</p>
          </div>
        </div>
      );
    };

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowViewCompanyModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Company Details</h3>
              <button
                onClick={() => setShowViewCompanyModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="px-8 py-6">
              {/* Company Identity */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/10 flex items-center justify-center shrink-0">
                  {selectedCompany.logo_url ? (
                    <img
                      src={selectedCompany.logo_url}
                      alt={selectedCompany.company_name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                    {selectedCompany.company_name}
                  </h4>
                  {selectedCompany.partner_type && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide inline-block mt-1 ${PARTNER_TYPE_COLORS[selectedCompany.partner_type] || 'bg-slate-100 text-slate-600'}`}>
                      {selectedCompany.partner_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Company Key - Highlighted with Copy */}
              {selectedCompany.company_key && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Company Key</p>
                        <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{selectedCompany.company_key}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyKey(selectedCompany.id, selectedCompany.company_key!)}
                      className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 border border-red-200 dark:border-red-700 transition-all"
                      title="Copy company key"
                    >
                      {copiedKeyId === selectedCompany.id ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                <DetailRow icon={Building2} label="Industry" value={selectedCompany.industry} />
                <DetailRow icon={Mail} label="Email" value={selectedCompany.email} />
                <DetailRow icon={Globe} label="Website" value={selectedCompany.website} />
                <DetailRow icon={MapPin} label="Booth Number" value={selectedCompany.booth_number} />
              </div>

              {/* Description */}
              {selectedCompany.description && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedCompany.description}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-between rounded-b-2xl">
              <button
                onClick={() => {
                  setShowViewCompanyModal(false);
                  openEditCompany(selectedCompany);
                }}
                className="px-6 py-3 rounded-xl font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Company
              </button>
              <button
                onClick={() => setShowViewCompanyModal(false)}
                className="px-6 py-3 rounded-xl font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // ===== EDIT COMPANY MODAL =====
  const renderEditCompanyModal = () => {
    if (!showEditCompanyModal || !editingCompany) return null;

    const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEditCompanyModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Company</h3>
              </div>
              <button
                onClick={() => setShowEditCompanyModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <div className="px-8 py-6 space-y-5">
              {editFormError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300"
                >
                  {editFormError}
                </motion.div>
              )}

              {/* Company Key - Read only */}
              {editingCompany.company_key && (
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">Key:</span>
                    <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{editingCompany.company_key}</span>
                  </div>
                  <button
                    onClick={() => handleCopyKey(editingCompany.id, editingCompany.company_key!)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Copy company key"
                  >
                    {copiedKeyId === editingCompany.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              )}

              {/* Company Name */}
              <div>
                <label className={labelClass}>Company Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Acme Corporation"
                  value={editCompanyForm.company_name}
                  onChange={(e) => setEditCompanyForm({ ...editCompanyForm, company_name: e.target.value })}
                />
              </div>

              {/* Two Column Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Industry</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Technology, Finance"
                    value={editCompanyForm.industry}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, industry: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Partner Type</label>
                  <select
                    className={inputClass}
                    value={editCompanyForm.partner_type}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, partner_type: e.target.value })}
                  >
                    <option value="">Select partner type</option>
                    {PARTNER_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      className={`${inputClass} pl-10`}
                      placeholder="company@email.com"
                      value={editCompanyForm.email}
                      onChange={(e) => setEditCompanyForm({ ...editCompanyForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      className={`${inputClass} pl-10`}
                      placeholder="https://example.com"
                      value={editCompanyForm.website}
                      onChange={(e) => setEditCompanyForm({ ...editCompanyForm, website: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Booth Number & Logo URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Booth Number</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      className={`${inputClass} pl-10`}
                      placeholder="e.g. A12"
                      value={editCompanyForm.booth_number}
                      onChange={(e) => setEditCompanyForm({ ...editCompanyForm, booth_number: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Logo URL</label>
                  <input
                    type="url"
                    className={inputClass}
                    placeholder="https://example.com/logo.png"
                    value={editCompanyForm.logo_url}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, logo_url: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Brief description of the company..."
                  value={editCompanyForm.description}
                  onChange={(e) => setEditCompanyForm({ ...editCompanyForm, description: e.target.value })}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowEditCompanyModal(false)}
                className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                disabled={isSubmittingEdit}
              >
                Cancel
              </button>
              <button
                onClick={handleEditCompany}
                disabled={isSubmittingEdit}
                className="px-6 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-red-500/20"
              >
                {isSubmittingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // ===== ADD SESSION HANDLER =====
  const handleAddSession = async () => {
    if (!sessionForm.title.trim()) { setSessionFormError('Title is required.'); return; }
    if (!sessionForm.start_time || !sessionForm.end_time) { setSessionFormError('Start and end times are required.'); return; }
    if (!useNewSpeaker && !sessionForm.speaker_id) { setSessionFormError('Please select a speaker or create a new one.'); return; }
    if (useNewSpeaker && (!sessionForm.new_speaker_first_name.trim() || !sessionForm.new_speaker_last_name.trim() || !sessionForm.new_speaker_title.trim())) {
      setSessionFormError('Speaker first name, last name and title are required.'); return;
    }
    setIsSubmittingSession(true); setSessionFormError('');
    try {
      let speakerId = sessionForm.speaker_id;
      if (useNewSpeaker) {
        const { data: newSpeaker, error: speakerErr } = await supabase.from('speaker').insert({
          first_name: sessionForm.new_speaker_first_name.trim(),
          last_name: sessionForm.new_speaker_last_name.trim(),
          title: sessionForm.new_speaker_title.trim(),
          linkedin_url: sessionForm.new_speaker_linkedin.trim() || null,
          photo_url: sessionForm.new_speaker_photo.trim() || null,
        }).select().single();
        if (speakerErr) { setSessionFormError(speakerErr.message); return; }
        speakerId = newSpeaker.id;
      }
      const insertData: any = {
        event_id: EVENT_ID, title: sessionForm.title.trim(), speaker_id: speakerId,
        session_type: sessionForm.session_type, status: sessionForm.status,
        start_time: new Date(sessionForm.start_time).toISOString(),
        end_time: new Date(sessionForm.end_time).toISOString(),
        requires_booking: sessionForm.requires_booking,
      };
      if (sessionForm.description.trim()) insertData.description = sessionForm.description.trim();
      if (sessionForm.room_name.trim()) insertData.room_name = sessionForm.room_name.trim();
      if (sessionForm.max_attendees) insertData.max_attendees = parseInt(sessionForm.max_attendees);
      const { error } = await supabase.from('sessions').insert(insertData);
      if (error) { setSessionFormError(error.message); return; }
      setSessionForm({ title: '', description: '', session_type: 'workshop', speaker_id: '', start_time: '', end_time: '', room_name: '', max_attendees: '', requires_booking: false, status: 'scheduled', new_speaker_first_name: '', new_speaker_last_name: '', new_speaker_title: '', new_speaker_linkedin: '', new_speaker_photo: '' });
      setUseNewSpeaker(false); setShowAddSessionModal(false);
      fetchSessions(); fetchSpeakers(); fetchDashboardStats();
    } catch (err: any) { setSessionFormError(err.message || 'Failed to add session'); }
    finally { setIsSubmittingSession(false); }
  };

  // ===== SEARCH USERS FOR ANNOUNCEMENT =====
  const searchUsers = async (query: string) => {
    if (query.length < 2) { setIndividualResults([]); return; }
    setIsSearchingUsers(true);
    try {
      const { data } = await supabase.from('user_profiles').select('id, full_name, phone, personal_id, email')
        .or(`full_name.ilike.%${query}%,personal_id.ilike.%${query}%`).limit(10);
      setIndividualResults(data || []);
    } catch (err) { console.error(err); }
    finally { setIsSearchingUsers(false); }
  };

  // ===== SEND ANNOUNCEMENT HANDLER =====
  const handleSendAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) { setAnnouncementFormError('Title and content are required.'); return; }
    if (announcementTargets.length === 0 && !selectedIndividual) { setAnnouncementFormError('Select at least one target audience.'); return; }
    setIsSubmittingAnnouncement(true); setAnnouncementFormError('');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { setAnnouncementFormError('Not authenticated'); return; }
      const insertData: any = {
        event_id: EVENT_ID, title: announcementForm.title.trim(),
        content: announcementForm.content.trim(),
        announcement_type: announcementForm.announcement_type,
        sender_id: currentUser.id,
      };
      if (selectedIndividual) {
        insertData.target_roles = ['individual'];
        insertData.target_user_id = selectedIndividual.id;
      } else {
        insertData.target_roles = announcementTargets;
      }
      const { error } = await supabase.from('notifications').insert(insertData);
      if (error) { setAnnouncementFormError(error.message); return; }
      setAnnouncementForm({ title: '', content: '', announcement_type: 'general' });
      setAnnouncementTargets([]); setSelectedIndividual(null); setIndividualSearch(''); setIndividualResults([]);
      setShowAnnouncementModal(false);
    } catch (err: any) { setAnnouncementFormError(err.message || 'Failed to send announcement'); }
    finally { setIsSubmittingAnnouncement(false); }
  };

  // ===== ADD SESSION MODAL =====
  const renderAddSessionModal = () => {
    if (!showAddSessionModal) return null;
    const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddSessionModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><Calendar className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Session</h3>
              </div>
              <button onClick={() => setShowAddSessionModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-500 dark:text-slate-400" /></button>
            </div>
            <div className="px-8 py-6 space-y-5">
              {sessionFormError && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">{sessionFormError}</motion.div>}
              <div><label className={labelClass}>Title *</label><input type="text" className={inputClass} placeholder="e.g. Career Growth Panel" value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className={labelClass}>Session Type</label><select className={inputClass} value={sessionForm.session_type} onChange={(e) => setSessionForm({ ...sessionForm, session_type: e.target.value })}>{SESSION_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
                <div><label className={labelClass}>Status</label><select className={inputClass} value={sessionForm.status} onChange={(e) => setSessionForm({ ...sessionForm, status: e.target.value })}>{SESSION_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Speaker *</label>
                  <button type="button" onClick={() => setUseNewSpeaker(!useNewSpeaker)} className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline">{useNewSpeaker ? 'Select Existing' : '+ New Speaker'}</button>
                </div>
                {!useNewSpeaker ? (
                  <select className={inputClass} value={sessionForm.speaker_id} onChange={(e) => setSessionForm({ ...sessionForm, speaker_id: e.target.value })}>
                    <option value="">Select a speaker...</option>
                    {speakers.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.title}</option>)}
                  </select>
                ) : (
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" className={inputClass} placeholder="First Name *" value={sessionForm.new_speaker_first_name} onChange={(e) => setSessionForm({ ...sessionForm, new_speaker_first_name: e.target.value })} />
                      <input type="text" className={inputClass} placeholder="Last Name *" value={sessionForm.new_speaker_last_name} onChange={(e) => setSessionForm({ ...sessionForm, new_speaker_last_name: e.target.value })} />
                    </div>
                    <input type="text" className={inputClass} placeholder="Title/Position *" value={sessionForm.new_speaker_title} onChange={(e) => setSessionForm({ ...sessionForm, new_speaker_title: e.target.value })} />
                    <input type="url" className={inputClass} placeholder="LinkedIn URL (optional)" value={sessionForm.new_speaker_linkedin} onChange={(e) => setSessionForm({ ...sessionForm, new_speaker_linkedin: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className={labelClass}>Start Time *</label><input type="datetime-local" className={inputClass} value={sessionForm.start_time} onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })} /></div>
                <div><label className={labelClass}>End Time *</label><input type="datetime-local" className={inputClass} value={sessionForm.end_time} onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className={labelClass}>Room Name</label><input type="text" className={inputClass} placeholder="e.g. Hall A" value={sessionForm.room_name} onChange={(e) => setSessionForm({ ...sessionForm, room_name: e.target.value })} /></div>
                <div><label className={labelClass}>Max Attendees</label><input type="number" className={inputClass} placeholder="e.g. 100" value={sessionForm.max_attendees} onChange={(e) => setSessionForm({ ...sessionForm, max_attendees: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="requires_booking" checked={sessionForm.requires_booking} onChange={(e) => setSessionForm({ ...sessionForm, requires_booking: e.target.checked })} className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500" />
                <label htmlFor="requires_booking" className="text-sm text-slate-700 dark:text-slate-300">Requires Booking</label>
              </div>
              <div><label className={labelClass}>Description</label><textarea className={`${inputClass} resize-none`} rows={3} placeholder="Brief description..." value={sessionForm.description} onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })} /></div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowAddSessionModal(false)} className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" disabled={isSubmittingSession}>Cancel</button>
              <button onClick={handleAddSession} disabled={isSubmittingSession} className="px-6 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-red-500/20">
                {isSubmittingSession ? (<><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>) : (<><Plus className="w-4 h-4" /> Add Session</>)}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // ===== SEND ANNOUNCEMENT MODAL =====
  const renderAnnouncementModal = () => {
    if (!showAnnouncementModal) return null;
    const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";
    const targetOptions = [
      { key: 'team_leader', label: 'Team Leaders', icon: 'supervisor_account' },
      { key: 'volunteer', label: 'Volunteers', icon: 'volunteer_activism' },
      { key: 'attendee', label: 'Attendees', icon: 'people' },
    ];
    const toggleTarget = (t: string) => {
      setSelectedIndividual(null);
      setAnnouncementTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    };

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAnnouncementModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><Megaphone className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Send Announcement</h3>
              </div>
              <button onClick={() => setShowAnnouncementModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-500 dark:text-slate-400" /></button>
            </div>
            <div className="px-8 py-6 space-y-5">
              {announcementFormError && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">{announcementFormError}</motion.div>}
              <div><label className={labelClass}>Title *</label><input type="text" className={inputClass} placeholder="Announcement title" value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} /></div>
              <div><label className={labelClass}>Content *</label><textarea className={`${inputClass} resize-none`} rows={4} placeholder="Announcement content..." value={announcementForm.content} onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })} /></div>
              <div><label className={labelClass}>Type</label><select className={inputClass} value={announcementForm.announcement_type} onChange={(e) => setAnnouncementForm({ ...announcementForm, announcement_type: e.target.value })}>{ANNOUNCEMENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
              <div>
                <label className={labelClass}>Target Audience *</label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {targetOptions.map(opt => (
                    <button key={opt.key} type="button" onClick={() => toggleTarget(opt.key)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${announcementTargets.includes(opt.key) && !selectedIndividual
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300'}`}>
                      <span className="material-symbols-outlined text-xl block mb-1">{opt.icon}</span>
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Or send to an individual</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" className={`${inputClass} pl-10`} placeholder="Search by name or personal ID..." value={individualSearch}
                      onChange={(e) => { setIndividualSearch(e.target.value); searchUsers(e.target.value); }} />
                  </div>
                  {selectedIndividual && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400">person</span>
                      <span className="text-sm font-semibold text-red-700 dark:text-red-300 flex-1">{selectedIndividual.full_name}</span>
                      <button onClick={() => { setSelectedIndividual(null); setAnnouncementTargets([]); }} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-800"><X className="w-4 h-4 text-red-500" /></button>
                    </div>
                  )}
                  {!selectedIndividual && individualResults.length > 0 && (
                    <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl max-h-40 overflow-y-auto">
                      {individualResults.map(u => (
                        <button key={u.id} type="button" onClick={() => { setSelectedIndividual(u); setAnnouncementTargets([]); setIndividualResults([]); setIndividualSearch(''); }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <span className="material-symbols-outlined text-slate-400">person</span>
                          <div><p className="text-sm font-semibold text-slate-900 dark:text-white">{u.full_name}</p><p className="text-xs text-slate-500">{u.personal_id}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                  {isSearchingUsers && <p className="text-xs text-slate-400 mt-2">Searching...</p>}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowAnnouncementModal(false)} className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" disabled={isSubmittingAnnouncement}>Cancel</button>
              <button onClick={handleSendAnnouncement} disabled={isSubmittingAnnouncement} className="px-6 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-red-500/20">
                {isSubmittingAnnouncement ? (<><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>) : (<><Send className="w-4 h-4" /> Send Announcement</>)}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="ASU Career Week"
      onProfileClick={() => setShowProfile(true)}
      hideDock={showProfile}
    >
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'statistics' && renderStatistics()}
          {activeTab === 'sessions' && renderSessions()}
          {activeTab === 'events' && renderEvents()}
          {activeTab === 'companies' && renderCompanies()}
          {activeTab === 'jobs' && renderJobs()}
        </motion.div>
      </AnimatePresence>

      {renderAddCompanyModal()}
      {renderViewCompanyModal()}
      {renderEditCompanyModal()}
      {renderAddSessionModal()}
      {renderAnnouncementModal()}

      {renderJobDetailModal()}
      {showJobApplicantsModal && selectedJob && (
        <JobApplicantsModal
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          onClose={() => {
            setShowJobApplicantsModal(false);
            setSelectedJob(null);
          }}
        />
      )}

      {renderEventDetailModal()}
      {renderAddEditEventModal()}

      <SimpleModal show={showAddMapModal} onClose={() => setShowAddMapModal(false)} title="Add Map" />

      {showProfile && attendeeProfile && (
        <AttendeeProfileCard
          profile={attendeeProfile}
          onClose={() => setShowProfile(false)}
          hasActiveApplications={false}
        />
      )}
    </SharedNavigation>
  );
}

