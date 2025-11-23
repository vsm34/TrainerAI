"""
AI Workout Schema

This module defines Pydantic models for AI-generated workout plans.
These schemas mirror the JSON output structure described in docs/ai_prompt_design.md
and are used to validate responses from the Gemini AI model.

All models are JSON-serializable and designed to accept AI-generated workout plans
that can later be converted into the standard Workout models.
"""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


# Enum-like types matching taxonomy_reference.md
SubsetType = Literal["upper", "lower", "core", "full_body", "conditioning"]
BlockType = Literal["straight", "superset", "circuit"]


class SetPrescription(BaseModel):
    """
    Represents a single set prescription within a workout exercise.
    Used by the AI to specify reps, weight, and optional notes for each set.
    """

    reps: int
    weight: Optional[int] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


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

