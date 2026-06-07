import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure the Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def extract_text_from_image(image_bytes: bytes, mime_type: str) -> str:
    """
    Sends image bytes and mime_type to Gemini Vision (gemini-2.5-flash) to perform OCR
    and extract all handwritten or typed notes.
    """
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in the environment variables.")

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Prepare the image part
        image_part = {
            "mime_type": mime_type,
            "data": image_bytes
        }
        
        prompt = (
            "Analyze this image of handwritten notes. "
            "Extract all text, equations, and diagrams' text. "
            "Maintain the structure, headers, and bullet points if any. "
            "Only return the transcribed text. Do not add any conversational text, "
            "commentary, or markdown code fences (like ```text) around the output."
        )
        
        # Call Gemini Vision API
        response = model.generate_content([image_part, prompt])
        
        if not response.text:
            raise Exception("Gemini returned an empty response. The image might not be clear or readable.")
            
        return response.text.strip()
        
    except Exception as e:
        raise RuntimeError(f"Failed to perform OCR with Gemini: {str(e)}")
