from __future__ import annotations

from enum import Enum
from typing import List

from pydantic import BaseModel, Field

from app.taxonomy.base import ExerciseSubset
from app.taxonomy.muscles import MuscleGroup


class BlockType(str, Enum):
    STRAIGHT = "straight"
    SUPERSET = "superset"
    TRISET = "triset"
    CIRCUIT = "circuit"
    WARMUP = "warmup"
    FINISHER = "finisher"


class SetPrescription(BaseModel):
    reps: str = Field(..., description="e.g. '8-10', 'AMRAP', '30s'")
    weight: str = Field(
        "no weight",
        description="e.g. 'bodyweight', 'no weight', 'RPE 8', 'moderate DB', 'light KB'",
    )
    notes: str | None = None


class BlockExercise(BaseModel):
    exercise_key: str = Field(
        ...,
        description="Key from taxonomy.exercises_seed.EXERCISES (e.g. 'bench_press_barbell_flat')",
    )
    display_name: str
    sets: List[SetPrescription]


class WorkoutBlock(BaseModel):
    block_type: BlockType
    label: str | None = Field(
        None,
        description="e.g. 'A1/A2 superset', 'Finisher', 'Warmup'",
    )
    exercises: List[BlockExercise]
    rest_between_sets_seconds: int | None = None
    rest_between_exercises_seconds: int | None = None
    notes: str | None = None


class AIWorkoutPlan(BaseModel):
    title: str
    focus_subsets: List[ExerciseSubset]
    focus_muscles: List[MuscleGroup]
    include_core: bool = False
    estimated_duration_minutes: int | None = None
    blocks: List[WorkoutBlock]

