import React, { useState, useEffect } from 'react';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployerProfile } from '../../hooks/useEmployerProfile';
import EmployerProfileCard from '../../components/EmployerProfileCard';
import AddEditJobModal from '../../components/employer/AddEditJobModal';
import JobApplicantsModal from '../../components/employer/JobApplicantsModal';
import { supabase } from '../../lib/supabase';

export const EmployerDashboard: React.FC = () => {
    const { user } = useAuth();
    const { employerProfile } = useEmployerProfile(user?.id);
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

    const navItems: NavItem[] = [
        { key: 'home', label: 'Home', icon: 'dashboard' },
        { key: 'jobs', label: 'Jobs', icon: 'work' },
        { key: 'cvs', label: 'CVs', icon: 'description' } // Renamed from Statistics
    ];

    const fetchJobs = async () => {
        if (!employerProfile?.employer_id) return;
        setLoadingJobs(true);
        try {
            const { data, error } = await supabase
                .from('job_positions')
                .select('*')
                .eq('employer_id', employerProfile.employer_id)
                .order('posted_at', { ascending: false });

            if (error) throw error;
            setJobs(data || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoadingJobs(false);
        }
    };

    useEffect(() => {
        // Fetch jobs on mount (or when employerProfile loads) to populate stats for Home tab
        if (employerProfile?.employer_id) {
            fetchJobs();
        }
    }, [employerProfile?.employer_id]);

    const stats = {
        totalJobs: jobs.length,
        totalApplicants: jobs.reduce((acc, job) => acc + (job.no_of_applicants || 0), 0)
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteJobId(id);
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
                    <div className="space-y-6">
                        {/* Welcome Section */}
                        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 shadow-lg shadow-red-500/20 relative overflow-hidden group">
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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Stats Cards */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                    <span className="material-symbols-outlined text-3xl">work</span>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Jobs</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalJobs}</h3>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                                    <span className="material-symbols-outlined text-3xl">group</span>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Applicants</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalApplicants}</h3>
                                </div>
                            </div>

                            {/* Redesigned Company Info Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
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
                            </div>
                        </div>
                    </div>
                );

            case 'jobs':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Job Postings</h2>
                                <p className="text-slate-600 dark:text-slate-400">Manage your open positions</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedJob(null);
                                    setShowJobModal(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">add</span>
                                Add Job
                            </button>
                        </div>

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
                            <div className="grid grid-cols-1 gap-4">
                                {jobs.map((job) => (
                                    <div key={job.id} className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
                                                    {job.title}
                                                </h3>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wide">
                                                        {job.job_type}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wide">
                                                        {job.employment_mode}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide">
                                                        {job.experience_level}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400 flex gap-4">
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">location_on</span>
                                                        {job.location}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                                        Posted {new Date(job.posted_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedJob(job);
                                                        setShowJobModal(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined">edit</span>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteClick(job.id, e)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'cvs':
                return (
                    <div className="space-y-6">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Applicant Management</h2>
                            <p className="text-slate-600 dark:text-slate-400">Review CVs and applicants for your roles</p>
                        </div>

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
                                    <div
                                        key={job.id}
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <SharedNavigation
            navItems={navItems}
            activeItem={activeTab}
            onItemChange={setActiveTab}
            title="ASU Employment Fair"
            onProfileClick={() => setShowProfile(true)}
            hideDock={showProfile}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderContent()}
            </div>

            {/* Profile Card */}
            {showProfile && (
                <EmployerProfileCard
                    profile={employerProfile}
                    onClose={() => setShowProfile(false)}
                />
            )}

            {/* Add/Edit Job Modal */}
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

            {/* Job Applicants Modal */}
            {showApplicantsModal && selectedJobForApplicants && (
                <JobApplicantsModal
                    jobId={selectedJobForApplicants.id}
                    jobTitle={selectedJobForApplicants.title}
                    onClose={() => setShowApplicantsModal(false)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteJobId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setDeleteJobId(null)}>
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 transform transition-all scale-100"
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
                    </div>
                </div>
            )}
        </SharedNavigation>
    );
};

export default EmployerDashboard;
