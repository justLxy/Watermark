'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { API_BASE } from '../utils/api';
import { FileUp, Camera, Wand2 } from 'lucide-react';

// Dynamically import the C2paDisplay component to avoid SSR issues
const C2paDisplay = dynamic(() => import('../components/C2paDisplay'), { 
  ssr: false,
});

// Dynamically import the CameraScanner component to avoid SSR issues  
const CameraScanner = dynamic(() => import('../components/CameraScanner'), {
  ssr: false,
});

// A reusable card component for consistent styling
const Card = ({ children, className = '' }) => (
  <div className={`bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-subtle ${className}`}>
    {children}
  </div>
);

const FileInput = ({ id, onChange, disabled }) => (
  <div className="relative">
    <input
      id={id}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/tiff"
      onChange={onChange}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      disabled={disabled}
    />
    <div className={`w-full h-32 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center text-center transition-colors duration-200 ${!disabled ? 'hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20' : 'cursor-not-allowed opacity-60'}`}>
      <FileUp className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Click to upload or drag & drop</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">JPEG, PNG, WEBP, or TIFF</p>
    </div>
  </div>
);

const ImageProvenancePreview = ({ imageUrl, file }) => {
    if (!imageUrl) return null;

    const isTiff = file?.type === 'image/tiff';

    return (
        <div className="relative mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {isTiff ? (
                <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800">
                    <p className="text-gray-500 dark:text-gray-400">TIFF file preview is not available.</p>
                </div>
            ) : (
                <img src={imageUrl} alt="Image Preview" className="w-full h-auto object-cover" />
            )}
            <C2paDisplay file={file} />
        </div>
    );
};

const Header = () => (
    <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-50">Content Provenance</h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Securely embed invisible watermarks and C2PA credentials into your images. Verify the authenticity of any visual content.
        </p>
    </header>
);

const SectionTitle = ({ title, subtitle }) => (
    <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
);

const ActionButton = ({ onClick, disabled, children, className = '' }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400/80 disabled:cursor-not-allowed transition-all duration-200 ${className}`}
    >
        {children}
    </button>
);

const InputField = ({ id, label, value, onChange, placeholder, type = "text", as = "input" }) => {
    const commonProps = {
        id,
        value,
        onChange,
        placeholder,
        className: "mt-1 block w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
    };
    const CustomTag = as;
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <CustomTag {...commonProps} {...(as === 'textarea' ? { rows: "3" } : { type: type })} />
        </div>
    );
};

const SelectField = ({ id, label, value, onChange, children }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <select id={id} value={value} onChange={onChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            {children}
        </select>
    </div>
);


export default function HomePage() {
  // Common state
  const [error, setError] = useState('');

  // Encode & Sign state
  const [encodeFile, setEncodeFile] = useState(null);
  const [encodeFileUrl, setEncodeFileUrl] = useState(null);
  const [encodedFile, setEncodedFile] = useState(null);
  const [encodedFileUrl, setEncodedFileUrl] = useState(null);
  const [isEncoding, setIsEncoding] = useState(false);
  
  // C2PA manifest metadata state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [assetDID, setAssetDID] = useState('');
  const [assetShortURL, setAssetShortURL] = useState('');
  const [canonicalURL, setCanonicalURL] = useState('');
  const [trainingPolicy, setTrainingPolicy] = useState('notAllowed');
  const [digitalSourceType, setDigitalSourceType] = useState('http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture');
  const [softwareAgent, setSoftwareAgent] = useState('PixelSeal Demo');

  // Decode & Verify state
  const [decodeFile, setDecodeFile] = useState(null);
  const [decodeFileUrl, setDecodeFileUrl] = useState(null);
  const [decodeMode, setDecodeMode] = useState('upload'); // 'upload' or 'camera'

  const handleEncodeFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setEncodeFile(selectedFile);
    setEncodeFileUrl(URL.createObjectURL(selectedFile));
    setEncodedFile(null);
    setEncodedFileUrl(null);
    setError('');
  };

  const handleCameraCapture = (file, url) => {
    setDecodeFile(file);
    setDecodeFileUrl(url);
    setDecodeMode('upload'); // Switch back to upload view after capture
  };

  const handleDecodeFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setDecodeFile(selectedFile);
    setDecodeFileUrl(URL.createObjectURL(selectedFile));
  };

  const handleEncode = async () => {
    if (!encodeFile) {
      setError('Please select a file to encode.');
      return;
    }
    setIsEncoding(true);
    setError('');

    const formData = new FormData();
    formData.append('image', encodeFile);
    formData.append('title', title || encodeFile.name);
    formData.append('author', author);
    formData.append('assetDID', assetDID);
    formData.append('assetShortURL', assetShortURL);
    formData.append('canonicalURL', canonicalURL);
    formData.append('description', description);
    formData.append('trainingPolicy', trainingPolicy);
    formData.append('digitalSourceType', digitalSourceType);
    formData.append('softwareAgent', softwareAgent);

    try {
      const response = await fetch(`${API_BASE}/encode`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err_text = await response.text();
        throw new Error(`Server error: ${response.status} - ${err_text}`);
      }

      const imageBlob = await response.blob();
      const newFile = new File([imageBlob], `signed_${encodeFile.name}`, { type: imageBlob.type });

      setEncodedFileUrl(URL.createObjectURL(imageBlob));
      setEncodedFile(newFile);
      setEncodeFile(null); 
      setEncodeFileUrl(null);

    } catch (err) {
      setError(err.message || 'An unexpected error occurred during encoding.');
    } finally {
      setIsEncoding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-200 font-sans">
      <div className="container mx-auto px-4 py-12">
        <Header />
        
        {error && (
            <div className="max-w-4xl mx-auto mb-6 p-4 text-sm text-red-800 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-lg" role="alert">
                <span className="font-medium">Error:</span> {error}
            </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* --- ENCODE & SIGN --- */}
          <Card className="p-8 space-y-6">
            <SectionTitle title="Encode & Sign" subtitle="Embed provenance and an invisible watermark." />

            {!encodedFileUrl && <FileInput id="encode-file" onChange={handleEncodeFileChange} disabled={isEncoding} />}
            
            <ImageProvenancePreview 
              imageUrl={encodedFileUrl || encodeFileUrl}
              file={encodedFile || encodeFile}
            />
            
            {encodeFile && !encodedFile && (
              <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
                 <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Add Content Credentials Metadata</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField id="title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Sunset Over the Lake" />
                    <InputField id="author" label="Author Name" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g., Jane Doe" />
                    <InputField id="softwareAgent" label="Processing Software" value={softwareAgent} onChange={(e) => setSoftwareAgent(e.target.value)} placeholder="My-AI-App/1.0" />
                 </div>
                 <InputField id="description" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of the creative work." as="textarea"/>
	                 <InputField id="assetDID" label="Raw W3C DID" value={assetDID} onChange={(e) => setAssetDID(e.target.value)} placeholder="did:art:hkust:..." />
	                 <InputField id="assetShortURL" label="DID Short URL (embedded as watermark, ≤32 chars)" value={assetShortURL} onChange={(e) => setAssetShortURL(e.target.value)} placeholder="did.art/hkust/12345678.abc123 — leave blank to auto-generate" />
	                 <InputField id="canonicalURL" label="Canonical URL" type="url" value={canonicalURL} onChange={(e) => setCanonicalURL(e.target.value)} placeholder="https://example.com/artwork/123" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField id="digitalSourceType" label="Digital Source Type" value={digitalSourceType} onChange={(e) => setDigitalSourceType(e.target.value)}>
                        <option value="http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture">Digital Capture</option>
                        <option value="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia">Trained Algorithmic Media</option>
                        <option value="http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia">Composite with AI</option>
                        <option value="http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation">Digital Creation</option>
                    </SelectField>
                    <SelectField id="trainingPolicy" label="AI Training Policy" value={trainingPolicy} onChange={(e) => setTrainingPolicy(e.target.value)}>
                        <option value="notAllowed">Do Not Allow Training</option>
                        <option value="allowed">Allow Training</option>
                    </SelectField>
                </div>
                
                <div className="pt-2">
                    <ActionButton onClick={handleEncode} disabled={isEncoding}>
                       {isEncoding ? 'Processing...' : 'Encode & Sign'}
                       {!isEncoding && <Wand2 className="ml-2 w-5 h-5" />}
                    </ActionButton>
                </div>
              </div>
            )}
            
            {encodedFileUrl && (
              <div className="p-4 text-center bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="text-base font-semibold text-green-800 dark:text-green-200">Encoding Successful!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">New image with Content Credentials created.</p>
              </div>
            )}
          </Card>

          {/* --- DECODE & VERIFY --- */}
          <Card className="p-8 space-y-6">
              <SectionTitle title="Decode & Verify" subtitle="Check for provenance in an image." />
              
              <div className="flex space-x-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button 
                  onClick={() => setDecodeMode('upload')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${decodeMode === 'upload' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  <FileUp className="w-4 h-4 mr-2 inline-block" />
                  Upload File
                </button>
                <button 
                  onClick={() => setDecodeMode('camera')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${decodeMode === 'camera' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  <Camera className="w-4 h-4 mr-2 inline-block" />
                  Use Camera
                </button>
              </div>
              
              {decodeMode === 'camera' ? (
                <CameraScanner onCapture={handleCameraCapture} />
              ) : (
                <FileInput id="decode-file" onChange={handleDecodeFileChange} />
              )}
              
              <ImageProvenancePreview imageUrl={decodeFileUrl} file={decodeFile} />
          </Card>
        </main>

        <footer className="text-center mt-12 text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <p>
                A HKUST project by Zara Warne, Xuanyi Lyu, and Karen Gao.
                <br />
                Supervised by Daniel Chun.
            </p>
        </footer>
      </div>
    </div>
  );
}
