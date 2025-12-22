# @title 🚀 Launch AI Video Server (SDXL-Turbo + SVD-XT)
# Copy this entire script into a Google Colab cell and run it.

import os
import os
# Must be set before importing torch
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

import torch
from flask import Flask, request, send_file, jsonify
from pyngrok import ngrok
from diffusers import AutoPipelineForText2Image, StableVideoDiffusionPipeline
from diffusers.utils import load_image, export_to_video
import cv2
import numpy as np
from PIL import Image
import uuid

# --- CONFIGURATION ---
# PASTE YOUR NGROK TOKEN BELOW:
NGROK_AUTH_TOKEN = "REPLACE_WITH_YOUR_NGROK_TOKEN"
# PASTE YOUR HF TOKEN BELOW:
HF_TOKEN = "REPLACE_WITH_YOUR_HF_TOKEN"
PORT = 5000

# --- SETUP & INSTALL ---
# Uncomment these lines if running in a fresh Colab environment
# !pip install diffusers transformers accelerate flask pyngrok opencv-python

from huggingface_hub import login
if HF_TOKEN.startswith("hf_"):
    login(token=HF_TOKEN)

app = Flask(__name__)

# --- GENERATION PIPELINE (EXTREME LOW VRAM MODE) ---
import gc

def flush():
    gc.collect()
    torch.cuda.empty_cache()
    torch.cuda.ipc_collect()

def resize_image_for_video(image, width=1024, height=576):
    return image.resize((width, height), Image.LANCZOS)

# --- ASYNC JOB SYSTEM ---
import threading
import time

JOBS = {}

def process_video_generation(job_id, prompt):
    try:
        JOBS[job_id] = {"status": "processing", "message": "Starting..."}
        print(f"🧵 {job_id}: Processing started for '{prompt}'")
        
        flush()
        
        # --- PHASE 1: TEXT TO IMAGE ---
        JOBS[job_id]["message"] = "Generating Base Image (SDXL-Turbo)..."
        print(f"🧵 {job_id}: Loading SDXL...")
        
        try:
            # --- PHASE 1: TEXT TO IMAGE ---
            JOBS[job_id]["message"] = "Generating Image (SDXL-Turbo)..."
            print(f"🧵 {job_id}: Loading SDXL...")
            
            # Explicitly load SDXL only for this phase
            txt2img_pipe = AutoPipelineForText2Image.from_pretrained(
                "stabilityai/sdxl-turbo", 
                torch_dtype=torch.float16, 
                variant="fp16"
            )
            txt2img_pipe.to("cuda")
            
            image = txt2img_pipe(prompt=prompt, num_inference_steps=2, guidance_scale=0.0, width=1024, height=576).images[0]
            
            # CRITICAL: DELETE SDXL IMMEDIATELY
            del txt2img_pipe
            flush()
            
            image = resize_image_for_video(image)
            
            # --- PHASE 2: IMAGE TO VIDEO ---
            JOBS[job_id]["message"] = "Generating Video (SVD)..."
            print(f"🧵 {job_id}: Loading SVD...")
            
            # Explicitly load SVD only after SDXL is gone
            img2vid_pipe = StableVideoDiffusionPipeline.from_pretrained(
                "stabilityai/stable-video-diffusion-img2vid", 
                torch_dtype=torch.float16, 
                variant="fp16"
            )
            
            # Use chunks to save VRAM
            img2vid_pipe.to("cuda")
            img2vid_pipe.unet.enable_forward_chunking()
            
            frames = img2vid_pipe(
                image, 
                decode_chunk_size=2, # Increased slightly as we have more VRAM now
                generator=torch.manual_seed(42),
                motion_bucket_id=127,
                noise_aug_strength=0.1,
            ).frames[0]
            
            # CRITICAL: DELETE SVD IMMEDIATELY
            del img2vid_pipe
            flush()

        except Exception as inner_e:
            raise inner_e

        # Step 3: Save
        JOBS[job_id]["message"] = "Saving Video..."
        filename = f"/content/generated_{job_id}.mp4"
        export_to_video(frames, filename, fps=7)
        
        JOBS[job_id]["status"] = "completed"
        JOBS[job_id]["filename"] = filename
        JOBS[job_id]["message"] = "Done!"
        print(f"✅ {job_id}: Completed.")

    except Exception as e:
        print(f"❌ {job_id}: Failed - {str(e)}")
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = str(e)


# --- API ENDPOINTS ---
@app.route('/', methods=['GET'])
def health():
    return "AI Video Server Active! 🚀", 200

@app.route('/generate', methods=['POST'])
def run_generation():
    data = request.json
    prompt = data.get('prompt', 'A cinematic video')
    job_id = str(uuid.uuid4())
    
    # Start background thread
    thread = threading.Thread(target=process_video_generation, args=(job_id, prompt))
    thread.start()
    
    return jsonify({
        "status": "processing",
        "job_id": job_id,
        "message": "Generation started in background"
    })

@app.route('/poll', methods=['GET'])
def poll_status():
    job_id = request.args.get('job_id')
    if not job_id or job_id not in JOBS:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(JOBS[job_id])

@app.route('/download', methods=['GET'])
def download_video():
    job_id = request.args.get('job_id')
    if not job_id or job_id not in JOBS:
        return jsonify({"error": "Job not found"}), 404
    
    if JOBS[job_id]["status"] != "completed":
        return jsonify({"error": "Video not ready"}), 400
        
    return send_file(JOBS[job_id]["filename"], mimetype='video/mp4')

# --- RUN SERVER ---
if __name__ == '__main__':
    # Set authtoken if not done via CLI
    if NGROK_AUTH_TOKEN != "YOUR_NGROK_TOKEN_HERE":
        ngrok.set_auth_token(NGROK_AUTH_TOKEN)
        
    # Open tunnel
    public_url = ngrok.connect(PORT).public_url
    print(f"🌍 Public URL: {public_url}")
    print("👉 Use this URL in your ShortsAlpha backend configuration.")
    
    app.run(port=PORT)
