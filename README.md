# PixelSeal Provenance Platform

This project provides a provenance and protection solution for artworks, based on PixelSeal (Meta's VideoSeal) invisible watermarking and the C2PA content provenance standard. Users can leverage this platform to add a unique identifier to their original creations or AI-derived artworks. This identifier is embedded as an invisible watermark and linked with C2PA provenance metadata, enabling persistent and reliable tracking of copyright and history.

Unlike open watermarks with published removal tools, PixelSeal ships no such tool, making the embedded mark far harder to strip.

## Core Features

1.  **Watermark Encoding**
    *   Users can upload any image.
    *   The backend uses **PixelSeal** (Meta VideoSeal) to embed a resolvable **DID URL** (e.g. `https://did.art/hkust/70897657.2Mp8SM`) as an invisible watermark into the image pixels.
    *   Simultaneously, this identifier is written into a C2PA Manifest as a soft binding.
    *   Users can then download the new image, now containing multiple layers of provenance information.

2.  **Watermark Decoding**
    *   Users can upload a watermarked image.
    *   The backend first decodes the PixelSeal DID URL from the image pixels.
    *   The frontend then attempts to read embedded C2PA metadata directly in the browser.
    *   If embedded metadata is unavailable, the frontend can recover provenance by watermark URL and a tolerant backend manifest lookup (which survives the occasional bit flip from compression).

3.  **Camera Scanning**
    *   The frontend application can directly access the device camera.
    *   It allows users to scan real-world images (e.g., printed artworks) to detect and decode the embedded PixelSeal watermark in real-time.
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
        *   `videoseal`: Meta's VideoSeal library (the `pixelseal` model), included as a **git submodule** at `/videoseal`.
        *   `c2pa-python`: For creating and signing C2PA manifests on the server.
    *   **Responsibilities**: Encapsulates watermarking, manifest generation, signing, and provenance lookup.

## Directory Structure

```
.
├── backend/            # Python Flask backend application
├── c2pa/               # C2PA-related examples and keys
├── frontend/           # Next.js frontend application
├── videoseal/          # Meta VideoSeal library (PixelSeal model) — git submodule
└── README.md           # Project documentation
```

## Developer Docs

- Backend implementation details: `backend/README.md`

## Installation and Setup

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Python](https://www.python.org/) (v3.10 or higher)
*   `pip` (Python package manager)
*   [Git](https://git-scm.com/) (for submodules)

### 1. Backend Setup

First, initialize the VideoSeal submodule, then install the Python dependencies.

```bash
# From the repository root: fetch the VideoSeal submodule
git submodule update --init --recursive

# Navigate to the backend directory
cd backend

# Install dependencies (torch, torchvision, timm, videoseal deps, c2pa-python, ...)
pip install -r requirements.txt

# Start the backend server (runs on http://0.0.0.0:5001 by default)
# The PixelSeal checkpoint (~1.2 GB) downloads automatically on the first
# watermarking request into videoseal/ckpts/.
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

> **Note**: If you need to serve the frontend over HTTPS (e.g., for camera access), ensure you have locally-trusted certificates (`localhost+2-key.pem` and `localhost+2.pem`) and run `npm run dev:https`.

### 3. Accessing the Application

Once both servers are running, open your browser and navigate to `http://localhost:3000` to use the platform.
