"""
AI Workout Schema

This module defines Pydantic models for AI-generated workout plans.
These schemas mirror the JSON output structure described in docs/ai_prompt_design.md
and are used to validate responses from the Gemini AI model.

All models are JSON-serializable and designed to accept AI-generated workout plans
that can later be converted into the standard Workout models.
"""

from __future__ import annotations

import re
from typing import Literal, Optional, Any

from pydantic import BaseModel, ConfigDict, model_validator


# Enum-like types matching taxonomy_reference.md
SubsetType = Literal["upper", "lower", "core", "full_body", "conditioning"]
BlockType = Literal["straight", "superset", "circuit"]


def _extract_first_int(value: Any) -> Optional[int]:
    """
    Best-effort extraction of an integer from messy LLM outputs.

    Examples:
      - 12 -> 12
      - "12" -> 12
      - "12 reps" -> 12
      - "45 seconds" -> 45
      - "30s" -> 30
      - None -> None
    """
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        # If AI outputs 12.0 etc.
        return int(value)

    if isinstance(value, str):
        s = value.strip().lower()
        # Find first integer anywhere
        m = re.search(r"(\d+)", s)
        if m:
            return int(m.group(1))

    return None


class SetPrescription(BaseModel):
    reps: Optional[int] = None
    seconds: Optional[int] = None
    weight: Optional[int] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="before")
    @classmethod
    def normalize_set(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        reps_val = _extract_first_int(data.get("reps"))
        seconds_val = _extract_first_int(data.get("seconds"))

        # If reps missing, try infer from notes IF it's clearly timed
        if reps_val is None and seconds_val is None:
            notes = (data.get("notes") or "").lower()
            inferred = _extract_first_int(notes)
            if inferred is not None:
                if "sec" in notes or "second" in notes:
                    seconds_val = inferred
                else:
                    reps_val = inferred

        data["reps"] = reps_val
        data["seconds"] = seconds_val
        return data

    @model_validator(mode="after")
    def validate_reps_or_seconds(self):
        if self.reps is None and self.seconds is None:
            raise ValueError(
                "Invalid set prescription: missing reps/seconds. "
                "Each set must include either reps (int) or seconds (int)."
            )
        return self


class BlockExercise(BaseModel):
    """
    Represents an exercise within a workout block.
    References an exercise by ID and contains a list of set prescriptions.
    """

    exercise_id: str
    sets: list[SetPrescription]

    model_config = ConfigDict(extra="ignore")


class WorkoutBlock(BaseModel):
    """
    Represents a block of exercises in a workout plan.
    Can be a straight set block, superset, or circuit.
    """

    block_type: BlockType
    rest_seconds: int
    exercises: list[BlockExercise]

    model_config = ConfigDict(extra="ignore")


class AIWorkoutPlan(BaseModel):
    """
    Top-level schema for an AI-generated workout plan.
    Contains the workout name, target subsets/muscles, and structured blocks.
    This mirrors the JSON output structure expected from Gemini as described
    in docs/ai_prompt_design.md.
    """

    name: str
    focus_subsets: list[SubsetType]
    muscles_targeted: list[str]  # Muscle group names from taxonomy
    blocks: list[WorkoutBlock]

    model_config = ConfigDict(extra="ignore")


class WorkoutGenerateRequest(BaseModel):
    """
    Request schema for generating an AI workout plan.
    Contains trainer preferences, client context, and workout constraints.
    """

    client_id: Optional[str] = None
    focus_subsets: list[SubsetType]
    session_length_minutes: Optional[int] = None
    equipment_available: Optional[list[str]] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class WorkoutGenerateResponse(BaseModel):
    """
    Response schema for AI workout generation.
    Wraps the generated workout plan.
    """

    plan: AIWorkoutPlan

    model_config = ConfigDict(extra="ignore")

