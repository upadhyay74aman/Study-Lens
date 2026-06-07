import os
import json
import asyncio
import time
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai

from ocr_engine import extract_text_from_image

load_dotenv()

app = FastAPI(title="StudyLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)


def generate_all_study_materials(notes_text: str) -> dict:
    """
    Single Gemini call that generates flashcards, quiz, mindmap, and summary
    all at once. This minimizes API usage for free-tier limits.
    """
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config={"response_mime_type": "application/json"}
    )

    prompt = f"""Analyze the following study notes and generate ALL of the following in a single JSON response:

1. "flashcards": An array of 8-12 objects, each with "question" and "answer" keys. Questions should test core concepts.

2. "quiz": An array of exactly 5 objects, each with:
   - "question": the question text
   - "options": array of exactly 4 answer strings
   - "correct_answer_index": integer 0-3 indicating the correct option

3. "mindmap": A hierarchical tree object with "topic" (string) and optional "children" (array of similar objects). Maximum 3 levels deep. Root = main subject, level 2 = 3-5 subtopics, level 3 = key details.

4. "summary": An array of exactly 5 strings, each a concise key takeaway bullet point.

Return ONLY valid JSON with these 4 keys. No markdown, no explanation.

Study Notes:
{notes_text}"""

    for attempt in range(3):
        try:
            response = model.generate_content(prompt)
            text = response.text.strip()

            # Strip markdown fences if present
            if text.startswith("```"):
                lines = text.splitlines()
                text = "\n".join(lines[1:-1])

            data = json.loads(text)

            # Validate structure
            result = {}

            # Flashcards
            cards = data.get("flashcards", [])
            result["flashcards"] = [
                {"question": str(c["question"]), "answer": str(c["answer"])}
                for c in cards if "question" in c and "answer" in c
            ]

            # Quiz
            quiz = data.get("quiz", [])
            result["quiz"] = []
            for q in quiz[:5]:
                if "question" in q and "options" in q and "correct_answer_index" in q:
                    opts = [str(o) for o in q["options"]][:4]
                    if len(opts) == 4:
                        result["quiz"].append({
                            "question": str(q["question"]),
                            "options": opts,
                            "correct_answer_index": max(0, min(3, int(q["correct_answer_index"])))
                        })

            # Mindmap
            def validate_node(node, depth=1):
                if not isinstance(node, dict) or "topic" not in node:
                    return {"topic": "Concept"}
                validated = {"topic": str(node["topic"])}
                if "children" in node and isinstance(node["children"], list) and depth < 3:
                    validated["children"] = [validate_node(c, depth + 1) for c in node["children"]]
                return validated

            result["mindmap"] = validate_node(data.get("mindmap", {"topic": "Notes"}))

            # Summary
            summary = data.get("summary", [])
            result["summary"] = [str(s) for s in summary if s][:5]
            while len(result["summary"]) < 5:
                result["summary"].append("Key concept from the study notes.")

            return result

        except json.JSONDecodeError:
            if attempt < 2:
                time.sleep(2)
                continue
            raise RuntimeError("Failed to parse AI response after multiple attempts.")
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                time.sleep(15)
                continue
            raise RuntimeError(f"AI generation failed: {str(e)}")


@app.post("/process-notes")
async def process_notes(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file (PNG, JPG).")

    try:
        image_bytes = await file.read()
        mime_type = file.content_type

        loop = asyncio.get_running_loop()

        # Call 1: OCR
        extracted_text = await loop.run_in_executor(None, extract_text_from_image, image_bytes, mime_type)

        if not extracted_text or not extracted_text.strip():
            raise HTTPException(status_code=422, detail="Could not read text from the image. Please use a clearer photo.")

        # Call 2: Generate ALL study materials in one shot
        results = await loop.run_in_executor(None, generate_all_study_materials, extracted_text)

        return {
            "success": True,
            "extracted_text": extracted_text,
            **results
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=502, detail=str(re))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/health")
def health_check():
    return {"status": "ok", "gemini_configured": api_key is not None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
