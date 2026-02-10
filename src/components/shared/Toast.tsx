import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const variants = {
        initial: { opacity: 0, y: -20, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -20, scale: 0.9 }
    };

    const styles = {
        success: 'bg-green-50/90 border-green-200 text-green-800 dark:bg-green-900/40 dark:border-green-800 dark:text-green-300',
        error: 'bg-red-50/90 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-800 dark:text-red-300',
        info: 'bg-blue-50/90 border-blue-200 text-blue-800 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300',
        warning: 'bg-amber-50/90 border-amber-200 text-amber-800 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300'
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-[10000] flex justify-center w-full md:w-auto px-4 pointer-events-none">
            <motion.div
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl backdrop-blur-md max-w-sm w-full md:w-auto ${styles[type]}`}
            >
                <div className={`p-1.5 rounded-full shrink-0 ${type === 'success' ? 'bg-green-100 dark:bg-green-800' : type === 'error' ? 'bg-red-100 dark:bg-red-800' : type === 'warning' ? 'bg-amber-100 dark:bg-amber-800' : 'bg-blue-100 dark:bg-blue-800'}`}>
                    <span className="material-symbols-outlined text-lg">{icons[type]}</span>
                </div>
                <p className="font-semibold text-sm leading-tight flex-1">{message}</p>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors shrink-0"
                >
                    <span className="material-symbols-outlined text-lg opacity-60">close</span>
                </button>
            </motion.div>
        </div>
    );
};

export default Toast;
