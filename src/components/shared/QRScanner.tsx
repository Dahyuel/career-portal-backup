// QR Scanner component using html5-qrcode library - Floating Card Version
import React, { useEffect, useRef, useState } from 'react';
import { X, FlipHorizontal, Flashlight } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
  description?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan QR Code',
  description = 'Point your camera at a QR code'
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-scanner-container';

  // Start scanner when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const startScanner = async () => {
      try {
        setError(null);
        setIsScanning(true);

        // Create scanner instance
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = html5QrCode;

        // Get camera configuration
        const cameraConfig = {
          facingMode: facingMode
        };

        // Start scanning
        await html5QrCode.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: { width: 200, height: 200 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            // On successful scan
            console.log('QR Code scanned:', decodedText);
            onScan(decodedText);
            handleClose();
          },
          () => {
            // Ignore scanning errors (happens when no QR code is visible)
          }
        );
      } catch (err: any) {
        console.error('Error starting scanner:', err);
        setError(err.message || 'Unable to access camera. Please check permissions.');
        setIsScanning(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timeout);
      stopScanner();
    };
  }, [isOpen, facingMode]);

  // Stop scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  // Flip camera
  const handleFlipCamera = async () => {
    await stopScanner();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Toggle flash (if supported)
  const handleToggleFlash = async () => {
    if (!html5QrCodeRef.current) return;

    try {
      const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
      const torchFeature = capabilities.torchFeature();

      if (torchFeature && torchFeature.isSupported()) {
        await torchFeature.apply(!flashOn);
        setFlashOn(!flashOn);
      } else {
        setError('Flash is not supported on this device');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err: any) {
      console.error('Flash error:', err);
      setError('Flash is not supported on this device');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Floating Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-orange-500 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-sm text-white/80">{description}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500 text-white px-4 py-2 text-center text-sm">
            {error}
          </div>
        )}

        {/* Camera View */}
        <div className="relative bg-black aspect-square overflow-hidden">
          <div
            id={scannerContainerId}
            className="w-full h-full"
          />

          {/* Loading indicator */}
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3"></div>
                <p className="text-sm">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-slate-100 dark:bg-zinc-800 p-4">
          <div className="flex justify-center gap-3">
            {/* Cancel Button */}
            <button
              onClick={handleClose}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 text-sm"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>

            {/* Flip Camera Button */}
            <button
              onClick={handleFlipCamera}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 px-4 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 text-sm"
            >
              <FlipHorizontal className="h-4 w-4" />
              Flip
            </button>

            {/* Flash Button */}
            <button
              onClick={handleToggleFlash}
              className={`flex-1 py-3 px-4 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 text-sm ${flashOn
                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                : 'bg-slate-600 text-white hover:bg-slate-700'
                }`}
            >
              <Flashlight className="h-4 w-4" />
              Flash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};