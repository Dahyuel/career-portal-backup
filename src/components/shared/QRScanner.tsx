// Simple QR Scanner component with camera controls
import React, { useEffect, useRef, useState } from 'react';
import { X, FlipHorizontal, Flashlight } from 'lucide-react';
import jsQR from 'jsqr';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Start camera
  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode }
        });

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Start scanning
        scanIntervalRef.current = window.setInterval(() => {
          scanQRCode();
        }, 300);
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions.');
      }
    };

    startCamera();

    return () => {
      // Cleanup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isOpen, facingMode]);

  // Scan QR Code
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
      onScan(code.data);
      handleClose();
    }
  };

  // Flip camera
  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Toggle flash (if supported)
  const handleToggleFlash = async () => {
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;

    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          // @ts-ignore
          advanced: [{ torch: !flashOn }]
        });
        setFlashOn(!flashOn);
      } catch (error) {
        console.error('Flash not supported:', error);
      }
    } else {
      alert('Flash is not supported on this device');
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-gray-300">{description}</p>
          </div>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="max-w-full max-h-full"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-4 border-orange-500 rounded-lg"></div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6">
        <div className="flex justify-center gap-4">
          {/* Cancel Button */}
          <button
            onClick={handleClose}
            className="flex-1 max-w-xs bg-red-600 text-white py-4 px-6 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <X className="h-5 w-5" />
            Cancel
          </button>

          {/* Flip Camera Button */}
          <button
            onClick={handleFlipCamera}
            className="flex-1 max-w-xs bg-gray-700 text-white py-4 px-6 rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <FlipHorizontal className="h-5 w-5" />
            Flip Camera
          </button>

          {/* Flash Button */}
          <button
            onClick={handleToggleFlash}
            className={`flex-1 max-w-xs py-4 px-6 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${flashOn
                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
          >
            <Flashlight className="h-5 w-5" />
            Flash
          </button>
        </div>
      </div>
    </div>
  );
};