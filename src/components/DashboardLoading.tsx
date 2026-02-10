import React from 'react';
import { motion } from 'framer-motion';

interface DashboardLoadingProps {
    message?: string;
    subMessage?: string;
}

const DashboardLoading: React.FC<DashboardLoadingProps> = ({
    message = "Loading Your Dashboard",
    subMessage = "Please wait while we prepare everything for you..."
}) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/5 dark:bg-red-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 text-center max-w-sm">
                {/* Spinner Container */}
                <div className="relative w-32 h-32 mx-auto mb-10">
                    {/* Outer Ring */}
                    <motion.div
                        className="absolute inset-0 border-4 border-red-100 dark:border-slate-800 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                    />

                    {/* Animated Spinner Ring */}
                    <motion.div
                        className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    />

                    {/* Secondary Pulse Ring */}
                    <motion.div
                        className="absolute inset-4 border-2 border-red-600/20 rounded-full"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* Central Icon */}
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-red-600 text-4xl leading-none">
                                school
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
                        {message}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        {subMessage}
                    </p>
                </motion.div>

                {/* Progress bar simulation */}
                <div className="mt-8 w-48 mx-auto h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-red-600"
                        animate={{
                            x: ["-100%", "100%"]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardLoading;
