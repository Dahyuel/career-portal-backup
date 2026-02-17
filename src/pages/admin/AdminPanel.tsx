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
  Check
} from 'lucide-react';

// --- Animation Variants (matching BuildTeamDashboard / tabsanimation pattern) ---
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

const PARTNER_TYPE_OPTIONS = ['platinum', 'gold', 'silver', 'bronze', 'startup'] as const;

const PARTNER_TYPE_COLORS: Record<string, string> = {
  platinum: 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100',
  gold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  silver: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  bronze: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  startup: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

// Mock Data
const mockStats = {
  currentInEvent: 1124,
  maxInEvent: 1500,
  currentInBuilding: 312,
  maxInBuilding: 350,
  totalRegistrations: 4850,
  students: 3200,
  graduates: 1650,
  todayEntries: 2418,
  peakHour: '10:00 AM',
  peakCheckIns: 450
};

const mockSessions = [
  {
    id: '1',
    title: 'Career Growth Strategies',
    speaker: 'Dr. Sarah Johnson',
    time: '10:00 AM - 11:30 AM',
    location: 'Hall A',
    attendees: 145,
    capacity: 200
  },
  {
    id: '2',
    title: 'Tech Industry Insights',
    speaker: 'Ahmed Hassan',
    time: '2:00 PM - 3:30 PM',
    location: 'Hall B',
    attendees: 98,
    capacity: 150
  }
];

const mockEvents = [
  {
    id: '1',
    title: 'Opening Ceremony',
    date: '2025-10-19',
    time: '9:00 AM',
    location: 'Main Hall',
    description: 'Official opening of ASU Career Week 2025'
  },
  {
    id: '2',
    title: 'Networking Night',
    date: '2025-10-20',
    time: '6:00 PM',
    location: 'Garden Area',
    description: 'Meet professionals and build connections'
  }
];

const mockJobs = [
  {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    applicants: 45,
    postedDate: '2025-10-15'
  },
  {
    id: '2',
    title: 'Marketing Manager',
    company: 'Marketing Pro',
    location: 'Remote',
    type: 'Full-time',
    applicants: 32,
    postedDate: '2025-10-14'
  },
  {
    id: '3',
    title: 'Financial Analyst',
    company: 'Finance Solutions',
    location: 'Alexandria, Egypt',
    type: 'Full-time',
    applicants: 28,
    postedDate: '2025-10-13'
  },
  {
    id: '4',
    title: 'UX Designer',
    company: 'Tech Corp',
    location: 'Cairo, Egypt',
    type: 'Contract',
    applicants: 51,
    postedDate: '2025-10-12'
  },
  {
    id: '5',
    title: 'Data Scientist',
    company: 'Tech Corp',
    location: 'Hybrid',
    type: 'Full-time',
    applicants: 67,
    postedDate: '2025-10-11'
  }
];

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
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddMapModal, setShowAddMapModal] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // ===== COMPANIES STATE =====
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showViewCompanyModal, setShowViewCompanyModal] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Add Company form state
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    industry: '',
    email: '',
    website: '',
    description: '',
    booth_number: '',
    logo_url: '',
    partner_type: '' as string,
  });
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [companyFormError, setCompanyFormError] = useState('');

  // Edit Company state
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editCompanyForm, setEditCompanyForm] = useState({
    company_name: '',
    industry: '',
    email: '',
    website: '',
    description: '',
    booth_number: '',
    logo_url: '',
    partner_type: '' as string,
  });
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // ===== COMPANIES DATA FETCHING =====
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('event_id', EVENT_ID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching companies:', error);
        return;
      }
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'companies') {
      fetchCompanies();
    }
  }, [activeTab, fetchCompanies]);

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
      <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl p-8 md:p-10 text-white shadow-xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome, Admin</h1>
        <p className="text-orange-50 text-lg mb-6 max-w-2xl">
          Monitor and manage all aspects of the career fair event from one central hub.
        </p>
        <button
          onClick={() => setShowProfile(true)}
          className="bg-white text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-orange-50 transition-all flex items-center gap-2 shadow-lg"
        >
          <UserCheck className="h-5 w-5" />
          Show Profile
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowAddCompanyModal(true)}
          className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group"
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
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group"
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
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group"
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
        {/* Current in Event */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-3xl">
                location_city
              </span>
            </div>
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full">
              Good
            </span>
          </div>
          <div className="mb-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
              CURRENT IN EVENT
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold text-slate-900 dark:text-white">
                {mockStats.currentInEvent.toLocaleString()}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                / {mockStats.maxInEvent.toLocaleString()} max
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                style={{ width: `${(mockStats.currentInEvent / mockStats.maxInEvent) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Current in Building */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">
                business
              </span>
            </div>
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
              Warning
            </span>
          </div>
          <div className="mb-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
              CURRENT IN BUILDING
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold text-slate-900 dark:text-white">
                {mockStats.currentInBuilding.toLocaleString()}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                / {mockStats.maxInBuilding.toLocaleString()} max
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                style={{ width: `${(mockStats.currentInBuilding / mockStats.maxInBuilding) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Registrations */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">
                person_add
              </span>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-400 text-xs font-bold">12%</span>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
              TOTAL REGISTRATIONS
            </p>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">
              {mockStats.totalRegistrations.toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Students</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {mockStats.students.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Graduates</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {mockStats.graduates.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Entries */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-3xl">
                login
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-base">schedule</span>
              Last entry: 2m ago
            </span>
          </div>
          <div className="mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
              TODAY'S ENTRIES
            </p>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">
              {mockStats.todayEntries.toLocaleString()}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                Peak Hour Volume
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {mockStats.peakCheckIns} check-ins
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== STATISTICS TAB =====
  const renderStatistics = () => (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-200 dark:border-slate-700 inline-flex gap-2">
        <button
          onClick={() => setStatisticsView('general')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${statisticsView === 'general'
            ? 'bg-orange-500 text-white shadow-md'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
        >
          General Analytics
        </button>
        <button
          onClick={() => setStatisticsView('filter')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${statisticsView === 'filter'
            ? 'bg-orange-500 text-white shadow-md'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
        >
          By Filter
        </button>
        <button
          onClick={() => setStatisticsView('day')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${statisticsView === 'day'
            ? 'bg-orange-500 text-white shadow-md'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
        >
          By Day
        </button>
      </div>

      {/* Content based on selected view */}
      {statisticsView === 'general' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">General Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Overall event statistics and trends will be displayed here.
          </p>
        </div>
      )}

      {statisticsView === 'filter' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Filter Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Filter by faculty, university, degree level, and more.
          </p>
        </div>
      )}

      {statisticsView === 'day' && (
        <div className="space-y-6">
          {/* Day Selector */}
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${selectedDay === day
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-orange-300'
                  }`}
              >
                Day {day}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              Day {selectedDay} Statistics
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Detailed statistics for Day {selectedDay} will be displayed here.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ===== SESSIONS TAB =====
  const renderSessions = () => (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sessions</h2>
        <button
          onClick={() => setShowAddSessionModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="h-5 w-5" />
          Add Session
        </button>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockSessions.map((session) => (
          <div
            key={session.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{session.time}</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{session.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Speaker: {session.speaker}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{session.location}</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {session.attendees}/{session.capacity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== EVENTS TAB =====
  const renderEvents = () => (
    <div className="space-y-6">
      {/* Header with Add Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Events</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddMapModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
          >
            <span className="material-symbols-outlined">map</span>
            Add Map
          </button>
          <button
            onClick={() => setShowAddEventModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="h-5 w-5" />
            Add Event
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockEvents.map((event) => (
          <div
            key={event.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{event.date}</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{event.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{event.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{event.location}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{event.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const renderJobs = () => (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Job Opportunities</h2>
        <button
          onClick={() => setShowAddJobModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="h-5 w-5" />
          Add Job
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl">
                  work
                </span>
              </div>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-3 py-1 rounded-full">
                {job.type}
              </span>
            </div>

            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{job.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{job.company}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {job.location}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                  people
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {job.applicants} applicants
                </span>
              </div>
              <button className="text-orange-600 dark:text-orange-400 text-sm font-semibold hover:underline">
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
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
                className="px-6 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
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

      {/* Add Company Modal */}
      {renderAddCompanyModal()}

      {/* View Company Modal */}
      {renderViewCompanyModal()}

      {/* Edit Company Modal */}
      {renderEditCompanyModal()}

      {/* Other Modals (Placeholders) */}
      <SimpleModal
        show={showAddSessionModal}
        onClose={() => setShowAddSessionModal(false)}
        title="Add Session"
      />
      <SimpleModal
        show={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        title="Add Event"
      />
      <SimpleModal
        show={showAddMapModal}
        onClose={() => setShowAddMapModal(false)}
        title="Add Map"
      />
      <SimpleModal
        show={showAddJobModal}
        onClose={() => setShowAddJobModal(false)}
        title="Add Job"
      />
      <SimpleModal
        show={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        title="Send Announcement"
      />

      {/* Profile Card */}
      {showProfile && attendeeProfile && (
        <AttendeeProfileCard
          profile={attendeeProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </SharedNavigation>
  );
}
