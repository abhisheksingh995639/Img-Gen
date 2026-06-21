# ⚡ Z-Image Turbo Web UI

A premium, custom-built web application designed for ultra-fast, real-time image generation. This platform features a modern, responsive **React + Vite** frontend dashboard and a **FastAPI** backend server powered by a headless **ComfyUI** engine running the state-of-the-art **Z-Image-Turbo (FP8)** model.

---

## 🌟 Overview

Z-Image Turbo Web UI brings high-speed local AI image generation to an intuitive, interactive web interface. By integrating a headless instance of ComfyUI directly into a custom FastAPI backend, the application minimizes execution overhead and allows real-time generation feedback, VRAM caching, and variation tracking.

### 🛠️ Technology Stack
*   **Frontend**: React (v18), Vite, Lucide React (for premium icons), Vanilla CSS (glassmorphic styling with dark mode tokens).
*   **Backend**: FastAPI, PyTorch (CUDA-accelerated), Uvicorn, Pydantic (data validation).
*   **Inference Engine**: Headless ComfyUI core nodes running **Z-Image-Turbo FP8** (capable of high-quality outputs in as few as 3-5 steps).

---

## ✨ Features

*   🚀 **Ultra-Fast Generation**: Optimized for low-step inference (default 3 steps) using the FP8 UNet model for rapid feedback.
*   🎛️ **Floating Control Dashboard**: Click the settings icon to adjust advanced configurations on the fly:
    *   **Negative Prompt**: Specify elements to exclude from the generated output.
    *   **Aspect Ratio**: Pick from multiple aspect ratios (Landscape `1280x720`, Portrait `720x1280`, Square `1024x1024`, Wide `1152x896`, Tall `896x1152`).
    *   **Seed Control**: Set specific seeds to recreate images or keep it at `-1` for random generation.
    *   **Steps & Guidance Scale**: Fine-tune image sharpness and prompt compliance with responsive sliders.
*   🖼️ **Interactive Lightbox & Filmstrip**: Click any generation to view it full-screen. Navigate through previous generations with an integrated filmstrip preview.
*   🔄 **Seed-Based Variations Sidebar**: When viewing an image in the Lightbox, subsequent generations will automatically lock to that image's seed. The newly generated outputs will be tracked as "Variations" of that parent image and displayed in a dedicated sidebar.
*   ⏱️ **Real-Time Progress Tracking**: Visual progress bars and status text (e.g., "Loading models into VRAM...", "Generating: 2/3") displayed directly on loading skeletons.
*   ♻️ **One-Click Parameters Reuse**: Restore all configuration parameters (prompt, negative prompt, steps, seed, aspect ratio, guidance scale) of a historical image with a single click.
*   📥 **Quick Actions**: Download or permanently delete generated images (which dynamically manages variation promotions) directly from the UI.
*   🔋 **Memory Optimization**: Automatically triggers garbage collection and clears CUDA cache between runs to maintain a low VRAM footprint.

---

## 📂 Project Structure

```text
Img-Gen/
├── api.py                 # FastAPI backend server & API endpoints
├── run_generation.py      # Headless ComfyUI loader & core execution logic
├── run_api.bat            # Batch script to activate venv and run FastAPI
├── run_frontend.bat       # Batch script to install npm packages and run Vite app
├── .gitignore             # Standard git ignore mappings
├── ComfyUI/               # ComfyUI core source submodule folder
│   ├── models/            # Subfolder containing checkpoints, CLIP, and VAE models
│   └── requirements.txt   # Backend requirements for ComfyUI nodes
├── frontend/              # React + Vite frontend source code folder
│   ├── src/
│   │   ├── App.jsx        # Core React component containing dashboard and lightbox
│   │   ├── index.css      # Vanilla CSS styling with glassmorphism & layouts
│   │   └── main.jsx       # React entry point
│   ├── package.json       # Frontend dependencies and scripts
│   └── vite.config.js     # Vite configuration
└── results/               # Dynamic folder containing generated images & metadata (.json)
```

---

## ⚡ Prerequisites

To run this application locally, you will need:
1.  **NVIDIA GPU** with CUDA support (strongly recommended for fast generation).
2.  **Python 3.10 or 3.11** (Ensure to check "Add Python to PATH" during installation).
3.  **Node.js (v18+)** (for running the React frontend).

---

## ⚙️ Backend API Reference

The FastAPI server (`api.py`) runs on `http://127.0.0.1:8000` and exposes the following endpoints:

| Method | Endpoint | Description | Request Body / Parameters | Response Payload |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/generate` | Starts image generation | `GenerationRequest` (JSON) | `{"status": "success", "url": "..."}` |
| **GET** | `/metadata/{filename}` | Fetches metadata for an image | `filename` (path parameter) | `{"status": "success", "metadata": {...}}` |
| **GET** | `/progress` | Polls current model loading/generation progress | None | `{"status": "success", "progress": {...}}` |
| **GET** | `/history` | Fetches unique parent images (one per seed) | None | `{"status": "success", "history": [...]}` |
| **GET** | `/variations/{filename}` | Fetches variations sharing the same seed | `filename` (path parameter) | `{"status": "success", "variations": [...]}` |
| **DELETE** | `/image/{filename}` | Deletes the image and its metadata JSON | `filename` (path parameter) | `{"status": "success", "message": "Deleted"}` |

---

## 🚀 Setup Instructions

### 1. Download and Place Model Checkpoints

Model files are extremely large and are excluded from Git. Download them from Hugging Face and place them in the exact paths within the `ComfyUI/models/` folder:

1.  **UNet Model (Diffusion Model):**
    *   **File:** `z-image-turbo-fp8-e4m3fn.safetensors` (~6.15 GB)
    *   **Download Link:** [T5B/Z-Image-Turbo-FP8](https://huggingface.co/T5B/Z-Image-Turbo-FP8/resolve/main/z-image-turbo-fp8-e4m3fn.safetensors)
    *   **Destination Path:** `ComfyUI/models/diffusion_models/z-image-turbo-fp8-e4m3fn.safetensors`
2.  **CLIP Model (Text Encoder):**
    *   **File:** `qwen_3_4b.safetensors` (~8.04 GB)
    *   **Download Link:** [Comfy-Org/z_image_turbo (CLIP)](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors)
    *   **Destination Path:** `ComfyUI/models/clip/qwen_3_4b.safetensors`
3.  **VAE Model (Decoder):**
    *   **File:** `ae.safetensors` (~335 MB)
    *   **Download Link:** [Comfy-Org/z_image_turbo (VAE)](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors)
    *   **Destination Path:** `ComfyUI/models/vae/ae.safetensors`

#### 💻 Automatic CLI Download (Bash/PowerShell)
Run these commands from the project root to create directories and download the checkpoints:

```bash
# Create target model directories
mkdir -p ComfyUI/models/diffusion_models
mkdir -p ComfyUI/models/clip
mkdir -p ComfyUI/models/vae

# Download UNet Model
curl -L -o ComfyUI/models/diffusion_models/z-image-turbo-fp8-e4m3fn.safetensors \
  https://huggingface.co/T5B/Z-Image-Turbo-FP8/resolve/main/z-image-turbo-fp8-e4m3fn.safetensors

# Download CLIP Model
curl -L -o ComfyUI/models/clip/qwen_3_4b.safetensors \
  https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors

# Download VAE Model
curl -L -o ComfyUI/models/vae/ae.safetensors \
  https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors
```

### 2. Set Up the Python Virtual Environment
Run the following commands in the project root:

```bash
# Create a virtual environment named "venv_new"
python -m venv venv_new

# Activate the virtual environment:
# On Windows (CMD):
venv_new\Scripts\activate.bat
# On Windows (PowerShell):
venv_new\Scripts\Activate.ps1
# On Linux/macOS/Git Bash:
source venv_new/bin/activate

# Install PyTorch with CUDA 12.1 (for GPU acceleration)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install ComfyUI requirements
pip install -r ComfyUI/requirements.txt

# Install FastAPI backend dependencies
pip install fastapi uvicorn pydantic
```

---

## 🏃 Running the Application

### Option A: Using Batch Files (Windows)
Double-click the batch files to start:
1.  **Start the Backend:** Run `run_api.bat` (starts backend API on `http://127.0.0.1:8000`).
2.  **Start the Frontend:** Run `run_frontend.bat` (automatically installs packages and launches Vite React app on `http://localhost:5173`).

### Option B: Using Terminal Commands (Linux/macOS/Bash)
Open two separate terminal sessions from the project root:

*   **Terminal 1 (Backend):**
    ```bash
    source venv_new/bin/activate  # Or Windows: venv_new\Scripts\activate
    python api.py
    ```
*   **Terminal 2 (Frontend):**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## 💡 How Variations & Seed Locking Work

1.  **Normal Mode**: When you enter a prompt and click generate, the backend assigns a random seed (from `0` to `9007199254740991`) to the image. This becomes a new **parent image** in the gallery grid.
2.  **Variation Mode**:
    *   Click on any image in the gallery to open it in the **Lightbox**.
    *   Selecting an image automatically locks the app settings (Prompt, Seed, Steps, Guidance, Aspect Ratio) to match that exact generation.
    *   Keep the Lightbox open and change the prompt details (e.g., changing color or style) and click **Generate** (or press Enter).
    *   Because the seed is locked, the new image shares the exact same seed structure.
    *   The backend groups these together, and they will immediately appear in the **Variations Sidebar** on the right side of the Lightbox.
3.  **Promotion on Deletion**: If you delete a parent image that has active variations, the system automatically promotes the oldest variation sharing that seed to be the new parent image displayed in the main gallery.
