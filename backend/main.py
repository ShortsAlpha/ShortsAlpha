import modal
from modal import web_endpoint
from pydantic import BaseModel

# Modal Image Definition
image = modal.Image.debian_slim() \
    .apt_install("ffmpeg", "imagemagick") \
    .pip_install("google-generativeai", "requests", "ffmpeg-python", "fastapi", "boto3", "moviepy==1.0.3") \
    .run_commands("sed -i 's/rights=\"none\" pattern=\"@\\*\"/rights=\"read|write\" pattern=\"@*\"/' /etc/ImageMagick-6/policy.xml")

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
    video_tracks: list
    audio_tracks: list
    text_tracks: list = [] # Added to fix 422
    script: list = []
    output_key: str
    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str
    width: int = 1080
    height: int = 1920




class SubtitleRequest(BaseModel):
    video_tracks: list
    audio_tracks: list
    api_key: str
    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str

@app.function(image=image, timeout=600)
def generate_subtitles_logic(request_data: dict):
    # Imports
    try:
        from moviepy.editor import AudioFileClip, CompositeAudioClip
    except ImportError:
        from moviepy.audio.io.AudioFileClip import AudioFileClip
        from moviepy.audio.compositing.CompositeAudioClip import CompositeAudioClip

    import os
    import requests
    import json
    import google.generativeai as genai
    import time
    
    video_tracks = request_data.get('video_tracks', [])
    audio_tracks = request_data.get('audio_tracks', [])
    api_key = request_data.get('api_key')
    
    print("Starting Subtitle Generation...")
    
    local_assets_dir = "/tmp/assets_subs"
    os.makedirs(local_assets_dir, exist_ok=True)

    # REUSED DOWNLOAD HELPER
    def download_asset(url, prefix):
        ext = ".mp4"
        if "." in url.split("/")[-1]:
             possible_ext = "." + url.split("/")[-1].split(".")[-1].split("?")[0]
             if len(possible_ext) < 5: ext = possible_ext
        filename = f"{prefix}{ext}"
        path = os.path.join(local_assets_dir, filename)
        if os.path.exists(path): return path
        try:
            r = requests.get(url, stream=True, timeout=30)
            r.raise_for_status()
            with open(path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            return path
        except Exception as e:
            print(f"DL Failed: {e}")
            return None

    audio_clips = []
    debug_logs = []
    
    # 1. Extract Audio from Video Tracks
    for idx, track in enumerate(video_tracks):
        url = track.get('url') or track.get('src')
        if not url: continue
        path = download_asset(url, f"vid_{idx}")
        if not path: continue

        # Skip images (Extension check)
        if path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
            print(f"Skipping image {path} for content analysis")
            continue
        
        try:
            # Safer way to get audio from video using MoviePy 1.0.3
            from moviepy.editor import VideoFileClip
            video_clip = VideoFileClip(path)
            if video_clip.audio is None:
                print(f"Warning: Video {idx} has no audio stream.")
                video_clip.close()
                continue
                
            clip = video_clip.audio
            
            start = track.get('start', 0)
            duration = track.get('duration', 0)
            offset = track.get('offset', 0)
            
            # Apply offset
            if offset > 0:
                clip = clip.subclip(offset, clip.duration)
            
            # Apply duration
            if duration > 0:
                 # Ensure we don't exceed clip duration taking offset into account
                 # In MoviePy 1.x subclip is absolute time in the source.
                 # If we already subclipped offset, clip is now shorter.
                 # Actually, subclip(start, end).
                 # Let's use simple logic:
                 # If we sliced offset, new clip starts at 0 relative.
                 if duration < clip.duration:
                    clip = clip.subclip(0, duration)
                
            clip = clip.set_start(start) # MoviePy 1.0.3 uses set_start, not with_start
            
            vol = track.get('volume', 1.0)
            clip = clip.volumex(vol)
            
            audio_clips.append(clip)
            
            # Don't close video_clip immediately if audio_clip depends on it? 
            # In 1.0.3, audio might reference the file. 
            # We keep it open implicitly or risk closing the fd.
            # safe to close video reader but keep audio? 
            # actually moviepy manages this.
        except Exception as e:
            debug_logs.append(f"Error extracting audio from video {idx}: {str(e)}")
            print(f"Error extracting audio from video {idx}: {e}")

    # 2. Extract Audio Tracks
    for idx, track in enumerate(audio_tracks):
        url = track.get('url')
        if not url: continue
        path = download_asset(url, f"aud_{idx}")
        if not path: continue
        
        try:
            clip = AudioFileClip(path)
            start = track.get('start', 0)
            duration = track.get('duration', 0)
            offset = track.get('offset', 0)

            if offset > 0: clip = clip.subclip(offset, clip.duration)
            if duration > 0 and duration < clip.duration: clip = clip.subclip(0, duration)
            
            clip = clip.set_start(start)
            clip = clip.volumex(track.get('volume', 1.0))
            audio_clips.append(clip)
        except Exception as e:
             print(f"Error loading audio {idx}: {e}")

    if not audio_clips:
        return {"status": "error", "message": "No audio found", "debug_logs": debug_logs}

    # 3. Mix
    print(f"Mixing {len(audio_clips)} audio clips...")
    final_audio = CompositeAudioClip(audio_clips)
    output_audio_path = "/tmp/mixed_audio.mp3"
    final_audio.write_audiofile(output_audio_path, fps=24000, logger=None)
    
    # 4. Gemini Transcription
    print("Uploading to Gemini...")
    genai.configure(api_key=api_key)
    
    audio_file = genai.upload_file(path=output_audio_path)
    while audio_file.state.name == "PROCESSING":
        time.sleep(1)
        audio_file = genai.get_file(audio_file.name)
        
    print("Generating Transcript with Gemini 2.5 Pro...")
    model = genai.GenerativeModel("gemini-2.5-pro") # User specific model request
    
    prompt = """
    Listen to this audio and generate precise subtitles.
    Return a JSON array of objects.
    Each object must have:
    - "start": start time in seconds (float)
    - "duration": duration in seconds (float)
    - "text": the spoken text
    
    Example:
    [
      {"start": 0.5, "duration": 2.0, "text": "Hello world"},
      {"start": 2.5, "duration": 1.5, "text": "Welcome back"}
    ]
    
    IMPORTANT: 
    - Adjust timing to match the audio exactly.
    - If there is silence, do not generate text.
    - Keep segments short (max 5-6 words) for video captions.
    """
    
    response = model.generate_content([audio_file, prompt])
    
    try:
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        return {"status": "success", "subtitles": data}
    except Exception as e:
        print(f"Gemini Parse Error: {e}")
        return {"status": "error", "message": str(e), "raw": response.text}

@app.function(image=image, timeout=3600)  # CPU is faster for cold starts on simple edits

def render_video_logic(request_data: dict, r2_creds: dict):
    # Monkeypatch PIL.Image.ANTIALIAS for MoviePy 1.0.3 compatibility with Pillow 10+
    import PIL.Image
    if not hasattr(PIL.Image, 'ANTIALIAS'):
        PIL.Image.ANTIALIAS = PIL.Image.LANCZOS

    # Configure ImageMagick for TextClip
    from moviepy.config import change_settings
    change_settings({"IMAGEMAGICK_BINARY": "/usr/bin/convert"})

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
    text_tracks = request_data.get('text_tracks', []) # Extract Subtitles
    script = request_data.get('script', [])
    output_key = request_data.get('output_key')
    
    print(f"Starting Render (CPU Optimized). Output: {output_key}")
    print("BACKEND VERSION: 2.1.0 - MoviePy v2 Fixes")
    print(f"Video Tracks: {len(video_tracks)}")
    print(f"Audio Tracks: {len(audio_tracks)}")
    print(f"Text Tracks: {len(text_tracks)}")

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

    # Status Helper
    def update_status(msg, percent=0, status="processing"):
        try:
            status_key = f"{output_key}_status.json"
            status_data = {"status": status, "message": msg, "percent": percent, "timestamp": time.time()}
            s3_client.put_object(
                Bucket=r2_creds['bucket_name'],
                Key=status_key,
                Body=json.dumps(status_data),
                ContentType='application/json'
            )
            print(f"STATUS UPDATE: {msg}")
        except Exception as e:
            print(f"Failed to update status: {e}")

    try:
        update_status("Starting render job...", 5)
        clips_to_composite = []
        audio_clips = []
        
        # 1. Process Video Tracks
        video_tracks.sort(key=lambda x: x.get('trackIndex', 0))

        max_duration = 0
        
        update_status("Downloading and processing clips...", 10)
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
                    clip = clip.set_duration(duration)
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
                     clip = clip.subclip(0, duration)
            
            clip = clip.set_start(start_time)
            # Resize Logic for 9:16
            clip = clip.resize(height=1920) 
            if clip.w < 1080:
                clip = clip.resize(width=1080)
            clip = clip.crop(x1=clip.w/2 - 540, y1=0, width=1080, height=1920)
            
            # Apply Volume
            vol = track_data.get('volume', 1.0)
            if clip.audio is not None and vol != 1.0:
                clip = clip.volumex(vol)

            clips_to_composite.append(clip)
            
            if start_time + duration > max_duration:
                max_duration = start_time + duration

        # 2. Process Audio Tracks
        if audio_tracks:
            update_status(f"Processing {len(audio_tracks)} audio tracks...", 40)
            
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
                    clip = clip.subclip(0, duration)
                clip = clip.set_start(start_time)
                
                # Apply Volume
                vol = track_data.get('volume', 1.0)
                if vol != 1.0:
                    clip = clip.volumex(vol)
                    
                audio_clips.append(clip)
                
                if start_time + duration > max_duration:
                     max_duration = start_time + duration
            except Exception as e:
                print(f"Failed to load audio {local_path}: {e}")
                continue

        # 3. Process Text Tracks (Subtitles)
        for track in text_tracks:
            try:
                text = track.get('text')
                if not text: continue
                
                start = track.get('start', 0)
                duration = track.get('duration', 2)
                style = track.get('style', {})
                
                # Extract Style
                font_size = style.get('font_size', 50)
                color = style.get('color', 'white')
                font = 'Arial' # Default
                stroke_color = style.get('stroke', 'black')
                stroke_width = style.get('stroke_width', 0)
                bg_color = style.get('background_color', 'transparent')
                
                # Create Text Clip
                txt_clip = TextClip(
                    text, 
                    fontsize=font_size, 
                    color=color, 
                    font=font,
                    stroke_color=stroke_color if stroke_width > 0 else None,
                    stroke_width=stroke_width if stroke_width > 0 else 0,
                    method='caption', 
                    size=(800, None)
                )
                
                txt_clip = txt_clip.set_start(start).set_duration(duration)
                txt_clip = txt_clip.set_position(('center', 1500)) # Fixed position for now
                
                clips_to_composite.append(txt_clip)
            except Exception as e:
                print(f"Failed to render text track: {e}")

        if script:
             pass 

        if not clips_to_composite:
            print("WARNING: No video clips were loaded! Creating a placeholder.")
            # Create a placeholder to avoid crash, but log it
            max_duration = 5
            bg_clip = ColorClip(size=(1080, 1920), color=(255,0,0), duration=max_duration)
            clips_to_composite.append(bg_clip)

        # COMPOSITE
        time.sleep(0.5) # Allow status to propagate
        update_status("Compositing video layers...", 60)
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
                final_video = final_video.set_audio(final_audio)

        output_path = "/tmp/render_output.mp4"
        update_status("Encoding final video (this may take a while)...", 75)
        final_video.write_videofile(
            output_path, 
            fps=30, 
            codec='libx264', 
            audio_codec='aac',
            audio_fps=44100,
            threads=4, # Multithreading enabled
            preset='fast', 
            ffmpeg_params=['-pix_fmt', 'yuv420p'], # iOS Compatibility
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
        update_status("Uploading final video...", 90)
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
        update_status("Finalizing...", 100, status="finished")
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
        "text_tracks": item.text_tracks, # Fixed: Forward text_tracks
        "script": item.script,
        "output_key": item.output_key
    }
    
    call = render_video_logic.spawn(request_data, r2_creds)
    return {"status": "rendering_started", "call_id": call.object_id}

@app.function(image=light_image)
@web_endpoint(method="POST")
def generate_subtitles(item: SubtitleRequest):
     request_data = {
        "video_tracks": item.video_tracks,
        "audio_tracks": item.audio_tracks,
        "api_key": item.api_key
    }
     # Use .remote() to wait for result (synchronous HTTP)
     # This assumes the operation completes within the HTTP timeout (usually 60-180s)
     result = generate_subtitles_logic.remote(request_data)
     return result


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