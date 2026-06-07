import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure the Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def generate_flashcards(notes_text: str) -> list:
    """
    Generates 8-12 flashcards (questions and answers) from the provided notes text
    using Gemini 1.5 Flash with JSON response configuration.
    """
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in the environment variables.")

    try:
        # Request JSON output
        model = genai.GenerativeModel(
            "gemini-2.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )
        
        prompt = (
            "Analyze the following study notes and generate 8 to 12 flashcards. "
            "Return a JSON array where each object has a 'question' and an 'answer' key. "
            "Questions should test core terms, concepts, definitions, or processes. "
            "Answers should be brief and informative. "
            "Example format: [{\"question\": \"What is X?\", \"answer\": \"X is...\"}]\n\n"
            f"Study Notes:\n{notes_text}"
        )
        
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean markdown code fences if Gemini added them despite JSON mode
        if response_text.startswith("```"):
            lines = response_text.splitlines()
            if lines[0].startswith("```json"):
                response_text = "\n".join(lines[1:-1])
            elif lines[0].startswith("```"):
                response_text = "\n".join(lines[1:-1])
                
        flashcards = json.loads(response_text)
        
        # Validation of structure
        if not isinstance(flashcards, list):
            raise ValueError("Response is not a JSON list")
            
        # Ensure correct keys
        validated_cards = []
        for card in flashcards:
            if isinstance(card, dict) and "question" in card and "answer" in card:
                validated_cards.append({
                    "question": str(card["question"]),
                    "answer": str(card["answer"])
                })
                
        if not validated_cards:
            raise ValueError("No valid flashcards found in the generated JSON")
            
        return validated_cards
        
    except json.JSONDecodeError as je:
        # Fallback retry with a cleaner prompt if JSON parsing failed
        return _retry_generate_flashcards(notes_text, str(je))
    except Exception as e:
        raise RuntimeError(f"Failed to generate flashcards: {str(e)}")

def _retry_generate_flashcards(notes_text: str, error_msg: str) -> list:
    """
    Fallback retry with a simpler, stricter prompt.
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = (
            "Based on the following notes, generate 8 to 12 flashcards. "
            "Your output must be a valid JSON array of objects with keys 'question' and 'answer'. "
            "Do not output any introductory or concluding text, only the JSON code. "
            "Ensure double quotes are escaped correctly.\n\n"
            f"Error in previous run: {error_msg}\n\n"
            f"Study Notes:\n{notes_text}"
        )
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Strip code block markers if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        flashcards = json.loads(text)
        return [{"question": str(c["question"]), "answer": str(c["answer"])} for c in flashcards if "question" in c and "answer" in c]
    except Exception as e:
        raise RuntimeError(f"Failed to generate flashcards on retry: {str(e)}")
