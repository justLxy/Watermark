'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the C2paDisplay component to avoid SSR issues
const C2paDisplay = dynamic(() => import('../components/C2paDisplay'), { 
  ssr: false,
});

// A reusable card component for consistent styling
const Card = ({ title, children }) => (
  <div className="w-full bg-white shadow-lg rounded-xl p-8 space-y-6">
    <h2 className="text-2xl font-bold text-gray-800 text-center">{title}</h2>
    {children}
  </div>
);

// A reusable file input component
const FileInput = ({ id, onChange }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      Image File
    </label>
    <input
      id={id}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/tiff"
      onChange={onChange}
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
    />
  </div>
);

// This new component will wrap an image and overlay the C2PA display on top of it.
const ImageProvenancePreview = ({ imageUrl, file }) => {
    if (!imageUrl) return null;

    // Check if the file is a TIFF, as browsers can't preview it
    const isTiff = file?.type === 'image/tiff';

    return (
        <div className="relative mt-6 rounded-lg overflow-hidden border">
            {isTiff ? (
                <div className="flex items-center justify-center h-48 bg-gray-100">
                    <p className="text-gray-500">TIFF file preview is not available.</p>
                </div>
            ) : (
                <img src={imageUrl} alt="Image Preview" className="w-full h-auto" />
            )}
            {/* The C2paDisplay component is now an overlay that is only visible when it finds a manifest */}
            <C2paDisplay file={file} />
        </div>
    );
};

export default function HomePage() {
  // State for the "Encode & Sign" workflow
  const [encodeFile, setEncodeFile] = useState(null);
  const [encodeFileUrl, setEncodeFileUrl] = useState(null);
  const [encodedFile, setEncodedFile] = useState(null); // This will hold the result from the backend
  const [encodedFileUrl, setEncodedFileUrl] = useState(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodeError, setEncodeError] = useState('');
  
  // Form State for the C2PA manifest metadata
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [creativeWorkURL, setCreativeWorkURL] = useState('');
  const [trainingPolicy, setTrainingPolicy] = useState('notAllowed');
  const [digitalSourceType, setDigitalSourceType] = useState('http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture');
  const [softwareAgent, setSoftwareAgent] = useState('Articulator.ai');

  // State for the "Decode & Verify" workflow
  const [decodeFile, setDecodeFile] = useState(null);
  const [decodeFileUrl, setDecodeFileUrl] = useState(null);

  const handleEncodeFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setEncodeFile(selectedFile);
    setEncodeFileUrl(URL.createObjectURL(selectedFile));
    setEncodedFile(null); // Clear previous results
    setEncodedFileUrl(null);
    setEncodeError('');
  };

  const handleDecodeFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setDecodeFile(selectedFile);
    setDecodeFileUrl(URL.createObjectURL(selectedFile));
  };

  const handleEncode = async () => {
    if (!encodeFile) {
      setEncodeError('Please select a file to encode.');
      return;
    }
    setIsEncoding(true);
    setEncodeError('');

    const formData = new FormData();
    formData.append('image', encodeFile);
    formData.append('title', title);
    formData.append('author', author);
    formData.append('creativeWorkURL', creativeWorkURL);
    formData.append('description', description);
    formData.append('trainingPolicy', trainingPolicy);
    formData.append('digitalSourceType', digitalSourceType);
    formData.append('softwareAgent', softwareAgent);

    try {
      const response = await fetch('http://localhost:5001/encode', {
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
      setEncodeError(err.message || 'An unexpected error occurred during encoding.');
    } finally {
      setIsEncoding(false);
    }
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans py-12 px-4">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800">TrustMark + C2PA</h1>
      </header>
      
      <main className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* --- ENCODE CARD --- */}
        <Card title="Encode & Sign">
          <FileInput id="encode-file" onChange={handleEncodeFileChange} />
          
          <ImageProvenancePreview 
            imageUrl={encodedFileUrl || encodeFileUrl}
            file={encodedFile || encodeFile}
          />
          
          {encodeFile && !encodedFile && (
            <div className="pt-4 border-t space-y-4">
              <p className="text-sm font-medium text-gray-700">Add Metadata for Content Credentials</p>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Sunset Over the Lake" className={inputStyle} />
              </div>
              <div>
                <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author Name</label>
                <input id="author" type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g., John Doe" className={inputStyle} />
              </div>
              <div>
                <label htmlFor="softwareAgent" className="block text-sm font-medium text-gray-700">Processing Software</label>
                <input id="softwareAgent" type="text" value={softwareAgent} onChange={(e) => setSoftwareAgent(e.target.value)} placeholder="e.g., My-AI-App/2.1" className={inputStyle} />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of the creative work." rows="3" className={inputStyle} />
              </div>
              <div>
                <label htmlFor="creativeWorkURL" className="block text-sm font-medium text-gray-700">Creative Work URL</label>
                <input id="creativeWorkURL" type="url" value={creativeWorkURL} onChange={(e) => setCreativeWorkURL(e.target.value)} placeholder="https://example.com/artwork/123" className={inputStyle} />
              </div>
              <div>
                <label htmlFor="digitalSourceType" className="block text-sm font-medium text-gray-700">Digital Source Type</label>
                <select id="digitalSourceType" value={digitalSourceType} onChange={(e) => setDigitalSourceType(e.target.value)} className={inputStyle}>
                  <option value="http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture">Digital Capture</option>
                  <option value="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia">Trained Algorithmic Media</option>
                  <option value="http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia">Composite with AI</option>
                  <option value="http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation">Digital Creation</option>
                </select>
              </div>
               <div>
                <label htmlFor="trainingPolicy" className="block text-sm font-medium text-gray-700">AI Training Policy</label>
                <select id="trainingPolicy" value={trainingPolicy} onChange={(e) => setTrainingPolicy(e.target.value)} className={inputStyle}>
                  <option value="notAllowed">Do Not Allow Training</option>
                  <option value="allowed">Allow Training</option>
                </select>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleEncode}
                  disabled={isEncoding}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isEncoding ? 'Processing...' : 'Encode and Sign Image'}
                </button>
              </div>
            </div>
          )}
          
          {encodedFileUrl && (
              <div className="p-4 mt-4 text-center bg-green-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800">Encoding Successful!</h3>
                  <p className="text-sm text-gray-600 mt-1">The new image with credentials is shown above. You can save it, or use the Decode card to inspect it.</p>
              </div>
          )}

          {encodeError && (
            <div className="p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
              <span className="font-medium">Error:</span> {encodeError}
            </div>
          )}
        </Card>

        {/* --- DECODE CARD --- */}
        <Card title="Decode & Verify">
          <FileInput id="decode-file" onChange={handleDecodeFileChange} />
          <ImageProvenancePreview imageUrl={decodeFileUrl} file={decodeFile} />
        </Card>
      </main>
    </div>
  );
} 