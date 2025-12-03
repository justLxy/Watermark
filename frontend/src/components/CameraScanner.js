'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { API_BASE } from '../utils/api';

const CameraScanner = ({ onCapture }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const intervalRef = useRef(null);
  const processingRef = useRef(false); // Track if a decode request is in-flight
  const CROP_RATIO = 0.9; // 90% of the shorter dimension to form square crop
  const [overlayStyle, setOverlayStyle] = useState({});
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const aspectRatioRef = useRef('1:1');

  useEffect(() => {
    aspectRatioRef.current = aspectRatio;
    updateOverlayStyle();
  }, [aspectRatio]);

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

    // Calculate crop size based on aspect ratio
    let targetW, targetH;
    const currentRatio = aspectRatioRef.current;
    
    if (currentRatio === '1:1') {
        const size = Math.min(actualVideoDisplayW, actualVideoDisplayH) * CROP_RATIO;
        targetW = size;
        targetH = size;
    } else if (currentRatio === '4:3') {
        const maxW = actualVideoDisplayW * CROP_RATIO;
        const maxH = actualVideoDisplayH * CROP_RATIO;
        if (maxW / maxH > 4/3) {
            targetH = maxH;
            targetW = targetH * 4/3;
        } else {
            targetW = maxW;
            targetH = targetW * 3/4;
        }
    } else if (currentRatio === '3:4') {
        const maxW = actualVideoDisplayW * CROP_RATIO;
        const maxH = actualVideoDisplayH * CROP_RATIO;
        if (maxW / maxH > 3/4) {
            targetH = maxH;
            targetW = targetH * 3/4;
        } else {
            targetW = maxW;
            targetH = targetW * 4/3;
        }
    }
    
    setOverlayStyle({
      width: `${targetW}px`,
      height: `${targetH}px`,
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

    // Determine centered crop region (on the original video frame)
    let srcW, srcH;
    const currentRatio = aspectRatioRef.current;

    if (currentRatio === '1:1') {
        const size = Math.min(videoW, videoH) * CROP_RATIO;
        srcW = size;
        srcH = size;
    } else if (currentRatio === '4:3') {
        const maxW = videoW * CROP_RATIO;
        const maxH = videoH * CROP_RATIO;
        if (maxW / maxH > 4/3) {
            srcH = maxH;
            srcW = srcH * 4/3;
        } else {
            srcW = maxW;
            srcH = srcW * 3/4;
        }
    } else if (currentRatio === '3:4') {
        const maxW = videoW * CROP_RATIO;
        const maxH = videoH * CROP_RATIO;
        if (maxW / maxH > 3/4) {
            srcH = maxH;
            srcW = srcH * 3/4;
        } else {
            srcW = maxW;
            srcH = srcW * 4/3;
        }
    }

    const cropX = (videoW - srcW) / 2;
    const cropY = (videoH - srcH) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, cropX, cropY, srcW, srcH, 0, 0, srcW, srcH);

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

      const response = await fetch(`${API_BASE}/decode`, {
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

  const startAutoScan = useCallback(() => {
    if (intervalRef.current) return; // Already scanning
    
    setScanning(true);
    setScanStatus('Scanning for watermarks...');
    
    const SCAN_INTERVAL = 1500; // ms – capture attempts every 1.5 s when idle

    intervalRef.current = setInterval(async () => {
      // Avoid piling up concurrent decode requests
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        const frameData = await captureFrame();
        if (!frameData) {
          processingRef.current = false;
          return;
        }

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
      } finally {
        processingRef.current = false;
      }
    }, SCAN_INTERVAL);
  }, [onCapture]);

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
        
        <div className="flex justify-center space-x-2 pb-2">
           <button 
             onClick={() => setAspectRatio('1:1')}
             className={`px-3 py-1 rounded text-sm ${aspectRatio === '1:1' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
           >
             Square (1:1)
           </button>
           <button 
             onClick={() => setAspectRatio('4:3')}
             className={`px-3 py-1 rounded text-sm ${aspectRatio === '4:3' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
           >
             Landscape (4:3)
           </button>
           <button 
             onClick={() => setAspectRatio('3:4')}
             className={`px-3 py-1 rounded text-sm ${aspectRatio === '3:4' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
           >
             Portrait (3:4)
           </button>
        </div>

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