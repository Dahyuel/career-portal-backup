import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../Landing page/Navbar';

interface ErrorPageProps {
  title?: string;
  message?: string;
  errorDetails?: string;
  onRetry?: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  title = "Aaaah! Something went wrong.",
  message,
  onRetry,
}) => {
  const navigate = useNavigate();

  return (
    <div className="h-screen h-[100dvh] overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col selection:bg-asu-red/20 selection:text-asu-red">
      {/* Landing Navbar (includes theme toggle) */}
      <Navbar />

      {/* Page Content - Flex container fitting exactly within remaining height */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-4 sm:pb-6 relative overflow-hidden max-w-4xl mx-auto w-full">

        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-radial from-asu-red/5 dark:from-asu-red/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[500px] sm:h-[500px] bg-asu-red/5 dark:bg-asu-red/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── Main Centered Block: Illustration -> Title -> Message -> Buttons ── */}
        <div className="my-auto flex flex-col items-center justify-center w-full max-w-sm sm:max-w-md">

          {/* ── Illustration (Parachutist falling) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 max-h-[35vh] sm:max-h-[42vh] md:max-h-[44vh] flex items-center justify-center w-full my-2"
          >
            <img
              src="/images/parachute-error-red.png"
              alt="Skydiver error page illustration"
              className="max-h-[35vh] sm:max-h-[42vh] md:max-h-[44vh] w-auto object-contain select-none filter dark:brightness-105 dark:contrast-105 dark:drop-shadow-[0_10px_25px_rgba(220,38,38,0.15)]"
              draggable={false}
            />
          </motion.div>

          {/* ── Title (Bold heading below photo) ── */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center mt-2 mb-6 sm:mb-8"
          >
            {title}
          </motion.h1>

          {/* ── Optional Description Message (Directly beneath title) ── */}
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="relative z-10 text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed text-center mb-8 sm:mb-12 px-2 max-w-sm"
            >
              {message}
            </motion.p>
          )}

          {/* ── Side-by-side Action Buttons ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="relative z-10 flex flex-row items-center justify-center gap-2 sm:gap-4 w-full max-w-xs sm:max-w-md mx-auto mt-2 sm:mt-4"
          >
            <button
              onClick={onRetry || (() => navigate(-1))}
              className="flex-1 px-3 sm:px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-semibold active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors shadow-sm whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Return Back
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-3 sm:px-5 py-3 rounded-xl bg-asu-red hover:bg-asu-red-light text-white font-semibold shadow-md shadow-asu-red/20 active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Back Home
            </button>
          </motion.div>

        </div>

      </div>
    </div>
  );
};

export default ErrorPage;
