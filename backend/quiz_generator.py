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

def generate_quiz(notes_text: str) -> list:
    """
    Generates exactly 5 multiple-choice quiz questions from the provided notes text
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
            "Analyze the following study notes and generate exactly 5 multiple-choice questions (MCQs). "
            "Return a JSON array where each object has these exact keys:\n"
            "- 'question': the question text\n"
            "- 'options': an array of exactly 4 strings representing the options\n"
            "- 'correct_answer_index': an integer (0, 1, 2, or 3) indicating the correct option index\n\n"
            "Ensure only one option is correct and options are distinct and plausible.\n\n"
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
                
        quiz_data = json.loads(response_text)
        
        # Validation of structure
        if not isinstance(quiz_data, list):
            raise ValueError("Response is not a JSON list")
            
        validated_quiz = []
        for q in quiz_data:
            if (isinstance(q, dict) and 
                "question" in q and 
                "options" in q and 
                "correct_answer_index" in q):
                
                options = [str(o) for o in q["options"]]
                if len(options) != 4:
                    continue # Skip invalid option count
                    
                correct_idx = int(q["correct_answer_index"])
                if correct_idx < 0 or correct_idx > 3:
                    correct_idx = 0 # Default fallback
                    
                validated_quiz.append({
                    "question": str(q["question"]),
                    "options": options,
                    "correct_answer_index": correct_idx
                })
                
        if len(validated_quiz) == 0:
            raise ValueError("No valid quiz questions found in the generated JSON")
            
        # Ensure we have exactly 5 questions or pad/trim
        return validated_quiz[:5]
        
    except json.JSONDecodeError as je:
        # Fallback retry with a cleaner prompt if JSON parsing failed
        return _retry_generate_quiz(notes_text, str(je))
    except Exception as e:
        raise RuntimeError(f"Failed to generate quiz: {str(e)}")

def _retry_generate_quiz(notes_text: str, error_msg: str) -> list:
    """
    Fallback retry with a simpler, stricter prompt.
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = (
            "Based on the following notes, generate exactly 5 multiple choice questions. "
            "Your output must be a valid JSON array of objects with keys 'question', 'options' (array of 4 strings), and 'correct_answer_index' (0, 1, 2, or 3). "
            "Do not output any introductory or concluding text, only the JSON code.\n\n"
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
            
        quiz_data = json.loads(text)
        return [{
            "question": str(q["question"]),
            "options": [str(o) for o in q["options"]][:4],
            "correct_answer_index": max(0, min(3, int(q["correct_answer_index"])))
        } for q in quiz_data if "question" in q and "options" in q and "correct_answer_index" in q][:5]
    except Exception as e:
        raise RuntimeError(f"Failed to generate quiz on retry: {str(e)}")
