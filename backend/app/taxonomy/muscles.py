from __future__ import annotations

from enum import Enum

from app.taxonomy.base import ExerciseSubset


class MuscleGroup(str, Enum):
    SHOULDERS = "shoulders"
    CHEST = "chest"
    TRICEPS = "triceps"
    BICEPS = "biceps"
    BACK = "back"

    QUADS = "quads"
    HAMSTRINGS = "hamstrings"
    GLUTES = "glutes"

    UPPER_ABS = "upper_abs"
    LOWER_ABS = "lower_abs"
    OBLIQUES = "obliques"


MUSCLE_TO_SUBSET: dict[MuscleGroup, ExerciseSubset] = {
    MuscleGroup.SHOULDERS: ExerciseSubset.UPPER,
    MuscleGroup.CHEST: ExerciseSubset.UPPER,
    MuscleGroup.TRICEPS: ExerciseSubset.UPPER,
    MuscleGroup.BICEPS: ExerciseSubset.UPPER,
    MuscleGroup.BACK: ExerciseSubset.UPPER,

    MuscleGroup.QUADS: ExerciseSubset.LOWER,
    MuscleGroup.HAMSTRINGS: ExerciseSubset.LOWER,
    MuscleGroup.GLUTES: ExerciseSubset.LOWER,

    MuscleGroup.UPPER_ABS: ExerciseSubset.CORE,
    MuscleGroup.LOWER_ABS: ExerciseSubset.CORE,
    MuscleGroup.OBLIQUES: ExerciseSubset.CORE,
}

