"""
AI Client for Gemini API

This module provides a simple interface for calling Google's Gemini API
to generate structured workout plans. It handles API key management,
model configuration, and JSON parsing.
"""

import json
from typing import Any

import google.generativeai as genai

from app.core.config import settings


GEMINI_MODEL = "gemini-2.5-flash"


def get_gemini_model() -> genai.GenerativeModel:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(GEMINI_MODEL)


async def generate_workout_plan(prompt: str) -> dict[str, Any]:
    """
    Call Gemini API to generate a workout plan based on the provided prompt.

    Args:
        prompt: The full prompt string to send to Gemini, including
                instructions, schema, exercises, and examples.

    Returns:
        A dictionary containing the parsed JSON response from Gemini.

    Raises:
        ValueError: If GEMINI_API_KEY is not set.
        RuntimeError: If Gemini API call fails or returns invalid JSON.
    """
    try:
        # Get the model instance
        model = get_gemini_model()

        # Call the model with JSON output
        result = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )

        # Get the raw text
        raw_text = result.text or ""

        # Strip code fences if present (handle both ```json and ``` cases)
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]  # Remove ```json
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]  # Remove ```
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]  # Remove closing ```

        raw_text = raw_text.strip()

        # Parse JSON
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError as e:
            # Create snippet (max 500 chars)
            raw_snippet = raw_text[:500] if len(raw_text) > 500 else raw_text
            raise RuntimeError(f"Invalid JSON from Gemini: {e}: {raw_snippet}")

    except ValueError:
        # Re-raise ValueError as-is (GEMINI_API_KEY not set)
        raise
    except RuntimeError:
        # Re-raise RuntimeError as-is (JSON parsing errors)
        raise
    except Exception as e:
        # Log unexpected errors
        print("AI error:", repr(e))
        raise RuntimeError("Unexpected Gemini error") from e

