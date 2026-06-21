# Z-Image Turbo Web UI

A premium, custom-built web application for ultra-fast, real-time image generation. The app features a modern React + Vite frontend dashboard and a FastAPI backend powered by a headless ComfyUI engine running **Z-Image-Turbo (FP8)**.

---

## 📂 Project Structure

```text
Img-Gen/
├── api.py                 # FastAPI backend server
├── run_generation.py      # Core ComfyUI execution logic & model loading
├── run_api.bat            # Launches backend FastAPI server
├── run_frontend.bat       # Installs packages and launches Vite React app
├── .gitignore             # Git ignore file
├── ComfyUI/               # ComfyUI core source folder
│   └── models/            # Directory containing checkpoints/VAE/CLIP (Git ignored)
├── frontend/              # Vite React web application frontend
└── results/               # Directory where generated images & metadata are saved (Git ignored)
```

---

## ⚡ Prerequisites

To run this application locally, you will need:
1. **NVIDIA GPU** with CUDA support (strongly recommended for fast generation).
2. **Python 3.10 or 3.11** (Make sure to check "Add Python to PATH" during installation).
3. **Node.js** (for running the React frontend).

---

## 🚀 Setup Instructions

Follow these steps to set up and run the application on your computer:

### 1. Download & Place the Model Checkpoints
Because model files are extremely large, they must be downloaded and placed in the exact directory paths under the `ComfyUI` folder structure:

1.  **UNet Model (Diffusion Model):** 
    *   **File:** `z-image-turbo-fp8-e4m3fn.safetensors` (~6.15 GB)
    *   **Download Link:** [Download from Hugging Face (T5B/Z-Image-Turbo-FP8)](https://huggingface.co/T5B/Z-Image-Turbo-FP8/resolve/main/z-image-turbo-fp8-e4m3fn.safetensors)
    *   **Destination Path:** `ComfyUI/models/diffusion_models/z-image-turbo-fp8-e4m3fn.safetensors`
2.  **CLIP Model (Text Encoder):**
    *   **File:** `qwen_3_4b.safetensors` (~8.04 GB)
    *   **Download Link:** [Download from Hugging Face (Comfy-Org/z_image_turbo)](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors)
    *   **Destination Path:** `ComfyUI/models/clip/qwen_3_4b.safetensors`
3.  **VAE Model (Decoder):**
    *   **File:** `ae.safetensors` (~335 MB)
    *   **Download Link:** [Download from Hugging Face (Comfy-Org/z_image_turbo)](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors)
    *   **Destination Path:** `ComfyUI/models/vae/ae.safetensors`

#### 💻 Download via Command Line (Bash/PowerShell)
You can run the following commands in your terminal from the project root to create the folders and download all models automatically:

```bash
# Create the target model directories
mkdir -p ComfyUI/models/diffusion_models
mkdir -p ComfyUI/models/clip
mkdir -p ComfyUI/models/vae

# Download the UNet Model
curl -L -o ComfyUI/models/diffusion_models/z-image-turbo-fp8-e4m3fn.safetensors \
  https://huggingface.co/T5B/Z-Image-Turbo-FP8/resolve/main/z-image-turbo-fp8-e4m3fn.safetensors

# Download the CLIP Model
curl -L -o ComfyUI/models/clip/qwen_3_4b.safetensors \
  https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors

# Download the VAE Model
curl -L -o ComfyUI/models/vae/ae.safetensors \
  https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors
```

### 2. Set Up the Python Virtual Environment
Open a terminal in the project root directory and run:

```bash
# 1. Create a virtual environment named "venv_new"
python -m venv venv_new

# 2. Activate the virtual environment:
# On Windows (CMD):
venv_new\Scripts\activate.bat
# On Windows (PowerShell):
venv_new\Scripts\Activate.ps1
# On Linux/macOS/Git Bash:
source venv_new/bin/activate

# 3. Install PyTorch with CUDA 12.1 (for GPU acceleration)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 4. Install ComfyUI requirements
pip install -r ComfyUI/requirements.txt

# 5. Install FastAPI backend dependencies
pip install fastapi uvicorn pydantic
```

---

## 🏃 Running the Application

### Option A: Using Batch Files (Windows)
Double-click the batch files to start:
1. **Start the Backend:** Run `run_api.bat` (starts backend API on `http://127.0.0.1:8000`).
2. **Start the Frontend:** Run `run_frontend.bat` (starts React app on `http://localhost:5173`).

### Option B: Using Terminal Commands (Linux/macOS/Bash)
Open two separate terminal sessions from the project root:

*   **Terminal 1 (Backend):**
    ```bash
    # Activate virtual environment
    source venv_new/bin/activate  # Or Windows equivalent: venv_new\Scripts\activate
    
    # Run the server
    python api.py
    ```
*   **Terminal 2 (Frontend):**
    ```bash
    # Go to frontend folder
    cd frontend
    
    # Install web dependencies
    npm install
    
    # Start the local development server
    npm run dev
    ```

