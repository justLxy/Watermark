'use client';

import React, { useRef, useEffect, useState } from 'react';

const CameraScanner = ({ onCapture }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const intervalRef = useRef(null);
  const CROP_RATIO = 0.9; // 90% of the shorter dimension to form square crop
  const [overlayStyle, setOverlayStyle] = useState({});

  // Calculate overlay dimensions based on video aspect ratio
  const updateOverlayStyle = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    const videoAspect = videoW / videoH;

    // Get the display size of the video element
    const displayW = video.clientWidth;
    const displayH = video.clientHeight;
    const displayAspect = displayW / displayH;

    let actualVideoDisplayW, actualVideoDisplayH;
    
    // Video element default behavior is object-fit: contain
    // Calculate the actual rendered video dimensions within the element
    if (videoAspect > displayAspect) {
      // Video is wider - width fills container, height is letterboxed
      actualVideoDisplayW = displayW;
      actualVideoDisplayH = displayW / videoAspect;
    } else {
      // Video is taller - height fills container, width is pillarboxed
      actualVideoDisplayH = displayH;
      actualVideoDisplayW = displayH * videoAspect;
    }

    // Calculate square size (CROP_RATIO of shorter dimension in the actual video display)
    const squareSize = Math.min(actualVideoDisplayW, actualVideoDisplayH) * CROP_RATIO;
    
    setOverlayStyle({
      width: `${squareSize}px`,
      height: `${squareSize}px`,
    });
  };

  // Update overlay when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedMetadata = () => {
        updateOverlayStyle();
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Also update on window resize
      const handleResize = () => {
        setTimeout(updateOverlayStyle, 100); // Small delay to ensure layout is complete
      };
      window.addEventListener('resize', handleResize);
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  useEffect(() => {
    let stream;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setLoading(false);
        startAutoScan(); // Start automatic scanning when camera is ready
      } catch (err) {
        setError('Unable to access camera: ' + err.message);
        setLoading(false);
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return null;
    
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    if (!videoW || !videoH) return null;

    // Determine centered square crop region
    const dim = Math.min(videoW, videoH) * CROP_RATIO;
    const cropX = (videoW - dim) / 2;
    const cropY = (videoH - dim) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, cropX, cropY, dim, dim, 0, 0, dim, dim);

    return new Promise((resolve) => {
      canvas.toBlob(blob => {
        if (!blob) {
          resolve(null);
          return;
        }
        const file = new File([blob], `autoscan_${Date.now()}.png`, { type: 'image/png' });
        resolve({ file, blob });
      }, 'image/png');
    });
  };

  const checkForWatermark = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file, file.name);

      const response = await fetch('http://localhost:5001/decode', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.watermark && data.watermark.present;
      }
      return false;
    } catch (err) {
      console.error('Watermark check failed:', err);
      return false;
    }
  };

  const startAutoScan = () => {
    if (intervalRef.current) return; // Already scanning
    
    setScanning(true);
    setScanStatus('Scanning for watermarks...');
    
    intervalRef.current = setInterval(async () => {
      try {
        const frameData = await captureFrame();
        if (!frameData) return;

        setScanStatus('Checking frame...');
        const hasWatermark = await checkForWatermark(frameData.file);
        
        if (hasWatermark) {
          // Found watermark! Stop scanning and return result
          stopAutoScan();
          setScanStatus('Watermark detected!');
          const previewUrl = URL.createObjectURL(frameData.blob);
          onCapture(frameData.file, previewUrl);
        } else {
          setScanStatus('Scanning for watermarks...');
        }
      } catch (err) {
        console.error('Auto scan error:', err);
        setScanStatus('Scan error, retrying...');
      }
    }, 1000); // Check every 1 second
  };

  const stopAutoScan = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setScanning(false);
  };

  const handleManualCapture = async () => {
    const frameData = await captureFrame();
    if (frameData) {
      const previewUrl = URL.createObjectURL(frameData.blob);
      onCapture(frameData.file, previewUrl);
    }
  };

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {loading && <p className="text-sm text-gray-500">Initializing camera...</p>}
      
      <div className="relative">
        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg border" />
        
        {/* Scanning overlay */}
        {scanning && (
          <>
            {/* Center square overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="border-4 border-blue-500" 
                style={overlayStyle}
              ></div>
            </div>
            {/* Status badge */}
            <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs pointer-events-none">
              🔍 Auto Scanning
            </div>
          </>
        )}
      </div>

      {/* Status and controls */}
      <div className="space-y-2">
        {scanStatus && (
          <p className="text-sm text-center text-gray-600">{scanStatus}</p>
        )}
        
        <div className="flex space-x-2">
          {scanning ? (
            <button 
              onClick={stopAutoScan}
              className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Stop Auto Scan
            </button>
          ) : (
            <button 
              onClick={startAutoScan}
              className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Start Auto Scan
            </button>
          )}
          
          <button 
            onClick={handleManualCapture}
            className="flex-1 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Manual Capture
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraScanner; 