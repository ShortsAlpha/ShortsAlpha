import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv(".env.local")
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ GOOGLE_API_KEY not found in .env.local")
    exit(1)

genai.configure(api_key=api_key)

print(f"Checking models with Key: {api_key[:5]}...*****")

try:
    print("\n--- Available Models ---")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Name: {m.name}")
            print(f"Display Name: {m.displayName}")
            print(f"Description: {m.description[:50]}...")
            print("-" * 20)
            
except Exception as e:
    print(f"Error listing models: {e}")
