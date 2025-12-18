
import modal
from main import app, render_video_logic, RenderRequest

@app.local_entrypoint()
def debug_main():
    # Mock Credentials 
    r2_creds = {
        "account_id": "6ff495afe34538a6274dfba7a185f867",
        "access_key_id": "998d25b995f441ab296ce0d96314d4e7", 
        "secret_access_key": "c90f03bb4ecc7134deeddd16a4d8b7b0f281fa2311f77f305f91ef58010b55f3",
        "bucket_name": "shortsalpha"
    }

    test_payload = {
        "video_tracks": [
            {
                "id": "test_vid",
                "url": "https://6ff495afe34538a6274dfba7a185f867.r2.cloudflarestorage.com/shortsalpha/uploads/d2cbd775-6a92-4f0d-aef1-490eb8ffae7c.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=998d25b995f441ab296ce0d96314d4e7%2F20251217%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251217T230355Z&X-Amz-Expires=604800&X-Amz-Signature=597876b6d44b6a87fe6b02c192e2c84f7eee992bc0fb9781b95397e8bc0d2e23&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
                "start": 0,
                "duration": 5, 
                "source_duration": 22,
                "volume": 1,
                "track_index": 0,
                "type": "video"
            }
        ],
        "audio_tracks": [],
        "text_tracks": [
             {
                "text": "DEBUG TEST",
                "start": 0,
                "duration": 3,
                "type": "text",
                "style": {
                    "font_size": 100,
                    "color": "red"
                }
             }
        ],
        "script": [],
        "output_key": "debug_test_render.mp4"
    }

    print("Running render_video_logic remotely...")
    try:
        res = render_video_logic.remote(test_payload, r2_creds)
        print("Result:", res)
    except Exception as e:
        print("CRITICAL FAILURE:", e)
