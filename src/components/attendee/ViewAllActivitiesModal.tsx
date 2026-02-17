import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ViewAllActivitiesModalProps {
    onClose: () => void;
}

const ViewAllActivitiesModal: React.FC<ViewAllActivitiesModalProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllActivities = async () => {
            if (!user?.id) return;

            try {
                const { data, error } = await supabase
                    .from('user_activities')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('activity_timestamp', { ascending: false })
                    .limit(100); // Limit to last 100 for now

                if (error) throw error;
                setActivities(data || []);
            } catch (err) {
                console.error('Error fetching activities:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllActivities();
    }, [user?.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-600">history</span>
                        Activity History
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : activities.length > 0 ? (
                        activities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-slate-800 last:border-0 last:pb-0">
                                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg flex-shrink-0">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                                        {activity.activity_type === 'session_attendance' ? 'event' :
                                            activity.activity_type === 'job_application' ? 'work' :
                                                activity.activity_type === 'company_visit' ? 'business' :
                                                    'check_circle'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                        {activity.activity_type?.replace('_', ' ')}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {activity.description || 'No description'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(activity.activity_timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <span className="material-symbols-outlined text-4xl mb-2">history</span>
                            <p>No activity history found.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ViewAllActivitiesModal;
