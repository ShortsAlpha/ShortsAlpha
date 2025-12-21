import modal
from modal import web_endpoint
from pydantic import BaseModel
import os

# Modal Image Definition
# We use standard system fonts for image build, but EMBED custom fonts explicitly.
# ORDER MATTERS: run_commands must happen BEFORE add_local_file
image = modal.Image.debian_slim() \
    .apt_install("ffmpeg", "imagemagick", "fonts-liberation", "fonts-dejavu", "fontconfig", "fonts-freefont-ttf", "fonts-roboto", "fonts-lato", "fonts-open-sans", "wget", "curl", "ca-certificates") \
    .pip_install("google-generativeai", "requests", "ffmpeg-python", "fastapi", "boto3", "moviepy==1.0.3", "edge-tts") \
    .run_commands("sed -i 's/rights=\"none\" pattern=\"@\\*\"/rights=\"read|write\" pattern=\"@*\"/' /etc/ImageMagick-6/policy.xml") \
    .add_local_file("backend/fonts/Anton-Regular.ttf", "/root/fonts/Anton-Regular.ttf") \
    .add_local_file("backend/fonts/BebasNeue-Regular.ttf", "/root/fonts/BebasNeue-Regular.ttf") \
    .add_local_file("backend/fonts/Montserrat-Bold.ttf", "/root/fonts/Montserrat-Bold.ttf") \
    .add_local_file("backend/fonts/Montserrat-Black.ttf", "/root/fonts/Montserrat-Black.ttf") \
    .add_local_file("backend/fonts/Poppins-Bold.ttf", "/root/fonts/Poppins-Bold.ttf") \
    .add_local_file("backend/fonts/Lato-Bold.ttf", "/root/fonts/Lato-Bold.ttf") \
    .add_local_file("backend/fonts/Oswald-Bold.ttf", "/root/fonts/Oswald-Bold.ttf") \
    .add_local_file("backend/fonts/Raleway-Bold.ttf", "/root/fonts/Raleway-Bold.ttf")





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

class TTSRequest(BaseModel):
    text: str
    voice: str
    speed: float = 1.0
    output_key: str
    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str

@app.function(image=image, timeout=600)
@web_endpoint(method="POST")
async def generate_speech(request: TTSRequest):
    import edge_tts
    import os
    import boto3
    import uuid
    import traceback
    
    try:
        print(f"Generating Speech: {request.text[:50]}... Voice: {request.voice} Speed: {request.speed}")
        
        # Calculate Rate string
        rate_pct = int((request.speed - 1.0) * 100)
        rate_str = f"{rate_pct:+d}%"
        
        output_filename = f"speech_{uuid.uuid4()}.mp3"
        output_file = f"/tmp/{output_filename}"
        
        communicate = edge_tts.Communicate(request.text, request.voice, rate=rate_str)
        await communicate.save(output_file)
        
        # Upload to R2
        s3 = boto3.client('s3',
            endpoint_url=f"https://{request.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=request.r2_access_key_id,
            aws_secret_access_key=request.r2_secret_access_key
        )
        
        print(f"Uploading to R2: {request.output_key}")
        with open(output_file, "rb") as f:
            s3.upload_fileobj(f, request.r2_bucket_name, request.output_key, ExtraArgs={'ContentType': 'audio/mpeg'})
            
        # Cleanup
        if os.path.exists(output_file):
            os.remove(output_file)
            
        return {"status": "success", "key": request.output_key}

    except Exception as e:
        print(f"TTS Error: {str(e)}")
        traceback.print_exc()
        # Return error as JSON with 500 status logic handled by client check
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")

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
                 if duration < clip.duration:
                    clip = clip.subclip(0, duration)
                
            clip = clip.set_start(start) # MoviePy 1.0.3 uses set_start, not with_start
            
            vol = track.get('volume', 1.0)
            clip = clip.volumex(vol)
            
            audio_clips.append(clip)
            
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

@app.function(image=image, timeout=3600)  # Embedded fonts, no mount arg needed
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

    # --- IMPORTS ---
    import os
    import boto3
    import requests
    import json
    import time
    import subprocess
    
    # Runtime Font Cache (since build-time cache misses added files)
    if not os.path.exists("/tmp/font_cache_init"):
        print("Initializing Font Cache (Runtime)...")
        subprocess.run(["fc-cache", "-f", "-v"], check=False)
        with open("/tmp/font_cache_init", "w") as f: f.write("done")
    
    video_tracks = request_data.get('video_tracks', [])
    audio_tracks = request_data.get('audio_tracks', [])
    text_tracks = request_data.get('text_tracks', []) # Extract Subtitles
    script = request_data.get('script', [])
    output_key = request_data.get('output_key')
    
    print(f"Starting Render (CPU Optimized). Output: {output_key}")
    print("BACKEND VERSION: 2.6.0 - Hostile Font Environment Fixes") 
    print(f"Video Tracks: {len(video_tracks)}")
    print(f"Audio Tracks: {len(audio_tracks)}")
    print(f"Text Tracks: {len(text_tracks)}")
    
    # Debug: List fonts
    base_path = "/usr/share/fonts/truetype/custom"
    if os.path.exists(base_path):
        print(f"Custom Fonts Present: {os.listdir(base_path)}")
    else:
        print("CRITICAL ERROR: Custom font directory missing!")

    # Setup R2
    s3_client = boto3.client(
        's3',
        endpoint_url=f"https://{r2_creds['account_id']}.r2.cloudflarestorage.com",
        aws_access_key_id=r2_creds['access_key_id'],
        aws_secret_access_key=r2_creds['secret_access_key'],
        region_name='auto'
    )
    
   # ... (Download helper omitted for brevity in diff, assume it exists or use full replace if needed) ...
    # RE-DECLARING download_asset helper since replace_file_content scope is sticky
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
                
                # Force Int Font Size (Critical for Pillow)
                font_size = int(float(style.get('fontSize') or style.get('font_size') or 60))
                color = style.get('color', 'white')
                requested_font = style.get('fontFamily') or style.get('font_family') or 'Arial'
                
                # Font Logic - Relocated to /root/fonts for safety
                base_path = "/root/fonts"
                
                raw_font_map = {
                    'Anton': f'{base_path}/Anton-Regular.ttf',
                    'Bebas Neue': f'{base_path}/BebasNeue-Regular.ttf',
                    'Montserrat': f'{base_path}/Montserrat-Bold.ttf',
                    'Montserrat-Black': f'{base_path}/Montserrat-Black.ttf', # Added Black variant
                    'Poppins': f'{base_path}/Poppins-Bold.ttf',
                    'Lato': f'{base_path}/Lato-Bold.ttf',
                    'Oswald': f'{base_path}/Oswald-Bold.ttf',
                    'Raleway': f'{base_path}/Raleway-Bold.ttf',
                    'Roboto': '/usr/share/fonts/truetype/roboto/hinted/Roboto-Bold.ttf', 
                    'Open Sans': '/usr/share/fonts/truetype/open-sans/OpenSans-Bold.ttf',
                    'Inter': '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf' 
                }
                
                # Case-Insensitive Lookup
                font_map = {k.lower(): v for k, v in raw_font_map.items()}
                font_map = {k.lower(): v for k, v in raw_font_map.items()}
                font_path = font_map.get(str(requested_font).lower())

                # Smart Weight Selection for Montserrat
                font_weight = style.get('fontWeight') or style.get('font_weight')
                if str(requested_font).lower() == 'montserrat':
                    try:
                        weight_val = int(font_weight) if font_weight else 400
                        if weight_val >= 800:
                             font_path = font_map.get('montserrat-black')
                             print("Selected Montserrat-Black based on weight 900")
                    except:
                       pass
                
                
                font_found = False
                if font_path:
                    if os.path.exists(font_path):
                         font = font_path
                         font_found = True
                         print(f"Found Custom Font: {font}")
                    else:
                         print(f"MISSING Custom Font: {font_path}")
                         
                if not font_found:
                    # Fallback
                    if os.path.exists("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
                        font = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
                    else:
                        font = "Arial"
                    print(f"Fallback Font: {font}")
                
                # Text Transform (Uppercase support)
                text_transform = style.get('textTransform') or style.get('text_transform')
                if text_transform == 'uppercase':
                    text = text.upper()
                
                stroke_color = style.get('stroke', '#000000')
                # Check both keys for stroke width
                stroke_width = style.get('strokeWidth')
                if stroke_width is None: stroke_width = style.get('stroke_width')
                stroke_width = int(stroke_width) if stroke_width is not None else 0
                
                print(f"Style Debug: {style}")
                print(f"Generating Output using PILLOW (Pure Python)...")

                # Helper to render using Pillow
                def generate_pillow_text(text, font_path, font_size, color, stroke_color, stroke_width, bg_color):
                     import uuid
                     import textwrap
                     from PIL import Image, ImageDraw, ImageFont
                     
                     temp_filename = f"/tmp/txt_{uuid.uuid4()}.png"
                     
                     # 1. Load Font (ROBUST)
                     font = None
                     print(f"DEBUG: Loading font: '{font_path}' Size: {font_size}")
                     
                     if font_path and os.path.exists(font_path):
                         try:
                            font = ImageFont.truetype(font_path, font_size)
                         except Exception as e:
                            print(f"ERROR: Failed to load custom font {font_path}: {e}")

                     if font is None:
                         # Fallback to system bold font (Vector)
                         fallback_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
                         if os.path.exists(fallback_path):
                             print(f"WARNING: Using Fallback System Font: {fallback_path}")
                             try:
                                 font = ImageFont.truetype(fallback_path, font_size)
                             except:
                                 pass
                     
                     if font is None:
                        print("CRITICAL: All fonts failed. Using bitmap default (Tiny).")
                        font = ImageFont.load_default()

                     # 2. Pixel-Based Wrapping (Matches CSS/Studio behavior)
                     # Fixed char limit causes "narrow column" look for small fonts.
                     # We must wrap based on VIDEO WIDTH (1080p) - PADDING.
                     
                     # INCREASED SAFETY MARGIN: 980px (was 850px)
                     # 1080 - 980 = 100px padding total (~50px each side)
                     # User wants wider text, less stacking.
                     MAX_WIDTH_PX = 980 
                     
                     words = text.split()
                     wrapped_lines = []
                     current_line_words = []
                     
                     for word in words:
                         # Test width effectively
                         test_line = " ".join(current_line_words + [word])
                         
                         try:
                             # Modern Pillow
                             line_w = font.getlength(test_line)
                         except AttributeError:
                             # Older Pillow
                             line_w, _ = font.getsize(test_line)
                         
                         # Account for stroke width (left + right) in the width calculation
                         total_w = line_w + (int(stroke_width) * 2)

                         if total_w <= MAX_WIDTH_PX:
                             current_line_words.append(word)
                         else:
                             if current_line_words:
                                 wrapped_lines.append(" ".join(current_line_words))
                                 current_line_words = [word] # Start new line with current word
                             else:
                                 # One massive word? Force break it or just let it overflow?
                                 # Let's just put it on the line
                                 wrapped_lines.append(word)
                                 current_line_words = []
                     
                     if current_line_words:
                         wrapped_lines.append(" ".join(current_line_words))
                     
                     if not wrapped_lines: # Empty text safety
                         wrapped_lines = [" "]

                     # 3. Calculate Dimensions
                     dummy_draw = ImageDraw.Draw(Image.new('RGBA', (1, 1)))

                     
                     # Get Max Width/Height
                     line_heights = []
                     max_width = 0
                     
                     # Calculate bbox for each line
                     
                     total_height = 0
                     line_spacing = 5 # Tighter line spacing
                     
                     valid_lines = []
                     
                     for line in wrapped_lines:
                         # textbbox(xy, text, font=, stroke_width=)
                         # xy is top-left
                         try:
                            bbox = dummy_draw.textbbox((0, 0), line, font=font, stroke_width=int(stroke_width))
                            w = bbox[2] - bbox[0]
                            h = bbox[3] - bbox[1]
                         except AttributeError:
                             # Old PIL fallback
                             w, h = dummy_draw.textsize(line, font=font, stroke_width=int(stroke_width))
                         
                         max_width = max(max_width, w)
                         line_heights.append(h)
                         total_height += h
                         valid_lines.append(line)
                     
                     total_height += (len(valid_lines) - 1) * line_spacing
                     
                     # Add padding
                     padding = 40
                     img_w = int(max_width + padding * 2)
                     img_h = int(total_height + padding * 2)
                     
                     # 4. Create Image
                     # Handle bg color
                     bg_rgba = (0,0,0,0) # Transparent
                     if bg_color and bg_color != 'transparent':
                         # Convert color name/hex to rgba? 
                         # PIL handles common names and hex.
                         bg_rgba = bg_color 
                     
                     img = Image.new('RGBA', (img_w, img_h), bg_rgba)
                     draw = ImageDraw.Draw(img)
                     
                     # 5. Draw Text
                     current_y = padding
                     for i, line in enumerate(valid_lines):
                         # Center text horizontally
                         # We need line width again
                         try:
                            bbox = draw.textbbox((0, 0), line, font=font, stroke_width=int(stroke_width))
                            line_w = bbox[2] - bbox[0]
                         except:
                             line_w, _ = draw.textsize(line, font=font, stroke_width=int(stroke_width))
                         
                         x = (img_w - line_w) // 2
                         
                         # Draw Stroke & Fill
                         draw.text(
                             (x, current_y), 
                             line, 
                             font=font, 
                             fill=color, 
                             stroke_width=int(stroke_width), 
                             stroke_fill=stroke_color,
                             align='center'
                        )
                         current_y += line_heights[i] + line_spacing
                         
                     img.save(temp_filename)
                     print(f"PIL Generated: {temp_filename}")
                     return temp_filename

                img_path = None
                using_fallback_renderer = False
                bg_color = 'transparent' # Default for text rendering

                try:
                    # Attempt 1: Trusted Custom Font + Pillow (Best Quality)
                    img_path = generate_pillow_text(text, font, font_size, color, stroke_color, stroke_width, bg_color)
                except Exception as e:
                    print(f"PIL Custom Font Failed: {e}")
                    # Attempt 2: System Font + Pillow
                    try: 
                        fallback = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
                        if not os.path.exists(fallback): fallback = "Arial"
                        img_path = generate_pillow_text(text, fallback, font_size, color, stroke_color, stroke_width, bg_color)
                        print("Fallback Font Image Generated (PIL)")
                    except Exception as e2:
                        print(f"PIL Fallback Failed: {e2}")
                        using_fallback_renderer = True
                
                if not using_fallback_renderer and img_path and os.path.exists(img_path):
                    from moviepy.editor import ImageClip
                    txt_clip = ImageClip(img_path).set_duration(duration)
                else:
                    # ULTIMATE SAFETY NET: MoviePy Caption (Visible but Ugly)
                    print("CRITICAL: PIL failed. Reverting to MoviePy 'caption' fallback.")
                    try:
                        # This works reliably but ignores strokes/uppercase often
                        from moviepy.editor import TextClip
                        txt_clip = TextClip(
                                text, 
                                fontsize=font_size, 
                                color=color, 
                                font="Arial", 
                                method='caption',
                                size=(900, None)
                        )
                    except Exception as e3:
                         print(f"Final Fallback Failed: {e3}")
                         # Empty clip to prevent crash
                         from moviepy.editor import ColorClip
                         txt_clip = ColorClip(size=(100,100), color=(0,0,0,0), duration=duration)
                
                txt_clip = txt_clip.set_start(start)

                
                txt_clip = txt_clip.set_start(start).set_duration(duration)
                
                # Positioning Logic
                # Priority: Root positionX -> Style x -> Default
                pos_x = track.get('positionX')
                if pos_x is None: pos_x = style.get('x')
                
                pos_y = track.get('positionY')
                if pos_y is None: pos_y = style.get('y')
                
                # Default to Center-Bottom
                if pos_x is None: pos_x = 0.5
                if pos_y is None: pos_y = 0.8
                
                # Canvas Dimensions
                W, H = 1080, 1920
                
                # Calculate absolute center target
                target_center_x = pos_x * W
                target_center_y = pos_y * H
                
                # Center Pivot conversion
                final_x = target_center_x - (txt_clip.w / 2)
                final_y = target_center_y - (txt_clip.h / 2)
                
                # ANIMATION LOGIC
                anim_type = style.get('animation')
                
                if anim_type == 'slide_up':
                     # Slide from 50px below combined with Fade
                     txt_clip = txt_clip.set_position(lambda t: (final_x, final_y + 50 * max(0, 1 - t/0.3))).fadein(0.3)
                     
                elif anim_type == 'fade':
                     txt_clip = txt_clip.set_position((final_x, final_y)).fadein(0.3)
                     
                elif anim_type == 'pop' or anim_type == 'typewriter': 
                     # Pop: Scale 0 -> 1 over 0.2s (Simulating pop)
                     # (Typewriter mapped to Pop for now as v1 fallback for single-image clips)
                     def pop_scale(t):
                         if t < 0.25: return t / 0.25
                         return 1
                         
                     # Centered Resize Logic (Compensate for top-left anchor)
                     w_orig, h_orig = txt_clip.w, txt_clip.h
                     txt_clip = txt_clip.resize(pop_scale)
                     
                     def centered_pos(t):
                         s = pop_scale(t)
                         return (
                             final_x + (w_orig - w_orig*s)/2,
                             final_y + (h_orig - h_orig*s)/2
                         )
                     
                     txt_clip = txt_clip.set_position(centered_pos)
                     txt_clip = txt_clip.set_position(centered_pos)
                     
                elif anim_type == 'bounce':
                     # Bounce: Simple vertical oscillation
                     # y(t) = final_y - 30 * |sin(3*t)|  (Bounces up)
                     import math
                     def bounce_pos(t):
                         return (final_x, final_y - 80 * abs(math.sin(3 * t)))
                     txt_clip = txt_clip.set_position(bounce_pos)
                     
                elif anim_type == 'shake':
                     # Shake: Fast horizontal oscillation
                     import math
                     def shake_pos(t):
                         return (final_x + 20 * math.sin(20 * t), final_y)
                     txt_clip = txt_clip.set_position(shake_pos)
                     
                     txt_clip = txt_clip.set_position(shake_pos)
                     
                elif anim_type == 'swing':
                     # Swing: Pendulum rotation
                     # angle(t) = 15 * sin(2*t)
                     import math
                     txt_clip = txt_clip.rotate(lambda t: 15 * math.sin(2 * t)).set_position((final_x, final_y))

                elif anim_type == 'glitch':
                     # Glitch: Jumps randomly
                     import random
                     def glitch_pos(t):
                         # Jump every 0.1s
                         if int(t * 10) % 5 == 0:
                             return (final_x + random.randint(-20, 20), final_y + random.randint(-10, 10))
                         return (final_x, final_y)
                     txt_clip = txt_clip.set_position(glitch_pos)
                     
                else:
                     txt_clip = txt_clip.set_position((final_x, final_y))
                
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
            ffmpeg_params=[
                '-pix_fmt', 'yuv420p',
                '-profile:v', 'baseline',
                '-level', '3.0',
                '-movflags', '+faststart'
            ], # Maximum iOS Compatibility
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
            ExtraArgs={'ContentType': 'video/mp4', 'ContentDisposition': 'inline'} # Allow Inline Playback (Fixes iOS Player)
        )
            
        # Upload Result JSON (Corrected for History API)
        result_key = f"{output_key}_result.json"
        public_url = f"https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/{output_key}"
        
        # summary from script (first 100 chars of first item)
        summary_text = "Video Render"
        if 'script' in request_data and request_data['script']:
            summary_text = request_data['script'][0].get('text', 'Video Render')[:100]

        result_data = {
            "status": "completed",
            "output_url": public_url,
            "key": output_key,
            "script": request_data.get('script', []),
            "summary": summary_text,
            "timestamp": time.time()
        }
        
        print(f"Uploading result manifest to {result_key}...")
        s3_client.put_object(
            Bucket=r2_creds['bucket_name'],
            Key=result_key,
            Body=json.dumps(result_data),
            ContentType='application/json'
        )

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
    # ... (Rest of logic identical to before)
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
        try:
            print("Skipped TTS for initial analysis (moved to Studio)...")
            pass 
        except Exception as e:
            print(f"Skipped TTS: {e}")
            
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

@app.function(image=light_image, timeout=600)
@web_endpoint(method="POST")
def generate_subtitles(item: SubtitleRequest):
     request_data = {
        "video_tracks": item.video_tracks,
        "audio_tracks": item.audio_tracks,
        "api_key": item.api_key
    }
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
                
                # SAFETY: Never delete Stock assets
                if "stock/" in key:
                    continue

                last_modified = obj['LastModified'].replace(tzinfo=None) # Make naive
                
                # Check age
                age = now - last_modified
                if age > retention_period:
                    # Broader Cleanup: Delete everything old that isn't stock
                    # This includes uploads/, outputs/, status json files, etc.
                    print(f"Deleting old file: {key} (Age: {age})")
                    s3.delete_object(Bucket=bucket, Key=key)
                    deleted_count += 1

        print(f"Cleanup complete. Deleted {deleted_count} files.")
        
    except Exception as e:
        print(f"Cleanup failed: {e}")
        import traceback
        traceback.print_exc()