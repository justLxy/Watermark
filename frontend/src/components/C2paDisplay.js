'use client';

import React, { useState, useEffect } from 'react';
import { createC2pa } from '@contentauth/c2pa-web/inline';
import 'c2pa-wc/dist/components/Indicator';
import { API_BASE } from '../utils/api';

function getResolverUrl(didOrUrl) {
  if (!didOrUrl) return "#";
  if (/^https?:\/\//i.test(didOrUrl)) {
    return didOrUrl;
  }
  return `https://dev.uniresolver.io/1.0/identifiers/${encodeURIComponent(didOrUrl)}`;
}

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  };
};

const getActiveManifestObject = (manifestStore) => {
  if (!manifestStore) return null;
  if (manifestStore.activeManifest && typeof manifestStore.activeManifest === 'object') {
    return manifestStore.activeManifest;
  }
  if (typeof manifestStore.activeManifest === 'string' && manifestStore.manifests) {
    return manifestStore.manifests[manifestStore.activeManifest] || null;
  }
  if (typeof manifestStore.active_manifest === 'string' && manifestStore.manifests) {
    return manifestStore.manifests[manifestStore.active_manifest] || null;
  }
  if (manifestStore.manifests && typeof manifestStore.manifests === 'object') {
    return Object.values(manifestStore.manifests).find(
      (manifest) => typeof manifest === 'object' && manifest !== null
    ) || null;
  }
  return null;
};

const getSoftwareAgentName = (softwareAgent) => {
  if (!softwareAgent) return null;
  if (typeof softwareAgent === 'string') return softwareAgent;
  return softwareAgent.name || null;
};

const getRelationshipMeta = (relationship) => {
  switch (relationship) {
    case 'parentOf':
      return {
        label: 'Parent asset',
        description: 'The current file is derived from this earlier asset or rendition.',
      };
    case 'componentOf':
      return {
        label: 'Placed component',
        description: 'This ingredient is composited into the current asset.',
      };
    case 'inputTo':
      return {
        label: 'Computational input',
        description: 'This ingredient was used as an input to a generation or editing process.',
      };
    default:
      return {
        label: relationship || 'Ingredient',
        description: 'This ingredient contributes to the current asset.',
      };
  }
};

const getActionMeta = (actionName) => {
  switch (actionName) {
    case 'c2pa.opened':
      return 'Opened the parent asset.';
    case 'c2pa.placed':
      return 'Placed one or more component ingredients into the composition.';
    case 'c2pa.created':
      return 'Created the current asset state represented by this manifest.';
    default:
      return actionName?.replace(/^c2pa\./, '').replace(/\./g, ' ') || 'Recorded processing step.';
  }
};

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
    createC2pa().then(instance => {
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
            const reader = await c2paInstance.reader.fromBlob(
              fileBlob.type || 'application/octet-stream',
              fileBlob
            );
            const store = await reader.manifestStore();
            await reader.free();

            if (store && getActiveManifestObject(store)) {
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

            const decodeResponse = await fetch(`${API_BASE}/decode`, {
              method: 'POST',
              body: formData,
            });

            if (decodeResponse.ok) {
              const decodeData = await decodeResponse.json();
              if (decodeData.watermark && decodeData.watermark.present) {
                const watermarkId = decodeData.watermark.secret;
                
                // 3. Got watermark ID, now look it up in our database
                const lookupResponse = await fetch(`${API_BASE}/lookup-by-watermark`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ watermark_id: watermarkId }),
                });

                if (lookupResponse.ok) {
                  const lookedUpData = await lookupResponse.json();
                  
                  // Reconstruct a manifestStore-like object from the backend data
                  const reconstructedManifest = lookedUpData.manifest;
                  if (lookedUpData.verifiable_credential) {
                    // Re-inject the VC as an assertion, just like it would be in a real file
                    if (!reconstructedManifest.assertions) {
                        reconstructedManifest.assertions = [];
                    }
                    reconstructedManifest.assertions.push({
                      label: 'com.trustmark.authorization',
                      data: lookedUpData.verifiable_credential,
                    });
                  }
                  setLookedUpManifest({ activeManifest: reconstructedManifest, source: 'database' });
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

  const findAssertion = (label, manifestStore) => {
    // First, try the active manifest, which is the most common case.
    const activeManifest = getActiveManifestObject(manifestStore);
    if (activeManifest) {
        const assertionsRoot = activeManifest.assertions;
        if (assertionsRoot) {
            const assertionsArray = Array.isArray(assertionsRoot) ? assertionsRoot : assertionsRoot.data;
            if (Array.isArray(assertionsArray)) {
                const found = assertionsArray.find(a => a.label.startsWith(label));
                if (found) return found;
            }
        }
    }

    // If not found, search all manifests. This handles cases like OpenAI's
    // where info is in a non-active (e.g., child) manifest.
    if (!manifestStore?.manifests) return null;

    for (const manifest of Object.values(manifestStore.manifests)) {
      if (typeof manifest !== 'object' || manifest === null) continue;

      const assertionsRoot = manifest.assertions;
      if (!assertionsRoot) continue;
      
      const assertionsArray = Array.isArray(assertionsRoot) ? assertionsRoot : assertionsRoot.data;
      if (!Array.isArray(assertionsArray)) continue;

      const found = assertionsArray.find(a => a.label.startsWith(label));
      if (found) return found;
    }

    return null;
  };

  const renderProvenanceFlow = (manifest) => {
    const activeManifest = getActiveManifestObject(manifest);
    const ingredients = activeManifest?.ingredients || [];
    const actionsAssertion = findAssertion('c2pa.actions', manifest);
    const actions = actionsAssertion?.data?.actions || [];

    if (!ingredients.length && !actions.length) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-slate-800 tracking-wide">PROVENANCE FLOW</h4>
        </div>
        <div className="ml-4 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Ingredient relationships below follow the current C2PA v3 model: `parentOf` marks the earlier asset version,
            `componentOf` marks placed source material, and `inputTo` marks computational inputs.
          </p>

          {ingredients.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Ingredients</span>
              {ingredients.map((ingredient, index) => {
                const meta = getRelationshipMeta(ingredient.relationship);
                return (
                  <div key={ingredient.instance_id || ingredient.instanceId || ingredient.label || index} className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {ingredient.title || `Ingredient ${index + 1}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{meta.description}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
                        {meta.label}
                      </span>
                    </div>
                    {(ingredient.format || ingredient.instance_id || ingredient.instanceId) && (
                      <div className="mt-2 space-y-1">
                        {ingredient.format && (
                          <div className="text-xs text-slate-500">Format: <span className="text-slate-700">{ingredient.format}</span></div>
                        )}
                        {(ingredient.instance_id || ingredient.instanceId) && (
                          <div className="text-xs text-slate-500 break-all">Instance ID: <span className="text-slate-700 font-mono">{ingredient.instance_id || ingredient.instanceId}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {actions.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Actions</span>
              {actions.map((action, index) => {
                const linkedCount = action?.parameters?.ingredientIds?.length || action?.parameters?.ingredients?.length || 0;
                const agentName = getSoftwareAgentName(action.softwareAgent);
                return (
                  <div key={`${action.action}-${index}`} className="rounded-xl border border-slate-200/70 bg-white/80 p-3">
                    <div className="text-sm font-medium text-slate-800">{action.action?.replace(/^c2pa\./, '') || 'action'}</div>
                    <div className="text-xs text-slate-500 mt-1">{getActionMeta(action.action)}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {agentName && <span>Software: <span className="text-slate-700">{agentName}</span></span>}
                      {linkedCount > 0 && <span>Linked ingredients: <span className="text-slate-700">{linkedCount}</span></span>}
                      {action.digitalSourceType && <span>Source type recorded</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAuthorization = (manifest) => {
    const authAssertion = findAssertion('com.trustmark.authorization', manifest);
    if (!authAssertion) return null;

    const vc = authAssertion.data;
    const subject = vc.credentialSubject;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-slate-800 tracking-wide">AUTHORIZATION LICENSE</h4>
        </div>
        <div className="space-y-2 ml-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Issued to (Buyer)</span>
            <a 
              href={getResolverUrl(subject.id)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 font-mono break-all"
              title="Open buyer identifier"
            >
              {subject.id}
            </a>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Issued by (Author)</span>
             <a 
              href={getResolverUrl(vc.issuer)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-slate-700 font-mono break-all"
              title="Open issuer identifier"
            >
              {vc.issuer}
            </a>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase tracking-wider">License Terms</span>
            <span className="text-sm text-slate-700">{subject.license}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Issued on</span>
            <span className="text-sm text-slate-700">{new Date(vc.issuanceDate).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderCreativeWork = (manifest) => {
    const metadataAssertion = findAssertion('c2pa.metadata', manifest);
    const metadata = metadataAssertion?.data || {};
    const identifiers = Array.isArray(metadata['dc:identifier'])
      ? metadata['dc:identifier']
      : metadata['dc:identifier']
        ? [metadata['dc:identifier']]
        : [];
    const rawDid = identifiers.find((value) => typeof value === 'string' && value.startsWith('did:'));
    const shortUrl = identifiers.find(
      (value) => typeof value === 'string' && /^https?:\/\/did\.art\//i.test(value)
    );
    const canonicalUrl = metadata['dc:relation'];

    const articulatorAssertion = findAssertion('com.articulator.metadata', manifest);
    const articulatorData = articulatorAssertion?.data;
    if (articulatorData) {
      const authorData = articulatorData['schema:author'];
      const authorName = authorData?.['schema:name'];
      return (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            <h4 className="text-sm font-semibold text-slate-800 tracking-wide">CREATIVE WORK</h4>
          </div>
          <div className="space-y-2 ml-4">
            {articulatorData['schema:name'] && (
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Title</span>
                <span className="text-sm text-slate-700 font-medium">{articulatorData['schema:name']}</span>
              </div>
            )}
            {authorName && (
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Author</span>
                <span className="text-sm text-slate-700 font-medium">{authorName}</span>
              </div>
            )}
            {articulatorData['schema:description'] && (
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Description</span>
                <span className="text-sm text-slate-700">{articulatorData['schema:description']}</span>
              </div>
            )}
            {rawDid && (
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Raw W3C DID</span>
                <span className="text-sm text-slate-700 font-mono break-all">{rawDid}</span>
              </div>
            )}
            {(shortUrl || articulatorData['schema:url']) && (
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider">DID Short URL</span>
                <a href={shortUrl || articulatorData['schema:url']} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 break-all">
                  {shortUrl || articulatorData['schema:url']}
                </a>
              </div>
            )}
            {(canonicalUrl || articulatorData['schema:sameAs']) && (
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Canonical URL</span>
                <a href={canonicalUrl || articulatorData['schema:sameAs']} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 break-all">
                  {canonicalUrl || articulatorData['schema:sameAs']}
                </a>
              </div>
            )}
          </div>
        </div>
      );
    }

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
              {author.map((a, index) => (
                <div key={index} className="flex flex-col">
                  <span className="text-sm text-slate-700 font-medium">{a.name}</span>
                  {a.id && (
                    <a 
                      href={getResolverUrl(a.id)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 font-mono break-all"
                      title="Open author identifier"
                    >
                      {a.id}
                    </a>
                  )}
                </div>
              ))}
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
    
    let agentName = null;

    // First, try to get the software agent from the 'created' action.
    agentName = getSoftwareAgentName(createdAction?.softwareAgent);
    
    // If not found in actions, fall back to manifest-level information.
    const activeM = getActiveManifestObject(manifest);
    if (!agentName && activeM) {
      // The `claim_generator` is a string from our backend format.
      // The `claimGeneratorInfo` is an array of objects from the c2pa-js SDK.
      agentName = activeM.claim_generator || 
                  (Array.isArray(activeM.claimGeneratorInfo) && activeM.claimGeneratorInfo.length > 0 && activeM.claimGeneratorInfo[0].name);
    }

    if (!agentName) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-slate-800 tracking-wide">PROCESSING SOFTWARE</h4>
        </div>
        <div className="ml-4">
          <span className="text-sm text-slate-700 font-medium">{agentName}</span>
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
    if (!manifest) return null;

    return (
      <div className="space-y-6">
        {renderCreativeWork(manifest)}
        {renderProvenanceFlow(manifest)}
        {renderAuthorization(manifest)}
        {renderClaimGenerator(manifest)}
        {renderSourceType(manifest)}
      </div>
    );
  };

  const formatSignatureInfo = (manifest) => {
    // The signature_info from the DB has a different key name than the one from the SDK
    const activeManifest = getActiveManifestObject(manifest);
    const signature = activeManifest?.signature_info || activeManifest?.signatureInfo;
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
                        {JSON.stringify(activeManifestData, getCircularReplacer(), 2)}
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
