import modal
import os

# SAME IMAGE DEFINITION AS MAIN.PY
image = modal.Image.debian_slim() \
    .apt_install("ffmpeg", "imagemagick", "fonts-liberation", "fonts-dejavu", "fontconfig", "fonts-freefont-ttf", "fonts-roboto", "fonts-lato", "fonts-open-sans", "wget", "curl", "ca-certificates") \
    .pip_install("google-generativeai", "requests", "ffmpeg-python", "fastapi", "boto3", "moviepy==1.0.3", "edge-tts") \
    .run_commands("sed -i 's/rights=\"none\" pattern=\"@\\*\"/rights=\"read|write\" pattern=\"@*\"/' /etc/ImageMagick-6/policy.xml") \
    .add_local_file("backend/fonts/Anton-Regular.ttf", "/usr/share/fonts/truetype/custom/Anton-Regular.ttf") \
    .add_local_file("backend/fonts/BebasNeue-Regular.ttf", "/usr/share/fonts/truetype/custom/BebasNeue-Regular.ttf") \
    .add_local_file("backend/fonts/Montserrat-Bold.ttf", "/usr/share/fonts/truetype/custom/Montserrat-Bold.ttf") \
    .add_local_file("backend/fonts/Poppins-Bold.ttf", "/usr/share/fonts/truetype/custom/Poppins-Bold.ttf") \
    .add_local_file("backend/fonts/Lato-Bold.ttf", "/usr/share/fonts/truetype/custom/Lato-Bold.ttf") \
    .add_local_file("backend/fonts/Oswald-Bold.ttf", "/usr/share/fonts/truetype/custom/Oswald-Bold.ttf") \
    .add_local_file("backend/fonts/Raleway-Bold.ttf", "/usr/share/fonts/truetype/custom/Raleway-Bold.ttf")

app = modal.App("debug-fonts")

@app.function(image=image)
def list_fonts():
    print("--- FONT DEBUG ---")
    target_dir = "/usr/share/fonts/truetype/custom"
    
    if os.path.exists(target_dir):
        files = os.listdir(target_dir)
        print(f"Directory {target_dir} exists. Found {len(files)} files:")
        for f in files:
            size = os.path.getsize(os.path.join(target_dir, f))
            print(f" - {f} ({size} bytes)")
    else:
        print(f"ERROR: Directory {target_dir} DOES NOT EXIST!")

@app.local_entrypoint()
def main():
    list_fonts.remote()
