// Simple AttendeeCard component - No animations, clean design
import React, { useState, useEffect } from 'react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Profile Image/Icon */}
        <div className="flex flex-col items-center mb-6">
          {attendee.profile_photo_url ? (
            <img
              src={attendee.profile_photo_url}
              alt={`${attendee.first_name} ${attendee.last_name}`}
              className="w-24 h-24 rounded-full object-cover mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <User className="h-12 w-12 text-orange-600" />
            </div>
          )}

          {/* Name */}
          <h2 className="text-2xl font-bold text-gray-900">
            {attendee.first_name} {attendee.last_name}
          </h2>
        </div>

        {/* Information */}
        <div className="space-y-3 mb-6">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900">{attendee.email}</p>
          </div>

          {attendee.phone && (
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-900">{attendee.phone}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500">Personal ID</p>
            <p className="text-gray-900">{attendee.personal_id}</p>
          </div>

          {attendee.university && (
            <div>
              <p className="text-sm text-gray-500">University</p>
              <p className="text-gray-900">{attendee.university}</p>
            </div>
          )}

          {attendee.faculty && (
            <div>
              <p className="text-sm text-gray-500">Faculty</p>
              <p className="text-gray-900">{attendee.faculty}</p>
            </div>
          )}
        </div>

        {/* Show QR Button */}
        <button
          onClick={() => setShowQR(!showQR)}
          className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
        >
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>

        {/* QR Code Display */}
        {showQR && (
          <div className="mt-6 flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR code for ${attendee.personal_id}`}
                  className="w-[200px] h-[200px]"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-50 text-gray-400">
                  Generating...
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">Scan this QR code</p>
          </div>
        )}

        {/* Custom Actions */}
        {children && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};