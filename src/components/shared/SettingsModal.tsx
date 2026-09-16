import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Check } from '../icons';

interface SettingsModalProps {
    onClose: () => void;
}

const SettingsModal = forwardRef<HTMLDivElement, SettingsModalProps>(({ onClose }, ref) => {
    const { theme, toggleTheme, isDark } = useTheme();


    return (
        <div ref={ref} className="fixed inset-0 flex items-center justify-center p-4 z-[100]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-8">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl font-bold text-slate-800 dark:text-white"
                    >
                        Settings
                    </motion.h2>
                    <motion.button
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        whileHover={{ rotate: 90, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </motion.button>
                </div>

                <div className="space-y-6">
                    {/* Theme Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-3"
                    >
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Appearance</p>
                        <div className="grid grid-cols-2 gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => theme !== 'light' && toggleTheme()}
                                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${!isDark
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                                    }`}
                            >
                                <Sun className="w-5 h-5" />
                                <span className="font-bold">Light</span>
                                {!isDark && <Check className="w-4 h-4 ml-auto" />}
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => theme !== 'dark' && toggleTheme()}
                                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${isDark
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                                    }`}
                            >
                                <Moon className="w-5 h-5" />
                                <span className="font-bold">Dark</span>
                                {isDark && <Check className="w-4 h-4 ml-auto" />}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800"
                >
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                    >
                        Done
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
});

SettingsModal.displayName = 'SettingsModal';

export default SettingsModal;
