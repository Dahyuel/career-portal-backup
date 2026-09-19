import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, FlipHorizontal } from '../icons';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
  description?: string;
}

const SCANNER_DIV_ID = 'html5-qrcode-scanner';

export const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan QR Code',
  description = 'Point your camera at a QR code',
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScanned = useRef(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    hasScanned.current = false;
    setError(null);
    setIsReady(false);

    const init = async () => {
      // Wait for the DOM element to be ready
      await new Promise(r => setTimeout(r, 300));
      if (cancelled) return;

      const el = document.getElementById(SCANNER_DIV_ID);
      if (!el) return;

      try {
        await stopScanner();
        if (cancelled) return;

        const scanner = new Html5Qrcode(SCANNER_DIV_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            if (hasScanned.current) return;
            hasScanned.current = true;
            onScan(decodedText);
            handleClose();
          },
          () => {
            // scan failure per frame — ignore
          }
        );

        if (cancelled) {
          await stopScanner();
          return;
        }

        setIsReady(true);
      } catch (err: any) {
        if (cancelled) return;
        console.error('QR Scanner Error:', err);
        const msg = (err?.message || String(err)).toLowerCase();

        if (msg.includes('permission') || msg.includes('notallowed') || msg.includes('denied')) {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (msg.includes('notfound') || msg.includes('not found') || msg.includes('devicenotfound')) {
          setError('No camera found on this device.');
        } else if (msg.includes('notreadable') || msg.includes('in use')) {
          setError('Camera is in use by another app. Please close it and try again.');
        } else {
          setError('Could not start camera: ' + (err?.message || err));
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      stopScanner();
      setIsReady(false);
    };
  }, [isOpen, facingMode]);

  const handleFlip = async () => {
    setIsReady(false);
    setError(null);
    await stopScanner();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-orange-500 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-sm text-white/80">{description}</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500 text-white px-4 py-4 text-center text-sm flex flex-col items-center gap-3">
            <p className="font-medium text-base">{error}</p>
            {error.includes('settings') && (
              <div className="text-sm bg-black/20 p-3 rounded-xl w-full text-left">
                <p className="font-bold mb-1">How to fix:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Tap the 🔒 icon in your browser address bar</li>
                  <li>Find Camera and set it to Allow</li>
                  <li>Reload the page</li>
                </ol>
              </div>
            )}
            <button
              onClick={() => {
                setError(null);
                setIsReady(false);
                setFacingMode(f => f === 'environment' ? 'environment' : 'user');
              }}
              className="mt-2 bg-white text-red-600 font-bold px-6 py-2 rounded-xl hover:bg-red-50 transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Camera View */}
        <div className="relative bg-black w-full aspect-square overflow-hidden">

          {/* html5-qrcode renders INTO this div */}
          <div
            id={SCANNER_DIV_ID}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
          />

          {/* Corner overlay — shown once ready */}
          {isReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[65%] aspect-square border-2 border-white/40 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
              </div>
            </div>
          )}

          {/* Loading spinner */}
          {!isReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3" />
                <p className="text-sm">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-slate-100 dark:bg-zinc-800 p-4">
          <div className="flex justify-center gap-3">
            <button
              onClick={handleClose}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              onClick={handleFlip}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
            >
              <FlipHorizontal className="h-4 w-4" /> Flip
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};