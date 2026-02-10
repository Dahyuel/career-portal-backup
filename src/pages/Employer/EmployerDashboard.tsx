import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployerProfile } from '../../hooks/useEmployerProfile';
import EmployerProfileCard from '../../components/EmployerProfileCard';
import AddEditJobModal from '../../components/employer/AddEditJobModal';
import JobApplicantsModal from '../../components/employer/JobApplicantsModal';
import { supabase } from '../../lib/supabase';
import DashboardLoading from '../../components/DashboardLoading';
import { Variants } from 'framer-motion';
import JobManagementModal from '../../components/employer/JobManagementModal';
import Toast from '../../components/shared/Toast';

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

export const EmployerDashboard: React.FC = () => {
    const { user, profile } = useAuth();
    const { employerProfile, loading: profileLoading } = useEmployerProfile(user?.id);
    const [showProfile, setShowProfile] = useState(false);
    const [activeTab, setActiveTab] = useState('home');

    // Jobs State
    const [jobs, setJobs] = useState<any[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [showJobModal, setShowJobModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [deleteJobId, setDeleteJobId] = useState<string | null>(null);

    // Applicants State
    const [showApplicantsModal, setShowApplicantsModal] = useState(false);
    const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<any | null>(null);

    // Job Management (Redesign)
    const [showManagementModal, setShowManagementModal] = useState(false);
    const [jobForManagement, setJobForManagement] = useState<any | null>(null);

    // Optimization States
    const [dashboardReady, setDashboardReady] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalJobs: 0, totalApplicants: 0 });
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['home']));
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

    const navItems: NavItem[] = [
        { key: 'home', label: 'Home', icon: 'dashboard' },
        { key: 'jobs', label: 'Jobs', icon: 'work' },
        { key: 'cvs', label: 'CVs', icon: 'description' }
    ];

    const fetchJobs = async () => {
        if (!employerProfile?.employer_id) return;
        setLoadingJobs(true);
        try {
            const { data, error } = await supabase
                .from('job_positions')
                .select('*, job_applications(count)')
                .eq('employer_id', employerProfile.employer_id)
                .order('posted_at', { ascending: false });

            if (error) throw error;

            const jobsWithCounts = data?.map(job => ({
                ...job,
                no_of_applicants: (job.job_applications as any)?.[0]?.count || 0
            })) || [];

            setJobs(jobsWithCounts);
            setLoadedTabs(prev => new Set(prev).add('jobs').add('cvs'));

            // Sync stats if they've changed
            const totalApplicants = jobsWithCounts.reduce((acc, job) => acc + (job.no_of_applicants || 0), 0);
            setStats({ totalJobs: jobsWithCounts.length, totalApplicants });
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoadingJobs(false);
        }
    };

    // Parallel Initial Data Load (Profile, Notifications, Stats)
    useEffect(() => {
        if (profileLoading || !employerProfile?.employer_id || !profile?.role) return;

        const fetchInitialData = async () => {
            try {
                const [notificationsResult, jobsCountResult, applicantsCountResult] = await Promise.all([
                    supabase
                        .from('notifications')
                        .select('id, title, content, publish_at, announcement_type, target_roles')
                        .eq('event_id', EVENT_ID)
                        .contains('target_roles', [profile.role])
                        .order('publish_at', { ascending: false }),
                    // Efficiently count jobs
                    supabase
                        .from('job_positions')
                        .select('id', { count: 'exact', head: true })
                        .eq('employer_id', employerProfile.employer_id),
                    // For total applicants, we'll fetch job IDs and then count applications in one go
                    supabase
                        .from('job_positions')
                        .select('id')
                        .eq('employer_id', employerProfile.employer_id)
                ]);

                if (notificationsResult.data) {
                    setNotifications(notificationsResult.data.map(n => ({
                        ...n,
                        type: n.announcement_type
                    })));
                }

                const totalJobs = jobsCountResult.count || 0;

                // Get total applicants across all jobs
                let totalApplicants = 0;
                if (jobsCountResult.count && jobsCountResult.count > 0) {
                    const jobIds = applicantsCountResult.data?.map(j => j.id) || [];
                    if (jobIds.length > 0) {
                        const { count } = await supabase
                            .from('job_applications')
                            .select('id', { count: 'exact', head: true })
                            .in('job_position_id', jobIds);
                        totalApplicants = count || 0;
                    }
                }

                setStats({ totalJobs, totalApplicants });
                setDashboardReady(true);
            } catch (error) {
                console.error('Error in initial data fetch:', error);
                setDashboardReady(true); // Allow render anyway
            }
        };

        fetchInitialData();
    }, [profileLoading, employerProfile?.employer_id, profile?.role]);

    // Lazy Loading Tab Data
    useEffect(() => {
        if ((activeTab === 'jobs' || activeTab === 'cvs') && !loadedTabs.has('jobs')) {
            fetchJobs();
        }
    }, [activeTab, loadedTabs, employerProfile?.employer_id]);

    const getTypeBadgeColor = (type: string): string => {
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
    };

    const handleManagementAction = (job: any) => {
        setJobForManagement(job);
        setShowManagementModal(true);
    };

    const handleDeleteAttempt = (job: any) => {
        if (job.no_of_applicants > 0) {
            setToast({
                message: "Cannot delete a job with active applicants. Please review the applicants first.",
                type: 'warning'
            });
            return;
        }
        setDeleteJobId(job.id);
        setShowManagementModal(false);
    };


    const confirmDeleteJob = async () => {
        if (!deleteJobId) return;

        try {
            const { error } = await supabase
                .from('job_positions')
                .delete()
                .eq('id', deleteJobId);

            if (error) throw error;
            fetchJobs(); // Refresh
            setDeleteJobId(null);
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        }
    };

    const renderContent = () => {
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
                                    Welcome, {employerProfile?.full_name?.split(' ')[0] || 'Partner'}!
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
                                            {employerProfile?.company_name || 'Company Name'}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {employerProfile?.job_title || 'Employer'}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                                        <span className="material-symbols-outlined text-lg opacity-70">mail</span>
                                        <span className="truncate">{employerProfile?.email}</span>
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
                                    <p className="text-slate-600 dark:text-slate-400">Manage your open positions</p>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">{stats.totalJobs} Active</span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedJob(null);
                                    setShowJobModal(true);
                                }}
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                                style={{ backgroundColor: '#DC2626' }}
                            >
                                <span className="material-symbols-outlined">add</span>
                                Post New Job
                            </button>
                        </motion.div>

                        {loadingJobs ? (
                            <div className="flex justify-center py-12">
                                <span className="material-symbols-outlined animate-spin text-4xl text-indigo-600">progress_activity</span>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-4">work_off</span>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No jobs posted yet</h3>
                                <p className="text-slate-500 mb-6">Start by adding your first job opportunity.</p>
                                <button
                                    onClick={() => {
                                        setSelectedJob(null);
                                        setShowJobModal(true);
                                    }}
                                    className="text-indigo-600 font-bold hover:underline"
                                >
                                    Create Job Listing
                                </button>
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
                                                    Manage Job
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
    };

    if (!dashboardReady) {
        return <DashboardLoading />;
    }

    return (
        <SharedNavigation
            navItems={navItems}
            activeItem={activeTab}
            onItemChange={setActiveTab}
            title="ASU Employment Fair"
            notifications={notifications}
            onProfileClick={() => setShowProfile(true)}
            hideDock={showProfile}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
            </div>

            {/* Profile Card */}
            <AnimatePresence>
                {showProfile && (
                    <EmployerProfileCard
                        profile={employerProfile}
                        onClose={() => setShowProfile(false)}
                    />
                )}
            </AnimatePresence>

            {/* Add/Edit Job Modal */}
            <AnimatePresence>
                {showJobModal && employerProfile && (
                    <AddEditJobModal
                        job={selectedJob}
                        companyId={employerProfile.company_id || ''}
                        employerId={employerProfile.employer_id || ''}
                        eventId={employerProfile.event_id || ''}
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
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteJobId && (
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
        </SharedNavigation>
    );
};

export default EmployerDashboard;
