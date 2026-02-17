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
        success: 'bg-green-500 dark:bg-green-600 text-white',
        error: 'bg-red-500 dark:bg-red-600 text-white',
        info: 'bg-blue-500 dark:bg-blue-600 text-white',
        warning: 'bg-amber-500 dark:bg-amber-600 text-white'
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
                className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl max-w-sm w-full md:w-auto ${styles[type]}`}
            >
                <div className="shrink-0">
                    <span className="material-symbols-outlined text-2xl text-white">{icons[type]}</span>
                </div>
                <p className="font-semibold text-sm leading-tight flex-1 text-white">{message}</p>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"
                >
                    <span className="material-symbols-outlined text-lg text-white opacity-80">close</span>
                </button>
            </motion.div>
        </div>
    );
};

export default Toast;