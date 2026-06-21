import os
import sys
import subprocess
from pathlib import Path
import urllib.request
import time
import argparse
import re, uuid, gc

def log(msg, type="info"):
    symbols = {
        "info": "[INFO]",
        "success": "[OK]",
        "warn": "[WARN]",
        "error": "[ERROR]"
    }
    print(f"{symbols.get(type, '')} {msg}")

ROOT = Path(__file__).parent
COMFY_PATH = ROOT / "ComfyUI"
MODELS_PATH = COMFY_PATH / "models"

import torch
import numpy as np
from PIL import Image

# 2. Load Engine
sys.path.append(str(COMFY_PATH))
try:
    from nodes import NODE_CLASS_MAPPINGS
    import comfy.utils
    import json
except Exception as e:
    log(f"ComfyUI Core Error: {e}", "error")
    raise SystemExit

def progress_hook(value, total, preview=None, node_id=None):
    progress_file = SAVE_DIR / "progress.json"
    try:
        with open(progress_file, "w") as f:
            json.dump({"current": value, "total": total, "status": "generating"}, f)
    except Exception:
        pass

comfy.utils.set_progress_bar_global_hook(progress_hook)

with torch.inference_mode():
    nodes = {
        "unet": NODE_CLASS_MAPPINGS["UNETLoader"](),
        "clip": NODE_CLASS_MAPPINGS["CLIPLoader"](),
        "vae": NODE_CLASS_MAPPINGS["VAELoader"](),
        "enc": NODE_CLASS_MAPPINGS["CLIPTextEncode"](),
        "sampler": NODE_CLASS_MAPPINGS["KSampler"](),
        "decode": NODE_CLASS_MAPPINGS["VAEDecode"](),
        "empty": NODE_CLASS_MAPPINGS["EmptyLatentImage"]()
    }

    print("   [*] Loading Checkpoints into VRAM...", end="\r", flush=True)
    unet_model = nodes["unet"].load_unet("z-image-turbo-fp8-e4m3fn.safetensors", "fp8_e4m3fn_fast")[0]
    clip_model = nodes["clip"].load_clip("qwen_3_4b.safetensors", type="lumina2")[0]
    vae_model = nodes["vae"].load_vae("ae.safetensors")[0]
    print("   [OK] Engine Online. Ready to Generate.          ", flush=True)

SAVE_DIR = ROOT / "results"
SAVE_DIR.mkdir(exist_ok=True)

def get_save_path(prompt):
    clean_promt = re.sub(r'[^a-zA-Z0-9_-]', '_', prompt)[:20]
    filename = f"{clean_promt}_{uuid.uuid4().hex[:4]}.png"
    return SAVE_DIR / filename

def flush_mem():
    gc.collect()
    torch.cuda.empty_cache()

def generate_image(positive_prompt, negative_prompt, aspect_ratio, steps, guidance_scale, seed):
    w, h = [int(x) for x in aspect_ratio.split("x")]
    # Limit seed to MAX_SAFE_INTEGER in JS (2**53 - 1) to prevent precision loss in frontend
    gen_seed = torch.randint(0, 9007199254740991, (1,)).item() if seed == -1 else seed
    
    try:
        # Reset progress to loading
        with open(SAVE_DIR / "progress.json", "w") as f:
            json.dump({"current": 0, "total": steps, "status": "loading"}, f)
            
        flush_mem()
        print(f"   [INFO] Generating: {w}x{h} | Steps: {steps} | Seed: {gen_seed}", flush=True)

        with torch.inference_mode():
            pos_enc = nodes["enc"].encode(clip_model, positive_prompt)[0]
            neg_enc = nodes["enc"].encode(clip_model, negative_prompt)[0]
            latent = nodes["empty"].generate(w, h, batch_size=1)[0]

            sample = nodes["sampler"].sample(
                unet_model, gen_seed, steps, guidance_scale,
                "euler", "simple", pos_enc, neg_enc, latent, denoise=1.0
            )[0]

            decoded = nodes["decode"].decode(vae_model, sample)[0].detach()

        img_out = Image.fromarray(np.array(decoded * 255, dtype=np.uint8)[0])
        save_path = get_save_path(positive_prompt)
        img_out.save(save_path)

        print(f"   [OK] Saved to: {save_path}", flush=True)
        
        # Mark as idle
        with open(SAVE_DIR / "progress.json", "w") as f:
            json.dump({"current": steps, "total": steps, "status": "idle"}, f)
            
        return img_out, str(save_path), gen_seed
    except Exception as e:
        log(f"Error: {e}", "error")
        return None, None, None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate an image with Z-Image Turbo FP8")
    parser.add_argument("--prompt", type=str, default=" photograph of a 30 year old north indian woman ", help="Positive prompt for the image")
    parser.add_argument("--negative", type=str, default="blurry, low quality, text, watermark, distorted", help="Negative prompt")
    parser.add_argument("--aspect_ratio", type=str, default="720x1280", help="Aspect ratio (e.g., 720x1280 or 1024x1024)")
    parser.add_argument("--steps", type=int, default=3, help="Number of steps (min:1, max:50)")
    parser.add_argument("--guidance", type=float, default=1.0, help="Guidance scale")
    parser.add_argument("--seed", type=int, default=-1, help="Seed (-1 for random)")

    args, unknown = parser.parse_known_args()
    
    generate_image(args.prompt, args.negative, args.aspect_ratio, args.steps, args.guidance, args.seed)
