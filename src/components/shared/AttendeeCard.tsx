// AttendeeCard component with framer-motion animations and dark mode support
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, X } from 'lucide-react';
import QRCode from 'qrcode';

interface AttendeeCardProps {
  attendee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    personal_id: string;
    university?: string;
    faculty?: string;
    profile_photo_url?: string;
  };
  onClose: () => void;
  children?: React.ReactNode;
}

export const AttendeeCard: React.FC<AttendeeCardProps> = ({ attendee, onClose, children }) => {
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (showQR && attendee.personal_id) {
      QRCode.toDataURL(attendee.personal_id, { width: 200, margin: 1 })
        .then(url => setQrUrl(url))
        .catch(err => console.error('QR Gen Error:', err));
    }
  }, [showQR, attendee.personal_id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 relative z-10 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Profile Image/Icon */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col items-center mb-6"
        >
          {attendee.profile_photo_url ? (
            <img
              src={attendee.profile_photo_url}
              alt={`${attendee.first_name} ${attendee.last_name}`}
              className="w-24 h-24 rounded-full object-cover mb-4 ring-4 ring-orange-100 dark:ring-orange-500/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center mb-4 ring-4 ring-orange-50 dark:ring-orange-500/10">
              <User className="h-12 w-12 text-orange-600 dark:text-orange-400" />
            </div>
          )}

          {/* Name */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {attendee.first_name} {attendee.last_name}
          </h2>
        </motion.div>

        {/* Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 mb-6"
        >
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Email</p>
            <p className="text-gray-900 dark:text-white text-sm mt-0.5">{attendee.email}</p>
          </div>

          {attendee.phone && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Phone</p>
              <p className="text-gray-900 dark:text-white text-sm mt-0.5">{attendee.phone}</p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Personal ID</p>
            <p className="text-gray-900 dark:text-white text-sm mt-0.5">{attendee.personal_id}</p>
          </div>

          {attendee.university && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">University</p>
              <p className="text-gray-900 dark:text-white text-sm mt-0.5">{attendee.university}</p>
            </div>
          )}

          {attendee.faculty && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Faculty</p>
              <p className="text-gray-900 dark:text-white text-sm mt-0.5">{attendee.faculty}</p>
            </div>
          )}
        </motion.div>

        {/* Show QR Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => setShowQR(!showQR)}
          className="w-full bg-orange-500 text-white py-3 rounded-xl hover:bg-orange-600 transition-colors font-bold shadow-lg shadow-orange-500/20 active:scale-[0.98]"
        >
          {showQR ? 'Hide QR' : 'Show QR'}
        </motion.button>

        {/* QR Code Display */}
        {showQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-6 flex flex-col items-center overflow-hidden"
          >
            <div className="bg-white p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR code for ${attendee.personal_id}`}
                  className="w-[200px] h-[200px]"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 rounded-lg">
                  Generating...
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Scan this QR code</p>
          </motion.div>
        )}

        {/* Custom Actions */}
        {children && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800"
          >
            {children}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};