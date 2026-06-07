import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

models_to_try = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-flash-latest"]

for name in models_to_try:
    print(f"\n--- {name} ---")
    try:
        model = genai.GenerativeModel(name)
        r = model.generate_content("Say hi in one word.")
        print(f"SUCCESS: {r.text.strip()}")
        break
    except Exception as e:
        err = str(e).split('\n')[0]
        print(f"FAIL: {err}")
