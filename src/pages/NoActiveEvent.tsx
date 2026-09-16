import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, LogOut } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';

const NoActiveEvent: React.FC = () => {
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 text-center"
            >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No Active Event
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {profile?.role && profile.role !== 'attendee'
                        ? `Your role (${profile.role}) requires an active event to be configured. Please contact the event administrator.`
                        : 'Registrations are not open yet. Please check back later or contact support.'}
                </p>
                <button
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </motion.div>
        </div>
    );
};

export default NoActiveEvent;