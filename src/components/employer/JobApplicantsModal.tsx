import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import AttendeeExperienceCard from './AttendeeExperienceCard';
import { logger } from '../../utils/logger';

// Simplified interface - no need for AttendeeProfile import
interface Applicant {
    id: string;
    applied_at: string;
    cv_url: string;
    attendee_id: string;
    status: string; // 'pending' | 'approved' | 'rejected'
    attendee: {
        user_id: string;
        university: string;
        faculty: string;
        department?: string;
        user_profile: {
            full_name: string;
            personal_id: string;
            email: string;
            phone: string;
            score?: number;
        };
    };
}

interface JobApplicantsModalProps {
    jobId: string;
    jobTitle: string;
    onClose: () => void;
    isEmployer?: boolean; // When true, shows Approve/Reject buttons
}

// Configuration
const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

const JobApplicantsModal: React.FC<JobApplicantsModalProps> = ({ jobId, jobTitle, onClose, isEmployer = false }) => {
    // Data state
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

    // Approve / Reject state
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Dismiss action toast after 3s
    useEffect(() => {
        if (!actionToast) return;
        const t = setTimeout(() => setActionToast(null), 3000);
        return () => clearTimeout(t);
    }, [actionToast]);

    // Pagination & Filtering
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to first page on search
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch applicants via RPC
    const fetchApplicants = useCallback(async () => {
        try {
            setLoading(true);

            const offset = (currentPage - 1) * ITEMS_PER_PAGE;

            const { data, error } = await supabase.rpc('employer_get_job_applicants', {
                _job_id: jobId,
                _limit: ITEMS_PER_PAGE,
                _offset: offset
            });

            if (error) throw error;

            const rpcResult = data as any;
            const applicantsList: Applicant[] = rpcResult?.data || [];
            const total: number = rpcResult?.total || 0;

            // Apply client-side filtering if needed
            let filteredApplicants = applicantsList;

            // Search filter
            if (debouncedSearch.trim()) {
                const lowerSearch = debouncedSearch.toLowerCase();
                filteredApplicants = filteredApplicants.filter(app => {
                    const profile = app.attendee?.user_profile;
                    return (
                        profile?.full_name?.toLowerCase().includes(lowerSearch) ||
                        profile?.personal_id?.toLowerCase().includes(lowerSearch) ||
                        app.attendee?.university?.toLowerCase().includes(lowerSearch) ||
                        app.attendee?.faculty?.toLowerCase().includes(lowerSearch)
                    );
                });
            }

            setApplicants(filteredApplicants);
            setTotalCount(total);
        } catch (err) {
            logger.error('Error fetching applicants:', err);
            setApplicants([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [jobId, currentPage, debouncedSearch]);

    // Fetch on mount and when dependencies change
    useEffect(() => {
        fetchApplicants();
    }, [fetchApplicants]);

    // Client-side sorting by name if needed
    const sortedApplicants = useMemo(() => {
        const sorted = [...applicants];

        if (sortBy === 'name') {
            sorted.sort((a, b) => {
                const nameA = a.attendee.user_profile.full_name.toLowerCase();
                const nameB = b.attendee.user_profile.full_name.toLowerCase();
                return sortOrder === 'asc'
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            });
        } else {
            sorted.sort((a, b) => {
                const dateA = new Date(a.applied_at).getTime();
                const dateB = new Date(b.applied_at).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
        }

        return sorted;
    }, [applicants, sortBy, sortOrder]);

    // Pagination calculations
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const showPagination = totalPages > 1;
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

    // Handlers
    const handleViewProfile = useCallback((applicant: Applicant) => {
        setSelectedApplicant(applicant);
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    }, [totalPages]);

    // Approve / Reject handler
    const handleUpdateStatus = useCallback(async (applicationId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
        setUpdatingId(applicationId);
        try {
            const { error } = await supabase.rpc('employer_update_application_status', {
                _application_id: applicationId,
                _status: newStatus
            });
            if (error) throw error;
            // Optimistic update
            setApplicants(prev =>
                prev.map(a => a.id === applicationId ? { ...a, status: newStatus } : a)
            );
            setActionToast({
                message: `Application ${newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'reset'} successfully.`,
                type: 'success'
            });
        } catch (err: any) {
            logger.error('Error updating application status:', err);
            setActionToast({ message: err?.message || 'Failed to update status.', type: 'error' });
        } finally {
            setUpdatingId(null);
        }
    }, []);

    const handleSortChange = useCallback((newSortBy: 'date' | 'name') => {
        if (sortBy === newSortBy) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    }, [sortBy]);

    // Export to CSV via RPC
    const exportToCSV = useCallback(async () => {
        try {
            const { data, error } = await supabase.rpc('employer_export_job_applicants', {
                _job_id: jobId
            });

            if (error) throw error;

            const exportData = (data || []) as any[];

            const headers = ['Name', 'Personal ID', 'Email', 'Phone', 'University', 'Faculty', 'Department', 'Applied At', 'CV URL'];
            const rows = exportData.map((app: any) => [
                app.full_name || 'Unknown',
                app.personal_id || 'N/A',
                app.email || '',
                app.phone || '',
                app.university || '',
                app.faculty || '',
                app.department || '',
                new Date(app.applied_at).toLocaleString(),
                app.cv_url || ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `applicants_${jobTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            logger.error('Error exporting CSV:', error);
        }
    }, [jobId, jobTitle]);

    // Get pagination range for display
    const getPaginationRange = useCallback(() => {
        const delta = 2;
        const range: (number | string)[] = [];
        const left = Math.max(2, currentPage - delta);
        const right = Math.min(totalPages - 1, currentPage + delta);

        range.push(1);

        if (left > 2) {
            range.push('...');
        }

        for (let i = left; i <= right; i++) {
            range.push(i);
        }

        if (right < totalPages - 1) {
            range.push('...');
        }

        if (totalPages > 1) {
            range.push(totalPages);
        }

        return range;
    }, [currentPage, totalPages]);

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-600">group</span>
                                Applicants
                                {totalCount > 0 && (
                                    <span className="text-sm font-bold px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                                        {totalCount}
                                    </span>
                                )}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {jobTitle}
                            </p>
                        </motion.div>
                        <motion.button
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </motion.button>
                    </div>

                    {/* Controls Bar */}
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                                search
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name, ID, university..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                            />
                        </div>

                        {/* Sort */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleSortChange('date')}
                                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${sortBy === 'date'
                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {sortBy === 'date' && sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                                </span>
                                Date
                            </button>
                            <button
                                onClick={() => handleSortChange('name')}
                                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${sortBy === 'name'
                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {sortBy === 'name' && sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                                </span>
                                Name
                            </button>
                        </div>

                        {/* Export */}
                        {totalCount > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={exportToCSV}
                                className="px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                <span className="hidden md:inline">Export CSV</span>
                            </motion.button>
                        )}
                    </div>

                    {/* Results info */}
                    {totalCount > 0 && (
                        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                            Showing {startItem}-{endItem} of {totalCount} applicants
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <span className="material-symbols-outlined animate-spin text-4xl text-indigo-500">progress_activity</span>
                        </div>
                    ) : sortedApplicants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl">
                                    {searchQuery ? 'search_off' : 'person_off'}
                                </span>
                            </div>
                            <p className="font-medium text-sm">
                                {searchQuery
                                    ? 'No applicants match your search'
                                    : 'No applications received yet'}
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="mt-4 text-indigo-600 hover:underline text-sm"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                Candidate
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                Academic Info
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">
                                                Applied
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <motion.tbody
                                        initial="hidden"
                                        animate="visible"
                                        variants={{
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.03
                                                }
                                            }
                                        }}
                                        className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900"
                                    >
                                        {sortedApplicants.map((app) => (
                                            <motion.tr
                                                key={app.id}
                                                variants={{
                                                    hidden: { opacity: 0, y: 10 },
                                                    visible: { opacity: 1, y: 0 }
                                                }}
                                                className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                                                            {app.attendee.user_profile.full_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-900 dark:text-white truncate">
                                                                {app.attendee.user_profile.full_name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-medium uppercase truncate tracking-tight">
                                                                ID: {app.attendee.user_profile.personal_id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                                                        {app.attendee.university}
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate">
                                                        {app.attendee.faculty}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        {new Date(app.applied_at).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </td>
                                                {/* Status badge column */}
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${app.status === 'approved'
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                        : app.status === 'rejected'
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                        }`}>
                                                        <span className="material-symbols-outlined text-[12px]">
                                                            {app.status === 'approved' ? 'check_circle' : app.status === 'rejected' ? 'cancel' : 'schedule'}
                                                        </span>
                                                        {app.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewProfile(app);
                                                            }}
                                                            className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5 px-3"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">visibility</span>
                                                            <span className="text-xs font-bold">View</span>
                                                        </motion.button>
                                                        {app.cv_url && (
                                                            <motion.a
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                href={app.cv_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 px-3"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">description</span>
                                                                <span className="text-xs font-bold">CV</span>
                                                            </motion.a>
                                                        )}
                                                        {/* Approve / Reject — employer only */}
                                                        {isEmployer && (
                                                            <>
                                                                <motion.button
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    disabled={app.status === 'approved' || updatingId === app.id}
                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'approved'); }}
                                                                    className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all flex items-center gap-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    title="Approve"
                                                                >
                                                                    {updatingId === app.id ? (
                                                                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                                                    ) : (
                                                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                                                    )}
                                                                    <span className="text-xs font-bold">Approve</span>
                                                                </motion.button>
                                                                <motion.button
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    disabled={app.status === 'rejected' || updatingId === app.id}
                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'rejected'); }}
                                                                    className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all flex items-center gap-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    title="Reject"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">cancel</span>
                                                                    <span className="text-xs font-bold">Reject</span>
                                                                </motion.button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </motion.tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05
                                        }
                                    }
                                }}
                                className="md:hidden p-4 space-y-3"
                            >
                                {sortedApplicants.map((app) => (
                                    <motion.div
                                        key={app.id}
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                        whileHover={{ y: -2 }}
                                        onClick={() => handleViewProfile(app)}
                                        className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-indigo-500/20 shadow-lg flex-shrink-0">
                                                    {app.attendee.user_profile.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-white truncate">
                                                        {app.attendee.user_profile.full_name}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                                                        {new Date(app.applied_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {/* Status badge */}
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${app.status === 'approved'
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                    : app.status === 'rejected'
                                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                    }`}>
                                                    {app.status || 'pending'}
                                                </span>
                                                {app.cv_url && (
                                                    <motion.a
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        href={app.cv_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm flex-shrink-0"
                                                    >
                                                        <span className="material-symbols-outlined text-xl">description</span>
                                                    </motion.a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                            <div className="min-w-0">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                                                    University
                                                </p>
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                                    {app.attendee.university}
                                                </p>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                                                    Faculty
                                                </p>
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                                    {app.attendee.faculty}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Approve / Reject — employer only */}
                                        {isEmployer && (
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                                <button
                                                    disabled={app.status === 'approved' || updatingId === app.id}
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'approved'); }}
                                                    className="flex-1 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                    Approve
                                                </button>
                                                <button
                                                    disabled={app.status === 'rejected' || updatingId === app.id}
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id, 'rejected'); }}
                                                    className="flex-1 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">cancel</span>
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </motion.div>
                        </>
                    )}
                </div>

                {/* Pagination Footer */}
                {showPagination && !loading && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                                Previous
                            </button>

                            <div className="flex items-center gap-2">
                                {getPaginationRange().map((page, idx) => (
                                    page === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                                            ...
                                        </span>
                                    ) : (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page as number)}
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${currentPage === page
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    )
                                ))}
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                                Next
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Action Toast  */}
            <AnimatePresence>
                {actionToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 ${actionToast.type === 'success'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {actionToast.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {actionToast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Detail Modal */}
            <AnimatePresence>
                {selectedApplicant && (
                    <AttendeeExperienceCard
                        profile={{
                            id: selectedApplicant.attendee.user_id,
                            full_name: selectedApplicant.attendee.user_profile.full_name,
                            email: selectedApplicant.attendee.user_profile.email,
                            phone: selectedApplicant.attendee.user_profile.phone,
                            personal_id: selectedApplicant.attendee.user_profile.personal_id,
                            university: selectedApplicant.attendee.university,
                            faculty: selectedApplicant.attendee.faculty,
                            department: selectedApplicant.attendee.department,
                            cv_url: selectedApplicant.cv_url
                        }}
                        onClose={() => setSelectedApplicant(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobApplicantsModal;