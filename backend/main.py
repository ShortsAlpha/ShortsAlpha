import modal
from modal import web_endpoint
from pydantic import BaseModel

# Modal Image Definition
image = modal.Image.debian_slim() \
    .apt_install("ffmpeg", "imagemagick") \
    .pip_install("google-generativeai", "requests", "ffmpeg-python", "fastapi", "boto3", "moviepy")

# Lightweight Image for Web Endpoints (Fast Cold Start)
light_image = modal.Image.debian_slim().pip_install("fastapi", "pydantic")

app = modal.App("shorts-pilot-backend")

class VideoRequest(BaseModel):
    video_url: str
    output_key: str
    api_key: str
    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str

class RenderRequest(BaseModel):
    video_tracks: list  # List of dicts: {url, start, duration, offset, track_index}
    audio_tracks: list  # List of dicts
    script: list        # For subtitles (optional for now)
    output_key: str
    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str

@app.function(image=image, timeout=3600)  # CPU is faster for cold starts on simple edits
def render_video_logic(request_data: dict, r2_creds: dict):
    # COMPATIBILITY IMPORTS (v1 vs v2)
    try:
        # Try v1.x standard first (Most reliable if successful)
        from moviepy.editor import VideoFileClip, AudioFileClip, CompositeVideoClip, CompositeAudioClip, TextClip, ColorClip, concatenate_videoclips
    except ImportError:
        try:
            # Try v2.x Top-Level (Cleanest for 2.0+)
            from moviepy import VideoFileClip, AudioFileClip, CompositeVideoClip, CompositeAudioClip, TextClip, ColorClip, concatenate_videoclips
        except ImportError:
            # Fallback: Manual v2 submodules (if top-level omits some)
            print("Trying manual v2 submodule imports...")
            from moviepy.video.io.VideoFileClip import VideoFileClip
            from moviepy.audio.io.AudioFileClip import AudioFileClip
            from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
            # CompositeAudioClip - try various locations
            try:
                from moviepy.audio.compositing.CompositeAudioClip import CompositeAudioClip
            except ImportError:
                from moviepy.audio.AudioClip import CompositeAudioClip
                
            from moviepy.video.VideoClip import ColorClip, TextClip
            from moviepy.video.compositing.concatenate import concatenate_videoclips

    import boto3
    import os
    import requests
    import json
    import time
    
    video_tracks = request_data.get('video_tracks', [])
    audio_tracks = request_data.get('audio_tracks', [])
    script = request_data.get('script', [])
    output_key = request_data.get('output_key')
    
    print(f"Starting Render (CPU Optimized). Output: {output_key}")
    print("BACKEND VERSION: 2.1.0 - MoviePy v2 Fixes")
    print(f"Video Tracks: {len(video_tracks)}")
    print(f"Audio Tracks: {len(audio_tracks)}")

    # Setup R2
    s3_client = boto3.client(
        's3',
        endpoint_url=f"https://{r2_creds['account_id']}.r2.cloudflarestorage.com",
        aws_access_key_id=r2_creds['access_key_id'],
        aws_secret_access_key=r2_creds['secret_access_key'],
        region_name='auto'
    )

    local_assets_dir = "/tmp/assets"
    os.makedirs(local_assets_dir, exist_ok=True)
    
    # Helper to download
    def download_asset(url, prefix):
        # Infer extension
        ext = ".mp4"
        if "." in url.split("/")[-1]:
             possible_ext = "." + url.split("/")[-1].split(".")[-1].split("?")[0]
             if len(possible_ext) < 5: ext = possible_ext
        
        filename = f"{prefix}{ext}"
        path = os.path.join(local_assets_dir, filename)
        
        if os.path.exists(path): return path
        try:
            print(f"Downloading {url} to {filename}...")
            r = requests.get(url, stream=True, timeout=60)
            r.raise_for_status()
            with open(path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            size = os.path.getsize(path)
            print(f"Downloaded {filename}: {size} bytes")
            if size == 0:
                print(f"WARNING: Downloaded empty file: {url}")
                return None
                
            return path
        except Exception as e:
            print(f"Failed to download {url}: {e}")
            return None

    try:
        clips_to_composite = []
        audio_clips = []
        
        # 1. Process Video Tracks
        video_tracks.sort(key=lambda x: x.get('trackIndex', 0))

        max_duration = 0
        
        for idx, track_data in enumerate(video_tracks):
            url = track_data.get('url') or track_data.get('src')
            if not url: continue
            
            local_path = download_asset(url, f"vid_{idx}")
            if not local_path: continue
            
            start_time = track_data.get('start', 0)
            duration = track_data.get('duration', 0)
            
            # Robust Load
            try:
                # Check if image
                if local_path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    print(f"Detected Image: {local_path}")
                    from moviepy.video.VideoClip import ImageClip
                    clip = ImageClip(local_path)
                    # Images need explicit duration
                    if duration <= 0: duration = 5 # Default 5s for images if not specified
                    clip = clip.with_duration(duration)
                else:
                    print(f"Loading Video: {local_path}")
                    clip = VideoFileClip(local_path)
            except Exception as e:
                print(f"Failed to load clip {local_path}: {e}")
                # Debug: Print file info
                try:
                    import subprocess
                    print("File Info:")
                    subprocess.run(["ls", "-l", local_path])
                except: pass
                continue
            
            if duration > 0 and not isinstance(clip, (ImageClip if 'ImageClip' in locals() else type(None))):
                 if duration < clip.duration:
                     clip = clip.subclipped(0, duration)
            
            clip = clip.with_start(start_time)
            # Resize Logic for 9:16
            clip = clip.resized(height=1920) 
            if clip.w < 1080:
                clip = clip.resized(width=1080)
            clip = clip.cropped(x1=clip.w/2 - 540, y1=0, width=1080, height=1920)
            
            clips_to_composite.append(clip)
            
            if start_time + duration > max_duration:
                max_duration = start_time + duration

        # 2. Process Audio Tracks
        for idx, track_data in enumerate(audio_tracks):
            url = track_data.get('url') or track_data.get('src')
            if not url: continue
            
            local_path = download_asset(url, f"aud_{idx}")

            if not local_path: continue
            
            start_time = track_data.get('start', 0)
            duration = track_data.get('duration', 0)
            
            try:
                clip = AudioFileClip(local_path)
                if duration > 0 and duration < clip.duration:
                    clip = clip.subclipped(0, duration)
                clip = clip.with_start(start_time)
                audio_clips.append(clip)
                
                if start_time + duration > max_duration:
                     max_duration = start_time + duration
            except Exception as e:
                print(f"Failed to load audio {local_path}: {e}")
                continue

        # 3. Process Subtitles
        if script:
             pass 

        if not clips_to_composite:
            print("WARNING: No video clips were loaded! Creating a placeholder.")
            # Create a placeholder to avoid crash, but log it
            max_duration = 5
            bg_clip = ColorClip(size=(1080, 1920), color=(255,0,0), duration=max_duration)
            clips_to_composite.append(bg_clip)

        # COMPOSITE
        print(f"Compositing {len(clips_to_composite)} video clips...")
        bg_clip = ColorClip(size=(1080, 1920), color=(0,0,0), duration=max_duration)
        final_video = CompositeVideoClip([bg_clip] + clips_to_composite)
        
        if audio_clips:
            video_audio = final_video.audio
            all_audio = [video_audio] + audio_clips if video_audio else audio_clips
            # Filter None
            all_audio = [a for a in all_audio if a is not None]
            if all_audio:
                final_audio = CompositeAudioClip(all_audio)
                final_video = final_video.with_audio(final_audio)

        output_path = "/tmp/render_output.mp4"
        final_video.write_videofile(
            output_path, 
            fps=30, 
            codec='libx264', 
            audio_codec='aac',
            audio_fps=44100,
            threads=4, # Multithreading enabled
            preset='fast', 
            logger=None # Disable progress bar to prevent deadlocks
        )
        
        # Check generated file size
        if os.path.exists(output_path):
            size = os.path.getsize(output_path)
            print(f"Generated Video Size: {size} bytes")
            if size < 1000:
                print("WARNING: Video file is suspiciously small!")
        else:
            print("ERROR: Output file was not created!")
        
        # Upload
        print("Uploading rendered video...")
        s3_client.upload_file(
            output_path, 
            r2_creds['bucket_name'], 
            output_key,
            ExtraArgs={'ContentType': 'video/mp4', 'ContentDisposition': 'attachment'} # Force Download
        )
        # Placeholder structure for URL (adjust as needed for public access)
        # url = f"https://{r2_creds['bucket_name']}.{r2_creds['account_id']}.r2.cloudflarestorage.com/{output_key}" 
        # Better public URL construction if using custom domain:
        # url = f"https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/{output_key}"
            
        print("Render Success!")
        return {"status": "completed", "key": output_key}

    except Exception as e:
        print(f"Render Failed: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "failed", "error": str(e)}

@app.function(image=image, gpu="T4", timeout=1800)
def process_video_logic(video_url: str, output_key: str, api_key: str, r2_credentials: dict):
    import ffmpeg
    import requests
    import os
    import time
    import json
    import boto3
    import google.generativeai as genai
    import traceback
    
    # Setup R2 Client
    def get_r2_client():
        return boto3.client(
            's3',
            endpoint_url=f"https://{r2_credentials['account_id']}.r2.cloudflarestorage.com",
            aws_access_key_id=r2_credentials['access_key_id'],
            aws_secret_access_key=r2_credentials['secret_access_key'],
            region_name='auto'
        )

    # Determine keys
    base_name = os.path.splitext(output_key)[0]
    started_key = f"{base_name}_started.json"
    result_key = f"{base_name}_result.json"
    error_key = f"{base_name}_error.json"
    
    print(f"Processing video: {video_url}")
    
    try:
        r2 = get_r2_client()
        
        # 0. Upload STARTED marker
        r2.put_object(
            Bucket=r2_credentials['bucket_name'],
            Key=started_key,
            Body=json.dumps({"status": "started", "timestamp": time.time()})
        )
        print("Uploaded STARTED marker.")

        # Configure Gemini
        genai.configure(api_key=api_key)
        
        local_input = "/tmp/input.mp4"
        local_output = "/tmp/output.mp4"
        json_output_path = "/tmp/result.json"
        
        # 1. Download Video
        try:
            response = requests.get(video_url, stream=True, timeout=60)
            response.raise_for_status()
            with open(local_input, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print("Download complete.")
        except Exception as e:
            raise RuntimeError(f"Download failed: {str(e)}")

        # 2. Upload to Gemini File API
        print("Uploading to Gemini File API...")
        video_file = genai.upload_file(path=local_input)
        
        # Wait for processing
        while video_file.state.name == "PROCESSING":
            time.sleep(2)
            video_file = genai.get_file(video_file.name)
            
        if video_file.state.name == "FAILED":
            raise ValueError(f"Gemini File Processing Failed: {video_file.state.name}")

        # 3. Generate Content
        # User explicitly requested gemini-2.5-pro
        model = genai.GenerativeModel(model_name="gemini-2.5-pro") 
        prompt = """
        Watch this video and create a viral short video script.
        For each scene, provide:
        - start_time and end_time (e.g. 00:00 - 00:02)
        - description (visuals)
        - voiceover (the exact text to be spoken by the narrator)
        
        Return the result in JSON format with keys: 
        - 'script' (array of scene objects)
        - 'keywords'
        - 'virality_score' (number)
        """
        
        response = model.generate_content([video_file, prompt], request_options={"timeout": 600})
        print(f"Gemini usage: {response.usage_metadata}")
        
        # 4. Parse Result
        result_text = response.text.replace("```json", "").replace("```", "").strip()
        analysis_result_json = json.loads(result_text)
        print("Gemini Analysis Result:", analysis_result_json)
        
        # 5. Generate Audio (TTS)
        # MOVED TO STUDIO PHASE: TTS will be triggered separately in the Studio view.
        # This prevents timeouts during the initial analysis phase.
        try:
            print("Skipped TTS for initial analysis (moved to Studio)...")
            # voiceover_text = " ".join([scene.get('voiceover', '') for scene in analysis_result_json.get('script', []) if scene.get('voiceover')])
            pass 
        except Exception as e:
            print(f"Skipped TTS: {e}")
            
        # 4. Parse Result (Ensure we didn't break anything)

        # 6. Save Result to R2
        final_result_data = {
            "status": "completed",
            "video_url": video_url,
            "analysis": analysis_result_json, # Use the parsed and potentially augmented JSON
            "timestamp": time.time()
        }
        
        r2.put_object(
            Bucket=r2_credentials['bucket_name'],
            Key=result_key, # Fix: Save as _result.json, not .mp4
            Body=json.dumps(final_result_data),
            ContentType='application/json'
        )
        print(f"Result saved to R2: {result_key}")
        
    except Exception as e:
        print(f"Error processing video: {e}")
        # Save error to R2
        error_data = {
            "error": str(e), 
            "traceback": traceback.format_exc(),
            "status": "failed"
        }
        try:
            r2.put_object(
                Bucket=r2_credentials['bucket_name'],
                Key=error_key, # Use the pre-defined error_key
                Body=json.dumps(error_data),
                ContentType='application/json'
            )
            print("Uploaded ERROR marker.")
        except Exception as upload_err:
            print(f"Failed to upload error marker: {upload_err}")
            
    return {"status": "finished"}

@app.function(image=light_image)
@web_endpoint(method="POST")
def process_video(item: VideoRequest):
    # Pack credentials
    r2_creds = {
        "account_id": item.r2_account_id,
        "access_key_id": item.r2_access_key_id,
        "secret_access_key": item.r2_secret_access_key,
        "bucket_name": item.r2_bucket_name
    }
    
    # Pass API key and R2 credentials to the spawned function
    call = process_video_logic.spawn(item.video_url, item.output_key, item.api_key, r2_creds)
    return {"status": "started", "call_id": call.object_id}

@app.function(image=light_image)
@web_endpoint(method="POST")
def render_video(item: RenderRequest):
    r2_creds = {
        "account_id": item.r2_account_id,
        "access_key_id": item.r2_access_key_id,
        "secret_access_key": item.r2_secret_access_key,
        "bucket_name": item.r2_bucket_name
    }
    
    request_data = {
        "video_tracks": item.video_tracks,
        "audio_tracks": item.audio_tracks,
        "script": item.script,
        "output_key": item.output_key
    }
    
    call = render_video_logic.spawn(request_data, r2_creds)
    return {"status": "rendering_started", "call_id": call.object_id}
    path = list(moviepy.__path__)
    modules = []
    for importer, modname, ispkg in pkgutil.walk_packages(path=path, prefix=moviepy.__name__+"."):
        modules.append(modname)
    
    # Raise exception to ensure we see the output in the summary
    raise RuntimeError(f"MoviePy Version: {getattr(moviepy, '__version__', 'unknown')}\nModules: {', '.join(modules)}")

# Local test
@app.local_entrypoint()
def main():
    inspect_moviepy.remote()

@app.function(image=image, schedule=modal.Cron("0 0 * * *")) # Run once a day at midnight
def cleanup_old_files():
    import boto3
    import time
    from datetime import datetime, timedelta
    
    # HARDCODED CREDENTIALS (MVP)
    r2_creds = {
        "account_id": "6ff495afe34538a6274dfba7a185f867",
        "access_key_id": "998d25b995f441ab296ce0d96314d4e7",
        "secret_access_key": "c90f03bb4ecc7134deeddd16a4d8b7b0f281fa2311f77f305f91ef58010b55f3",
        "bucket_name": "shortsalpha"
    }

    print("Starting periodic cleanup...")
    
    s3 = boto3.client(
        's3',
        endpoint_url=f"https://{r2_creds['account_id']}.r2.cloudflarestorage.com",
        aws_access_key_id=r2_creds['access_key_id'],
        aws_secret_access_key=r2_creds['secret_access_key'],
        region_name='auto'
    )
    
    bucket = r2_creds['bucket_name']
    
    try:
        # List objects
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket)

        deleted_count = 0
        now = datetime.utcnow()
        retention_period = timedelta(hours=24)

        for page in page_iterator:
            if 'Contents' not in page:
                continue
                
            for obj in page['Contents']:
                key = obj['Key']
                last_modified = obj['LastModified'].replace(tzinfo=None) # Make naive
                
                # Check age
                age = now - last_modified
                if age > retention_period:
                    # Check if it is a render output or related
                    # We accept .mp4 in root or processed/
                    if key.endswith(".mp4") or "processed/" in key or "export_" in key:
                        print(f"Deleting old file: {key} (Age: {age})")
                        s3.delete_object(Bucket=bucket, Key=key)
                        deleted_count += 1

        print(f"Cleanup complete. Deleted {deleted_count} files.")
        
    except Exception as e:
        print(f"Cleanup failed: {e}")
        import traceback
        traceback.print_exc()