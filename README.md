# TrustMark Provenance Platform

This project provides a provenance and protection solution for artworks, based on TrustMark's invisible watermarking and the C2PA content provenance standard. Users can leverage this platform to add a unique identifier to their original creations or AI-derived artworks. This identifier is embedded as an invisible watermark and linked with major provenance standards like C2PA and W3C DID, enabling persistent and reliable tracking of copyright and history.

## Core Features

1.  **Watermark Encoding**
    *   Users can upload any image.
    *   The backend utilizes the TrustMark SDK to embed a unique and invisible digital watermark (ID) into the image pixels.
    *   Simultaneously, this ID is written into a C2PA Manifest.
    *   Users can then download the new image, now containing multiple layers of provenance information.

2.  **Watermark Decoding**
    *   Users can upload a watermarked image.
    *   The backend first decodes the TrustMark ID from the image pixels.
    *   Next, the system checks for and parses the C2PA Manifest within the file.
    *   Finally, all associated provenance, copyright, and edit history information is clearly displayed on the frontend.

3.  **Camera Scanning**
    *   The frontend application can directly access the device camera.
    *   It allows users to scan real-world images (e.g., printed artworks) to detect and decode the embedded TrustMark in real-time.
    *   This feature makes it possible to verify the provenance of physical artworks.

## Tech Stack

This project uses a decoupled frontend/backend architecture:

*   **Frontend (`/frontend`)**:
    *   **Framework**: [Next.js](https://nextjs.org/) (React)
    *   **Key Dependencies**: `c2pa` (for parsing C2PA data client-side), `c2pa-wc` (official C2PA Web Components).
    *   **Responsibilities**: Provides the UI for file uploads, the camera scanning interface, progress indicators, and visualization of provenance data.

*   **Backend (`/backend`)**:
    *   **Framework**: [Flask](https://flask.palletsprojects.com/) (Python)
    *   **Core Libraries**:
        *   `trustmark`: The official TrustMark SDK for watermark encoding and decoding.
        *   `c2pa-python`: For creating and signing C2PA manifests on the server.
        *   `didkit`: For handling and issuing W3C DIDs and Verifiable Credentials.
    *   **Responsibilities**: Encapsulates the core watermarking logic, metadata generation, parsing, and identity verification.

## Directory Structure

```
.
├── backend/            # Python Flask backend application
├── c2pa/               # C2PA-related examples and keys
├── didkit-python/      # DIDKit Python library
├── frontend/           # Next.js frontend application
├── python/             # TrustMark Python core library
└── README.md           # Project documentation
```

## Installation and Setup

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Python](https://www.python.org/) (v3.9 or higher)
*   `pip` (Python package manager)

### 1. Backend Setup

First, navigate to the backend directory and install the required Python dependencies.

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the backend server (runs on http://0.0.0.0:5001 by default)
python3 app.py
```

### 2. Frontend Setup

Open a new terminal window, navigate to the frontend directory, and install its dependencies.

```bash
# Navigate to the frontend directory
cd frontend

# Install npm dependencies
npm install

# Start the frontend development server (runs on http://localhost:3000 by default)
npm run dev
```

> **Note**: If you need to serve the frontend over HTTPS (e.g., for camera access), ensure you have locally-trusted certificates (`localhost+2-key.pem` and `localhost+2.pem`) and run `npm run dev:httpss`.

### 3. Accessing the Application

Once both servers are running, open your browser and navigate to `http://localhost:3000` to use the platform.
