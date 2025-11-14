from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from app.taxonomy.muscles import MuscleGroup


class ExerciseSubset(str, Enum):
    UPPER = "upper"
    LOWER = "lower"
    CORE = "core"
    FULL_BODY = "full_body"


class MovementPattern(str, Enum):
    PUSH = "push"
    PULL = "pull"
    SQUAT = "squat"
    HINGE = "hinge"
    LUNGE = "lunge"
    CARRY = "carry"
    CORE_ANTI_ROTATION = "core_anti_rotation"
    CORE_FLEXION = "core_flexion"
    CORE_EXTENSION = "core_extension"
    CORE_ROTATION = "core_rotation"
    CARDIO_CONDITIONING = "cardio_conditioning"
    OTHER = "other"


@dataclass(slots=True)
class ExerciseDef:
    key: str
    name: str
    subset: ExerciseSubset
    primary_muscles: List["MuscleGroup"]
    secondary_muscles: List["MuscleGroup"] = field(default_factory=list)
    movement_pattern: MovementPattern = MovementPattern.OTHER
    equipment_options: List[str] = field(default_factory=list)
    allow_bodyweight: bool = False
    is_unilateral: bool = False
    is_compound: bool = True
    tags: List[str] = field(default_factory=list)
    notes: str | None = None

