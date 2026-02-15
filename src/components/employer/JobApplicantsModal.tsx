import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import AttendeeExperienceCard from './AttendeeExperienceCard';

// Simplified interface - no need for AttendeeProfile import
interface Applicant {
    id: string;
    applied_at: string;
    cv_url: string;
    attendee_id: string;
    attendee: {
        user_id: string;
        university: string;
        faculty: string;
        registration_status: string;
        department?: string;
        student_id?: string;
        is_asu_student: boolean;
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
}

// Configuration
const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

const JobApplicantsModal: React.FC<JobApplicantsModalProps> = ({ jobId, jobTitle, onClose }) => {
    // Data state
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

    // Pagination & Filtering
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
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

    // OPTIMIZED: Single query with all joins, filtering, and pagination
    const fetchApplicants = useCallback(async () => {
        try {
            setLoading(true);

            // Build the optimized query with proper joins
            // Note: attendees.user_id -> auth.users -> user_profiles.id (same value)
            let query = supabase
                .from('job_applications')
                .select(`
                    id,
                    applied_at,
                    cv_url,
                    attendee_id,
                    attendees!inner (
                        user_id,
                        university,
                        faculty,
                        registration_status,
                        department,
                        student_id,
                        is_asu_student
                    )
                `, { count: 'exact' })
                .eq('job_position_id', jobId);

            // Apply status filter
            if (filterStatus !== 'all') {
                query = query.eq('attendees.registration_status', filterStatus);
            }

            // Apply search filter on attendee fields (we'll search user_profiles separately)
            if (debouncedSearch.trim()) {
                query = query.or(`attendees.university.ilike.%${debouncedSearch}%,attendees.faculty.ilike.%${debouncedSearch}%`);
            }

            // Apply sorting
            if (sortBy === 'date') {
                query = query.order('applied_at', { ascending: sortOrder === 'asc' });
            } else {
                // For name sorting, we'll do it client-side since it's in a nested relation
                query = query.order('applied_at', { ascending: false });
            }

            // Apply pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            // Fetch user profiles separately
            const userIds = (data || []).map((app: any) => app.attendees?.user_id).filter(Boolean);

            let profileMap: Record<string, any> = {};
            if (userIds.length > 0) {
                const { data: profiles, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, personal_id, email, phone, score')
                    .in('id', userIds);

                if (profileError) throw profileError;

                profileMap = (profiles || []).reduce((acc: any, p) => {
                    acc[p.id] = p;
                    return acc;
                }, {});
            }

            // Apply search filter on user profiles if needed
            let filteredData = data || [];
            if (debouncedSearch.trim() && userIds.length > 0) {
                const lowerSearch = debouncedSearch.toLowerCase();
                filteredData = filteredData.filter((app: any) => {
                    const profile = profileMap[app.attendees?.user_id];
                    if (!profile) return true; // Keep if no profile

                    return (
                        profile.full_name?.toLowerCase().includes(lowerSearch) ||
                        profile.personal_id?.toLowerCase().includes(lowerSearch) ||
                        app.attendees?.university?.toLowerCase().includes(lowerSearch) ||
                        app.attendees?.faculty?.toLowerCase().includes(lowerSearch)
                    );
                });
            }

            // Format the data with proper structure
            const formattedApplicants: Applicant[] = filteredData.map((app: any) => ({
                id: app.id,
                applied_at: app.applied_at,
                cv_url: app.cv_url,
                attendee_id: app.attendee_id,
                attendee: {
                    user_id: app.attendees.user_id,
                    university: app.attendees.university,
                    faculty: app.attendees.faculty,
                    registration_status: app.attendees.registration_status,
                    department: app.attendees.department,
                    student_id: app.attendees.student_id,
                    is_asu_student: app.attendees.is_asu_student,
                    user_profile: profileMap[app.attendees.user_id] || {
                        full_name: 'Unknown',
                        personal_id: 'N/A',
                        email: '',
                        phone: '',
                        score: 0
                    }
                }
            }));

            setApplicants(formattedApplicants);
            setTotalCount(count || 0);
        } catch (err) {
            console.error('Error fetching applicants:', err);
            setApplicants([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [jobId, currentPage, filterStatus, debouncedSearch, sortBy, sortOrder]);

    // Fetch on mount and when dependencies change
    useEffect(() => {
        fetchApplicants();
    }, [fetchApplicants]);

    // Client-side sorting by name if needed
    const sortedApplicants = useMemo(() => {
        if (sortBy !== 'name') return applicants;

        return [...applicants].sort((a, b) => {
            const nameA = a.attendee.user_profile.full_name.toLowerCase();
            const nameB = b.attendee.user_profile.full_name.toLowerCase();

            if (sortOrder === 'asc') {
                return nameA.localeCompare(nameB);
            }
            return nameB.localeCompare(nameA);
        });
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

    const handleSortChange = useCallback((newSortBy: 'date' | 'name') => {
        if (sortBy === newSortBy) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    }, [sortBy]);

    const handleFilterChange = useCallback((status: string) => {
        setFilterStatus(status);
        setCurrentPage(1);
    }, []);

    // Export to CSV
    const exportToCSV = useCallback(async () => {
        try {
            // Fetch all applicants for export (no pagination)
            const { data, error } = await supabase
                .from('job_applications')
                .select(`
                    id,
                    applied_at,
                    cv_url,
                    attendees!inner (
                        user_id,
                        university,
                        faculty,
                        registration_status,
                        department,
                        student_id,
                        is_asu_student
                    )
                `)
                .eq('job_position_id', jobId);

            if (error) throw error;

            // Fetch user profiles
            const userIds = (data || []).map((app: any) => app.attendees?.user_id).filter(Boolean);

            let profileMap: Record<string, any> = {};
            if (userIds.length > 0) {
                const { data: profiles, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, personal_id, email, phone')
                    .in('id', userIds);

                if (profileError) throw profileError;

                profileMap = (profiles || []).reduce((acc: any, p) => {
                    acc[p.id] = p;
                    return acc;
                }, {});
            }

            const headers = ['Name', 'Personal ID', 'Email', 'Phone', 'University', 'Faculty', 'Department', 'Student ID', 'ASU Student', 'Status', 'Applied At', 'CV URL'];
            const rows = (data || []).map((app: any) => {
                const profile = profileMap[app.attendees.user_id] || {};
                return [
                    profile.full_name || 'Unknown',
                    profile.personal_id || 'N/A',
                    profile.email || '',
                    profile.phone || '',
                    app.attendees.university,
                    app.attendees.faculty,
                    app.attendees.department || '',
                    app.attendees.student_id || '',
                    app.attendees.is_asu_student ? 'Yes' : 'No',
                    app.attendees.registration_status,
                    new Date(app.applied_at).toLocaleString(),
                    app.cv_url || ''
                ];
            });

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
            console.error('Error exporting CSV:', error);
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

                        {/* Filter by Status */}
                        <select
                            value={filterStatus}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected</option>
                        </select>

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
                                    {searchQuery || filterStatus !== 'all' ? 'search_off' : 'person_off'}
                                </span>
                            </div>
                            <p className="font-medium text-sm">
                                {searchQuery || filterStatus !== 'all'
                                    ? 'No applicants match your filters'
                                    : 'No applications received yet'}
                            </p>
                            {(searchQuery || filterStatus !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterStatus('all');
                                    }}
                                    className="mt-4 text-indigo-600 hover:underline text-sm"
                                >
                                    Clear filters
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
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">
                                                Applied
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
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${app.attendee.registration_status === 'approved'
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                            : app.attendee.registration_status === 'pending'
                                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                                                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                        }`}>
                                                        {app.attendee.registration_status}
                                                    </span>
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
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-indigo-500/20 shadow-lg flex-shrink-0">
                                                    {app.attendee.user_profile.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-white truncate">
                                                        {app.attendee.user_profile.full_name}
                                                    </h4>
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${app.attendee.registration_status === 'approved'
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                                : app.attendee.registration_status === 'pending'
                                                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                            }`}>
                                                            {app.attendee.registration_status}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {new Date(app.applied_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
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
                            student_id: selectedApplicant.attendee.student_id,
                            registration_status: selectedApplicant.attendee.registration_status,
                            preferred_language: 'en',
                            score: selectedApplicant.attendee.user_profile.score || 0,
                            created_at: selectedApplicant.applied_at,
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