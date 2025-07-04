'use client';

import React, { useState, useEffect } from 'react';
import { createC2pa } from 'c2pa';
import 'c2pa-wc/dist/components/Indicator';

const C2paDisplay = ({ file }) => {
  const [manifestStore, setManifestStore] = useState(null);
  const [lookedUpManifest, setLookedUpManifest] = useState(null);
  const [decodedWatermark, setDecodedWatermark] = useState(null);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [c2paInstance, setC2paInstance] = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  // Effect to initialize the C2PA library once on component mount
  useEffect(() => {
    createC2pa({
      wasmSrc: '/c2pa/c2pa.wasm',
      workerSrc: '/c2pa/c2pa.worker.js',
    }).then(instance => {
      setC2paInstance(instance);
    }).catch(err => {
        console.error("Failed to initialize C2PA library", err);
        setError("Could not load the Content Credentials library.");
    });
  }, []);

  useEffect(() => {
    // Reset state when file changes or is cleared
    setManifestStore(null);
    setLookedUpManifest(null);
    setDecodedWatermark(null);
    setError(null);
    setShowRaw(false);
    setShowPanel(false);

    if (file && c2paInstance) {
      const processFile = async () => {
        let embeddedManifest = null;
        try {
          const fileBlob = file instanceof File ? file : await (await fetch(file)).blob();

          // 1. Try to read embedded C2PA manifest
          try {
            const result = await c2paInstance.read(fileBlob);
            const store = result.manifestStore || result;
            if (store && store.activeManifest) {
              embeddedManifest = store;
            }
          } catch (c2paError) {
            console.warn(`C2PA read failed: ${c2paError.message}. Proceeding to watermark check.`);
          }

          if (embeddedManifest) {
            setManifestStore(embeddedManifest);
            return; // Found embedded C2PA, work is done.
          }

          // 2. If no embedded manifest, try decoding watermark & lookup from DB
          try {
            const formData = new FormData();
            const fileName = file.name || 'captured.png';
            formData.append('image', fileBlob, fileName);

            const decodeResponse = await fetch('http://localhost:5001/decode', {
              method: 'POST',
              body: formData,
            });

            if (decodeResponse.ok) {
              const decodeData = await decodeResponse.json();
              if (decodeData.watermark && decodeData.watermark.present) {
                const watermarkId = decodeData.watermark.secret;
                
                // 3. Got watermark ID, now look it up in our database
                const lookupResponse = await fetch('http://localhost:5001/lookup-by-watermark', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ watermark_id: watermarkId }),
                });

                if (lookupResponse.ok) {
                  const lookedUpData = await lookupResponse.json();
                  // The backend returns the raw manifest, we need to wrap it slightly
                  // for our component rendering functions to work consistently.
                  setLookedUpManifest({ activeManifest: lookedUpData });
                } else {
                  // DB lookup failed, so just show the watermark ID as the final fallback.
                  console.warn(`DB lookup failed for ${watermarkId}. Showing watermark only.`);
                  setDecodedWatermark(decodeData.watermark);
                }
              }
          } else {
              console.error('Decode fallback request failed.');
            }
          } catch (decodeError) {
            console.error('Error during watermark fallback decoding:', decodeError);
          }
        } catch (processingError) {
          console.error("A critical error occurred during file processing:", processingError);
          setError("Could not process the file.");
        }
      };
      processFile();
    }
  }, [file, c2paInstance]);

  const findAssertion = (label, manifest) => {
    const assertionsRoot = manifest?.activeManifest?.assertions;
    if (!assertionsRoot) {
      return null;
    }

    // The C2PA SDK nests the assertions array in a 'data' property,
    // while our DB-retrieved manifest has the array at the root. This handles both.
    const assertionsArray = Array.isArray(assertionsRoot)
      ? assertionsRoot
      : assertionsRoot.data;

    if (!Array.isArray(assertionsArray)) {
      return null;
    }

    return assertionsArray.find(a => a.label === label);
  };
  
  const renderCreativeWork = (manifest) => {
    const creativeWorkAssertion = findAssertion('stds.schema-org.CreativeWork', manifest);
    if (!creativeWorkAssertion) return null;
    const { author, name, description, url } = creativeWorkAssertion.data;
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-slate-800 tracking-wide">CREATIVE WORK</h4>
        </div>
        <div className="space-y-2 ml-4">
          {name && (
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Title</span>
              <span className="text-sm text-slate-700 font-medium">{name}</span>
            </div>
          )}
          {author && (
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Author</span>
              <span className="text-sm text-slate-700 font-medium">{author.map(a => a.name).join(', ')}</span>
            </div>
          )}
          {description && (
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Description</span>
              <span className="text-sm text-slate-700">{description}</span>
            </div>
          )}
          {url && (
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wider">URL</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200 break-all">{url}</a>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderClaimGenerator = (manifest) => {
    const actionsAssertion = findAssertion('c2pa.actions', manifest);
    const createdAction = actionsAssertion?.data?.actions?.find(a => a.action === 'c2pa.created');
    const softwareAgent = createdAction?.softwareAgent || manifest?.activeManifest?.claim_generator;

    if (!softwareAgent) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-slate-800 tracking-wide">PROCESSING SOFTWARE</h4>
        </div>
        <div className="ml-4">
          <span className="text-sm text-slate-700 font-medium">{softwareAgent}</span>
        </div>
      </div>
    );
  }

  const renderSourceType = (manifest) => {
    const actionsAssertion = findAssertion('c2pa.actions', manifest);
    const createdAction = actionsAssertion?.data?.actions?.find(a => a.action === 'c2pa.created');
    const sourceType = createdAction?.digitalSourceType;

    if (!sourceType) return null;

    // Make the long URL more human-readable
    const typeMap = {
      'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture': 'Digital Capture',
      'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia': 'AI-Generated',
      'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia': 'Composite with AI',
      'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation': 'Digital Creation',
    };
    const displayName = typeMap[sourceType] || sourceType;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-slate-800 tracking-wide">DIGITAL SOURCE</h4>
        </div>
        <div className="ml-4">
          <span className="text-sm text-slate-700 font-medium">{displayName}</span>
        </div>
      </div>
    );
  };

  const renderContent = (manifest) => {
    if (!manifest?.activeManifest) {
      return (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No content credentials found</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {renderCreativeWork(manifest)}
        {renderClaimGenerator(manifest)}
        {renderSourceType(manifest)}
      </div>
    );
  }

  const formatSignatureInfo = (manifest) => {
    // The signature_info from the DB has a different key name than the one from the SDK
    const signature = manifest?.activeManifest?.signature_info || manifest?.activeManifest?.signatureInfo;
    if (!signature) return null;
    
    const issuer = signature.issuer || 'Unknown';
    const date = signature.time ? new Date(signature.time).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) : 'Unknown date';
    
    return `Issued by ${issuer} on ${date}`;
  }

  // Render nothing if there is a critical error
  if (error) {
    return null;
  }

  // Decide which manifest to display, prioritizing the one embedded in the file
  const activeManifestData = manifestStore || lookedUpManifest;

  // Render C2PA panel if a manifest is available (either embedded or looked up)
  if (activeManifestData) {
    const signatureInfoText = formatSignatureInfo(activeManifestData);
  return (
      <div className="absolute top-2 right-2 z-10">
        {/* C2PA Indicator */}
        <div 
          className="group cursor-pointer transition-all duration-300 hover:scale-110"
          onClick={() => setShowPanel(prev => !prev)}
        >
          <div className="relative">
            <cai-indicator className="drop-shadow-lg"></cai-indicator>
            <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300"></div>
          </div>
      </div>

        {showPanel && (
          <div className="absolute top-full right-0 mt-3 z-20 w-72 sm:w-80 md:w-96 max-w-xs sm:max-w-sm">
            <div className="backdrop-blur-xl bg-white/95 border border-white/30 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100"></div>
                <div className="relative p-4 border-b border-slate-200/50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800">
                        Content Credentials
                      </h3>
                      {signatureInfoText && (
                        <p className="text-xs text-slate-600 mt-2 font-medium">
                          {signatureInfoText}
                        </p>
                      )}
                    </div>
              <button
                      onClick={() => setShowPanel(false)} 
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100/80 hover:bg-slate-200/80 transition-colors duration-200 group ml-3"
              >
                      <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-800 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
              </button>
            </div>
                </div>
              </div>
            
              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                {renderContent(activeManifestData)}

                {/* Raw data toggle */}
                <div className="mt-6 pt-4 border-t border-slate-200/50">
                  <button 
                    onClick={() => setShowRaw(!showRaw)} 
                    className="group flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-800 transition-colors duration-200"
                  >
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showRaw ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="uppercase tracking-wider font-medium">{showRaw ? 'Hide' : 'Show'} Raw Data</span>
                  </button>
                  {showRaw && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200">
                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                        <span className="text-xs text-slate-600 font-medium uppercase tracking-wider">Raw Manifest</span>
                      </div>
                      <pre className="p-4 bg-slate-900 text-green-400 text-xs overflow-auto max-h-48 font-mono">
                        {JSON.stringify(activeManifestData, null, 2)}
                      </pre>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Watermark fallback panel if ONLY a non-registered watermark is found
  if (decodedWatermark) {
    return (
       <div className="absolute top-2 right-2 z-10">
        <div 
          className="group cursor-pointer transition-all duration-300 hover:scale-110"
          onClick={() => setShowPanel(prev => !prev)}
        >
          {/* Custom TrustMark icon */}
          <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg">
              TM
          </div>
        </div>
        
        {showPanel && (
            <div className="absolute top-full right-0 mt-3 z-20 w-80 max-w-sm">
                <div className="backdrop-blur-xl bg-white/95 border border-white/30 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Simplified Header */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-200/50">
                      <h3 className="font-bold text-slate-800">TrustMark Watermark</h3>
                       <button 
                        onClick={() => setShowPanel(false)} 
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100/80 hover:bg-slate-200/80 transition-colors duration-200 group"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {/* Content */}
                    <div className="p-4 space-y-3 text-sm">
                        <p className="text-slate-600">No registered Content Credentials found.</p>
                        <div className="flex flex-col pt-2">
                          <span className="text-xs text-slate-500 uppercase tracking-wider">Watermark ID</span>
                          <span className="text-slate-700 font-mono break-all text-xs">{decodedWatermark.secret}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 uppercase tracking-wider">Schema</span>
                          <span className="text-slate-700">{decodedWatermark.schema}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  // Render nothing if no manifest or watermark is found
  return null;
};

export default C2paDisplay; 