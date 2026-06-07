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

def generate_mindmap(notes_text: str) -> dict:
    """
    Generates a hierarchical JSON tree representing a mind map from the provided notes.
    The tree structure is: {"topic": "...", "children": [{"topic": "...", "children": [...]}]}
    Max depth: 3 levels.
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
            "Analyze the following study notes and create a hierarchical mind map structure. "
            "Return a JSON object representing a tree with a maximum depth of 3 levels. "
            "Each node in the tree must have a 'topic' key (string) and an optional 'children' key (array of nodes). "
            "The top level should be the central theme of the notes. "
            "Level 2 should be the main categories or subtopics (3-5 items). "
            "Level 3 should contain brief key concepts or details supporting the Level 2 subtopics. "
            "Ensure the output conforms exactly to this structure:\n"
            "{\n"
            "  \"topic\": \"Central Subject\",\n"
            "  \"children\": [\n"
            "    {\n"
            "      \"topic\": \"Subtopic A\",\n"
            "      \"children\": [\n"
            "        { \"topic\": \"Detail A1\" },\n"
            "        { \"topic\": \"Detail A2\" }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
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
                
        mindmap_data = json.loads(response_text)
        
        # Validate node structure
        def validate_node(node, current_depth=1):
            if not isinstance(node, dict) or "topic" not in node:
                return {"topic": "Concept"}
            
            validated = {"topic": str(node["topic"])}
            if "children" in node and isinstance(node["children"], list) and current_depth < 3:
                validated_children = []
                for child in node["children"]:
                    validated_child = validate_node(child, current_depth + 1)
                    if validated_child:
                        validated_children.append(validated_child)
                if validated_children:
                    validated["children"] = validated_children
            return validated

        return validate_node(mindmap_data)
        
    except json.JSONDecodeError as je:
        # Fallback retry with a cleaner prompt if JSON parsing failed
        return _retry_generate_mindmap(notes_text, str(je))
    except Exception as e:
        raise RuntimeError(f"Failed to generate mind map: {str(e)}")

def _retry_generate_mindmap(notes_text: str, error_msg: str) -> dict:
    """
    Fallback retry with a simpler, stricter prompt.
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = (
            "Based on the following notes, generate a hierarchical mind map structure. "
            "The output must be a single valid JSON object with keys 'topic' and optional 'children' list of objects. "
            "Ensure depth is maximum 3 levels (Root -> Subtopic -> Detail). "
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
            
        mindmap_data = json.loads(text)
        
        def validate_node(node, current_depth=1):
            if not isinstance(node, dict) or "topic" not in node:
                return {"topic": "Concept"}
            validated = {"topic": str(node["topic"])}
            if "children" in node and isinstance(node["children"], list) and current_depth < 3:
                validated["children"] = [validate_node(c, current_depth + 1) for c in node["children"]]
            return validated
            
        return validate_node(mindmap_data)
    except Exception as e:
        # Final fallback structure if even retry fails
        return {
            "topic": "Study Topic Summary",
            "children": [
                {"topic": "Key Ideas", "children": [{"topic": "Please review your uploaded notes"}]}
            ]
        }
