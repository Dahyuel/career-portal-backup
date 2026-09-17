import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getActiveEventId } from '../../lib/currentEvent';
import { motion, AnimatePresence } from 'framer-motion';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';
import EmployerProfileCard from '../../components/EmployerProfileCard';
import AddEditJobModal from '../../components/employer/AddEditJobModal';
import JobApplicantsModal from '../../components/employer/JobApplicantsModal';
import { supabase } from '../../lib/supabase';
import DashboardLoading from '../../components/DashboardLoading';
import { Variants } from 'framer-motion';
import JobManagementModal from '../../components/employer/JobManagementModal';
import Toast from '../../components/shared/Toast';
import NotificationModal from '../../components/NotificationModal';
import { logger } from '../../utils/logger';
import { useNavigate } from 'react-router-dom';
import { EmployerEvent, getEmployerStatus } from '../../lib/employer';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
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

// Type definitions
interface Job {
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
}

interface Notification {
    id: string;
    title: string;
    content: string;
    publish_at: string;
    type: string;
}

interface Stats {
    totalJobs: number;
    totalApplicants: number;
}

export const EmployerDashboard: React.FC = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();

    // REMOVED: useEmployerProfile hook - now using profile from AuthContext
    const [showProfile, setShowProfile] = useState(false);
    const [activeTab, setActiveTab] = useState('home');

    // Jobs State
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [showJobModal, setShowJobModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [deleteJobId, setDeleteJobId] = useState<string | null>(null);

    // Applicants State
    const [showApplicantsModal, setShowApplicantsModal] = useState(false);
    const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<Job | null>(null);

    // Job Management (Redesign)
    const [showManagementModal, setShowManagementModal] = useState(false);
    const [jobForManagement, setJobForManagement] = useState<Job | null>(null);

    // Optimization States
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [stats, setStats] = useState<Stats>({ totalJobs: 0, totalApplicants: 0 });
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['home']));
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);

    // The event the employer picked on /employer-start (bound into the profile)
    const EVENT_ID = profile?.event_id || getActiveEventId();

    // Ended events are view-only; the server refuses changes as well
    const [eventInfo, setEventInfo] = useState<EmployerEvent | null>(null);
    const readOnly = eventInfo?.is_ended ?? false;

    useEffect(() => {
        let cancelled = false;
        getEmployerStatus().then((status) => {
            if (cancelled || !status) return;
            setEventInfo(status.events.find((e) => e.event_id === EVENT_ID) ?? null);
        });
        return () => { cancelled = true; };
    }, [EVENT_ID]);

    const navItems: NavItem[] = [
        { key: 'home', label: 'Home', icon: 'dashboard' },
        { key: 'jobs', label: 'Jobs', icon: 'work' },
        { key: 'cvs', label: 'CVs', icon: 'description' }
    ];

    // Extract employer data from profile - OPTIMIZED
    const employerData = useMemo(() => {
        if (!profile?.employer) return null;

        return {
            id: user?.id || (profile?.id || ''), // Use user.id as primary, then profile.id
            personal_id: profile.personal_id || '', // Required by EmployerProfile
            employer_id: profile.employer.user_id,
            company_id: profile.employer.company_id,
            job_title: profile.employer.job_title,
            company_name: profile.company?.company_name || '',
            company_logo: profile.company?.logo_url || '',
            target_faculties: profile.company?.faculties || [],
            company_website: profile.company?.website || '',
            event_id: profile.event_id || EVENT_ID,
            full_name: profile.full_name,
            email: profile.email || user?.email || '', // Fallback to user email
            phone: profile.phone || ''
        };
    }, [profile, user, EVENT_ID]);

    // Fetch Jobs - via RPC
    const fetchJobs = useCallback(async () => {
        if (!employerData?.employer_id) return;

        setLoadingJobs(true);
        try {
            const { data, error } = await supabase.rpc('employer_get_my_jobs', { p_event_id: EVENT_ID });

            if (error) throw error;

            const jobsWithCounts: Job[] = (data || []).map((job: any) => ({
                ...job,
                no_of_applicants: Number(job.no_of_applicants) || 0
            }));

            setJobs(jobsWithCounts);
            setLoadedTabs(prev => new Set(prev).add('jobs').add('cvs'));

            // Sync stats
            const totalApplicants = jobsWithCounts.reduce((acc, job) => acc + (job.no_of_applicants || 0), 0);
            setStats({ totalJobs: jobsWithCounts.length, totalApplicants });
        } catch (error) {
            logger.error('Error fetching jobs:', error);
            setToast({
                message: 'Failed to load jobs. Please try again.',
                type: 'error'
            });
        } finally {
            setLoadingJobs(false);
        }
    }, [employerData?.employer_id, EVENT_ID]);

    // Initial Data Load - via RPC
    useEffect(() => {
        if (!profile || !employerData?.employer_id) {
            setIsInitializing(false);
            return;
        }

        const fetchInitialData = async () => {
            try {
                // Parallel fetch for better performance
                const [notificationsResult, jobsResult] = await Promise.all([
                    supabase.rpc('get_employer_notifications', { p_event_id: EVENT_ID }),
                    supabase.rpc('employer_get_my_jobs', { p_event_id: EVENT_ID })
                ]);

                if (notificationsResult.data) {
                    const notifs = Array.isArray(notificationsResult.data) ? notificationsResult.data : [];
                    setNotifications(notifs);
                }

                if (jobsResult.data) {
                    const jobsList = Array.isArray(jobsResult.data) ? jobsResult.data : [];
                    const totalJobs = jobsList.length;
                    const totalApplicants = jobsList.reduce((acc: number, j: any) => acc + (Number(j.no_of_applicants) || 0), 0);
                    setStats({ totalJobs, totalApplicants });
                }
            } catch (error) {
                logger.error('Error in initial data fetch:', error);
            } finally {
                setIsInitializing(false);
            }
        };

        fetchInitialData();
    }, [profile, employerData, EVENT_ID]);

    // Lazy Loading Tab Data - OPTIMIZED
    useEffect(() => {
        if ((activeTab === 'jobs' || activeTab === 'cvs') && !loadedTabs.has('jobs') && employerData?.employer_id) {
            fetchJobs();
        }
    }, [activeTab, loadedTabs, employerData?.employer_id, fetchJobs]);

    const getTypeBadgeColor = useCallback((type: string): string => {
        const colors: Record<string, string> = {
            'Full-Time': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'full-time': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'Internship': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
            'internship': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
            'Part-Time': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
            'part-time': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
            'Contract': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'contract': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'Remote': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
            'remote': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
        };
        return colors[type] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }, []);

    const handleManagementAction = useCallback((job: Job) => {
        setJobForManagement(job);
        setShowManagementModal(true);
    }, []);

    const handleDeleteAttempt = useCallback((job: Job) => {
        if (readOnly) return;
        if (job.no_of_applicants > 0) {
            setToast({
                message: "Cannot delete a job with active applicants. Please review the applicants first.",
                type: 'warning'
            });
            return;
        }
        setDeleteJobId(job.id);
        setShowManagementModal(false);
    }, [readOnly]);

    const confirmDeleteJob = useCallback(async () => {
        if (!deleteJobId) return;

        try {
            const { error } = await supabase.rpc('employer_delete_job', { _job_id: deleteJobId });

            if (error) throw error;

            setToast({
                message: 'Job deleted successfully',
                type: 'success'
            });

            fetchJobs();
            setDeleteJobId(null);
        } catch (error) {
            logger.error('Error deleting job:', error);
            setToast({
                message: 'Failed to delete job',
                type: 'error'
            });
        }
    }, [deleteJobId, fetchJobs]);

    const renderEventBar = () => (
        <div className={`mb-6 rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${readOnly
            ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
            : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}
        >
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={`material-symbols-outlined ${readOnly ? 'text-amber-600 dark:text-amber-400' : 'text-red-600'}`}>
                    {readOnly ? 'lock' : 'event'}
                </span>
                <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                        {eventInfo?.event_name || 'Selected event'}
                    </p>
                    <p className={`text-sm ${readOnly ? 'text-amber-800 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        {readOnly
                            ? 'This event has ended. You can view its data, but posting, editing and reviewing are turned off.'
                            : 'You are managing this event.'}
                    </p>
                </div>
            </div>
            <button
                onClick={() => navigate('/employer-start')}
                className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
                <span className="material-symbols-outlined text-base">swap_horiz</span>
                Switch event
            </button>
        </div>
    );

    const renderContent = useCallback(() => {
        switch (activeTab) {
            case 'home':
                return (
                    <motion.div
                        key="home"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-6"
                    >
                        {/* Welcome Section */}
                        <motion.div
                            variants={itemVariants}
                            className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 shadow-lg shadow-red-500/20 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-9xl text-white transform rotate-12">
                                    business_center
                                </span>
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold text-white mb-2">
                                    Welcome, {employerData?.full_name?.split(' ')[0] || 'Partner'}!
                                </h2>
                                <p className="text-red-100 text-lg mb-6 max-w-xl">
                                    Here's what's happening with your job postings and applications today.
                                </p>
                                <button
                                    onClick={() => setShowProfile(true)}
                                    className="bg-white text-red-600 hover:bg-red-50 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">person</span>
                                    Show Profile
                                </button>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Stats Cards */}
                            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                    <span className="material-symbols-outlined text-3xl">work</span>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Jobs</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalJobs}</h3>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                                    <span className="material-symbols-outlined text-3xl">group</span>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Applicants</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalApplicants}</h3>
                                </div>
                            </motion.div>

                            {/* Redesigned Company Info Card */}
                            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
                                        <span className="material-symbols-outlined text-2xl">apartment</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                                            {employerData?.company_name || 'Company Name'}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {employerData?.job_title || 'Employer'}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                                        <span className="material-symbols-outlined text-lg opacity-70">mail</span>
                                        <span className="truncate">{employerData?.email}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                );

            case 'jobs':
                return (
                    <motion.div
                        key="jobs"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-6"
                    >
                        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                    <span className="material-symbols-outlined text-red-600">work</span>
                                    Job Postings
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-slate-600 dark:text-slate-400">{readOnly ? 'Positions posted for this event' : 'Manage your open positions'}</p>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">{stats.totalJobs} Active</span>
                                </div>
                            </div>
                            {!readOnly && <button
                                onClick={() => {
                                    setSelectedJob(null);
                                    setShowJobModal(true);
                                }}
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                                style={{ backgroundColor: '#DC2626' }}
                            >
                                <span className="material-symbols-outlined">add</span>
                                Post New Job
                            </button>}
                        </motion.div>

                        {loadingJobs ? (
                            <div className="flex justify-center py-12">
                                <span className="material-symbols-outlined animate-spin text-4xl text-indigo-600">progress_activity</span>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-4">work_off</span>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No jobs posted yet</h3>
                                <p className="text-slate-500 mb-6">
                                    {readOnly ? 'No jobs were posted for this event.' : 'Start by adding your first job opportunity.'}
                                </p>
                                {!readOnly && <button
                                    onClick={() => {
                                        setSelectedJob(null);
                                        setShowJobModal(true);
                                    }}
                                    className="text-indigo-600 font-bold hover:underline"
                                >
                                    Create Job Listing
                                </button>}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {jobs.map((job) => (
                                    <motion.div
                                        key={job.id}
                                        variants={itemVariants}
                                        whileHover={{ y: -8 }}
                                        onClick={() => handleManagementAction(job)}
                                        className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-slate-100 dark:border-slate-700 flex flex-col h-full relative"
                                    >
                                        {/* Colored Header Section (No Photo) */}
                                        <div className="relative h-40 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 flex items-center justify-center border-b border-slate-100 dark:border-slate-700/50">
                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-500">
                                                <span className="material-symbols-outlined text-4xl text-red-600">work</span>
                                            </div>

                                            {/* Top Badges */}
                                            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-[10px] font-bold tracking-wide shadow-sm flex items-center gap-1.5 dark:text-slate-200">
                                                <span className="material-symbols-outlined text-[12px] text-red-600">group</span>
                                                {job.no_of_applicants || 0} Applicants
                                            </div>

                                            <div className="absolute bottom-3 left-3 flex gap-2">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTypeBadgeColor(job.job_type)} shadow-sm`}>
                                                    {job.job_type}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content Body */}
                                        <div className="p-5 flex flex-col flex-1">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-red-600 transition-colors">
                                                    {job.title}
                                                </h4>

                                                <div className="space-y-2.5 mb-4">
                                                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                        <span className="material-symbols-outlined text-sm text-red-500">location_on</span>
                                                        {job.location}
                                                    </div>
                                                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                        <span className="material-symbols-outlined text-sm text-red-500">bolt</span>
                                                        {job.experience_level} Level
                                                    </div>
                                                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                        <span className="material-symbols-outlined text-sm text-red-500">home_work</span>
                                                        {job.employment_mode}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer Info */}
                                            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">
                                                    <span className="material-symbols-outlined text-xs">schedule</span>
                                                    {new Date(job.posted_at).toLocaleDateString()}
                                                </div>

                                                <span className="text-red-600 dark:text-red-400 text-xs font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                                    {readOnly ? 'View Job' : 'Manage Job'}
                                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                );

            case 'cvs':
                return (
                    <motion.div
                        key="cvs"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-6"
                    >
                        <motion.div variants={itemVariants} className="mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <span className="material-symbols-outlined text-red-600">group</span>
                                Applicant Management
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-slate-600 dark:text-slate-400">Review CVs and applicants for your roles</p>
                            </div>
                        </motion.div>

                        {loadingJobs ? (
                            <div className="flex justify-center py-12">
                                <span className="material-symbols-outlined animate-spin text-4xl text-indigo-600">progress_activity</span>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-500">No jobs posted yet. Create a job to start receiving applications.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {jobs.map((job) => (
                                    <motion.div
                                        key={job.id}
                                        variants={itemVariants}
                                        whileHover={{ y: -5 }}
                                        className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all card-hover-enhanced cursor-pointer group"
                                        onClick={() => {
                                            setSelectedJobForApplicants(job);
                                            setShowApplicantsModal(true);
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                                <span className="material-symbols-outlined">group</span>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {job.no_of_applicants || 0} Applicants
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {job.title}
                                        </h3>
                                        <div className="flex items-center text-sm text-slate-500">
                                            <span className="material-symbols-outlined text-sm mr-1">location_on</span>
                                            {job.location}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <span className="text-xs text-slate-400 font-medium">View Applicants</span>
                                            <span className="material-symbols-outlined text-slate-300 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                );

            default:
                return null;
        }
    }, [activeTab, employerData, stats, loadingJobs, jobs, handleManagementAction, getTypeBadgeColor, readOnly]);

    // Show loading while initializing
    if (isInitializing || !profile) {
        return <DashboardLoading />;
    }

    // Check if user has employer role (sadmin/super_admin bypasses)
    const isSuperAdmin = profile.role === 'sadmin' || profile.role === 'super_admin';
    if (!isSuperAdmin && !profile.roles.includes('employer') && !employerData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Access Denied
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        You don't have employer access for this event.
                    </p>
                    <button
                        onClick={() => navigate('/employer-start')}
                        className="mt-4 px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                    >
                        Choose another event
                    </button>
                </div>
            </div>
        );
    }

    return (
        <SharedNavigation
            navItems={navItems}
            activeItem={activeTab}
            onItemChange={setActiveTab}
            title="ASU Career Expo"
            notifications={notifications}
            onNotificationClick={(notification) => setSelectedNotification(notification)}
            onProfileClick={() => setShowProfile(true)}
            hideDock={showProfile}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
                {renderEventBar()}
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
            </div>

            {/* Profile Card */}
            <AnimatePresence>
                {showProfile && employerData && (
                    <EmployerProfileCard
                        readOnly={readOnly}
                        onClose={() => setShowProfile(false)}
                    />
                )}
            </AnimatePresence>

            {/* Add/Edit Job Modal */}
            <AnimatePresence>
                {showJobModal && employerData && !readOnly && (
                    <AddEditJobModal
                        job={selectedJob}
                        companyId={employerData.company_id || ''}
                        employerId={employerData.employer_id || ''}
                        eventId={employerData.event_id || ''}
                        onClose={() => setShowJobModal(false)}
                        onSave={fetchJobs}
                    />
                )}
            </AnimatePresence>

            {/* Job Management Modal */}
            <AnimatePresence>
                {showManagementModal && jobForManagement && (
                    <JobManagementModal
                        job={jobForManagement}
                        readOnly={readOnly}
                        onClose={() => setShowManagementModal(false)}
                        onEdit={() => {
                            setSelectedJob(jobForManagement);
                            setShowJobModal(true);
                            setShowManagementModal(false);
                        }}
                        onDelete={() => handleDeleteAttempt(jobForManagement)}
                    />
                )}
            </AnimatePresence>

            {/* Toast Notifications */}
            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {/* Job Applicants Modal */}
            <AnimatePresence>
                {showApplicantsModal && selectedJobForApplicants && (
                    <JobApplicantsModal
                        jobId={selectedJobForApplicants.id}
                        jobTitle={selectedJobForApplicants.title}
                        onClose={() => setShowApplicantsModal(false)}
                        isEmployer={!readOnly}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteJobId && !readOnly && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setDeleteJobId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 relative z-10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                                    <span className="material-symbols-outlined">warning</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Job Posting?</h3>
                            </div>

                            <p className="text-slate-500 dark:text-slate-400 mb-6 ml-1">
                                Are you sure you want to delete this job? This action cannot be undone.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteJobId(null)}
                                    className="px-4 py-2 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                                >
                                    No, Keep it
                                </button>
                                <button
                                    onClick={confirmDeleteJob}
                                    className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notification Modal */}
            <AnimatePresence>
                {selectedNotification && (
                    <NotificationModal
                        notification={selectedNotification}
                        onClose={() => setSelectedNotification(null)}
                    />
                )}
            </AnimatePresence>
        </SharedNavigation>
    );
};

export default EmployerDashboard;