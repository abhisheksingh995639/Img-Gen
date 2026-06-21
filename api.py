import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import json
from run_generation import generate_image

app = FastAPI(title="Z-Image Turbo API")

# Allow CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the generated images statically so frontend can display them
# results folder should be created by run_generation
os.makedirs("results", exist_ok=True)
app.mount("/results", StaticFiles(directory="results"), name="results")

class GenerationRequest(BaseModel):
    prompt: str
    negative: str = "blurry, low quality, text, watermark, distorted, bad anatomy"
    aspect_ratio: str = "1024x1024"
    steps: int = 3
    guidance: float = 1.0
    seed: int = -1

@app.post("/generate")
def api_generate(req: GenerationRequest):
    img_pil, save_path, gen_seed = generate_image(
        req.prompt, req.negative, req.aspect_ratio, req.steps, req.guidance, req.seed
    )
    
    if save_path:
        filename = os.path.basename(save_path)
        # Update seed with actual generated seed
        req_dict = req.model_dump()
        req_dict["seed"] = gen_seed
        # Save metadata JSON
        json_filename = filename.replace(".png", ".json").replace(".jpg", ".json")
        json_path = os.path.join("results", json_filename)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(req_dict, f)
            
        # Return the URL path to the static image
        return {"status": "success", "url": f"http://127.0.0.1:8000/results/{filename}"}
    else:
        return {"status": "error", "message": "Generation failed"}

@app.get("/metadata/{filename}")
def get_metadata(filename: str):
    try:
        json_filename = filename.replace(".png", ".json").replace(".jpg", ".json")
        json_path = os.path.join("results", json_filename)
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {"status": "success", "metadata": data}
        return {"status": "error", "message": "Metadata not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/progress")
def get_progress():
    try:
        json_path = os.path.join("results", "progress.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {"status": "success", "progress": data}
        return {"status": "success", "progress": {"current": 0, "total": 0, "status": "idle"}}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/history")
def get_history():
    try:
        files = [f for f in os.listdir("results") if f.endswith(('.png', '.jpg', '.jpeg'))]
        # Sort by creation/modification time ascending (oldest first)
        files.sort(key=lambda x: os.path.getmtime(os.path.join("results", x)))
        
        seen_seeds = set()
        parent_urls = []
        
        for f in files:
            j_name = f.replace(".png", ".json").replace(".jpg", ".json")
            j_path = os.path.join("results", j_name)
            
            seed = None
            if os.path.exists(j_path):
                with open(j_path, "r", encoding="utf-8") as jf:
                    try:
                        meta = json.load(jf)
                        seed = meta.get("seed")
                    except:
                        pass
                        
            # If no valid seed found, or seed is -1, treat as an independent parent
            if seed is None or seed == -1:
                parent_urls.append(f"http://127.0.0.1:8000/results/{f}")
            else:
                # If seed hasn't been seen yet, this is the parent (oldest generation of this seed)
                if seed not in seen_seeds:
                    seen_seeds.add(seed)
                    parent_urls.append(f"http://127.0.0.1:8000/results/{f}")
                    
        # Reverse so newest parents appear at the top of the grid
        parent_urls.reverse()
        return {"status": "success", "history": parent_urls}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/image/{filename}")
def delete_image(filename: str):
    try:
        file_path = os.path.join("results", filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            # Also delete JSON metadata if exists
            json_filename = filename.replace(".png", ".json").replace(".jpg", ".json")
            json_path = os.path.join("results", json_filename)
            if os.path.exists(json_path):
                os.remove(json_path)
            return {"status": "success", "message": "Deleted"}
        return {"status": "error", "message": "File not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/variations/{filename}")
def get_variations(filename: str):
    try:
        json_filename = filename.replace(".png", ".json").replace(".jpg", ".json")
        json_path = os.path.join("results", json_filename)
        if not os.path.exists(json_path):
            return {"status": "success", "variations": []}
            
        with open(json_path, "r", encoding="utf-8") as f:
            target_data = json.load(f)
            
        target_seed = target_data.get("seed")
        if target_seed is None or target_seed == -1:
            return {"status": "success", "variations": []}
            
        files = [f for f in os.listdir("results") if f.endswith(('.png', '.jpg', '.jpeg'))]
        files.sort(key=lambda x: os.path.getmtime(os.path.join("results", x)), reverse=True)
        
        variations = []
        for f in files:
            j_name = f.replace(".png", ".json").replace(".jpg", ".json")
            j_path = os.path.join("results", j_name)
            if os.path.exists(j_path):
                with open(j_path, "r", encoding="utf-8") as jf:
                    meta = json.load(jf)
                    if meta.get("seed") == target_seed:
                        variations.append(f"http://127.0.0.1:8000/results/{f}")
                        
        return {"status": "success", "variations": variations}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    print("Starting FastAPI Server...")
    uvicorn.run("api:app", host="127.0.0.1", port=8000, log_level="info")
