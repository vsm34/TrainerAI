"""
Service to seed global exercises (trainer_id = NULL) that are visible to all authenticated users.
This should be called once at app startup.
"""

from typing import Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise, ExerciseTag
from app.models.muscle import Muscle
from app.models.tag import Tag
from app.data.default_exercises import DEFAULT_EXERCISES


def _get_or_create_muscle(db: Session, muscle_name: str) -> Muscle | None:
    """
    Look up a Muscle by case-insensitive name. If it doesn't exist, create it.
    Returns None if muscle_name is empty/None.
    """
    if not muscle_name:
        return None
    
    muscle_name = muscle_name.strip()
    if not muscle_name:
        return None

    existing = db.execute(
        select(Muscle).where(Muscle.name.ilike(muscle_name))
    ).scalar_one_or_none()

    if existing:
        return existing

    muscle = Muscle(name=muscle_name)
    db.add(muscle)
    db.flush()
    return muscle


def _get_or_create_tag(db: Session, name: str) -> Tag:
    """
    Look up a Tag by case-insensitive name. Create it if missing.
    """
    normalized = name.strip()
    if not normalized:
        raise ValueError("Tag name must be non-empty")

    tag = db.execute(
        select(Tag).where(Tag.name.ilike(normalized))
    ).scalar_one_or_none()

    if tag:
        return tag

    tag = Tag(name=normalized)
    db.add(tag)
    db.flush()
    return tag


def seed_global_exercises(db: Session) -> Tuple[int, int]:
    """
    Seed global exercises (trainer_id = NULL) that are visible to all authenticated users.
    Safe to call multiple times – exercises are de-duplicated by name.
    
    Returns:
        (created_count, skipped_count)
    """
    created = 0
    skipped = 0

    for exercise_data in DEFAULT_EXERCISES:
        name = exercise_data["name"]
        primary_muscle_name = exercise_data.get("primary_muscle")
        equipment = exercise_data.get("equipment")
        movement_pattern = exercise_data.get("movement_pattern")
        skill_level = exercise_data.get("skill_level", "intermediate")
        unilateral = exercise_data.get("unilateral", False)
        notes = exercise_data.get("notes")
        tag_names = exercise_data.get("tags", [])

        # Skip if no primary muscle name provided
        if not primary_muscle_name:
            skipped += 1
            continue

        primary_muscle = _get_or_create_muscle(db, primary_muscle_name)
        if not primary_muscle:
            skipped += 1
            continue

        # Check if global exercise with this name already exists
        normalized_name = name.strip()
        existing = db.execute(
            select(Exercise).where(
                Exercise.trainer_id.is_(None),
                Exercise.name.ilike(normalized_name),
            )
        ).scalar_one_or_none()
        
        if existing:
            skipped += 1
            continue

        # Create global exercise (trainer_id = NULL)
        exercise = Exercise(
            name=normalized_name,
            trainer_id=None,  # ✅ Global exercise
            primary_muscle_id=primary_muscle.id,
            equipment=equipment,
            movement_pattern=movement_pattern,
            skill_level=skill_level,
            unilateral=unilateral,
            is_active=True,
            notes=notes,
        )
        db.add(exercise)
        db.flush()

        # Attach tags
        for tag_name in tag_names:
            tag = _get_or_create_tag(db, tag_name)
            # Avoid duplicate ExerciseTag rows
            existing_link = db.execute(
                select(ExerciseTag).where(
                    ExerciseTag.exercise_id == exercise.id,
                    ExerciseTag.tag_id == tag.id,
                )
            ).scalar_one_or_none()
            if not existing_link:
                db.add(ExerciseTag(exercise_id=exercise.id, tag_id=tag.id))

        created += 1

    db.commit()
    return created, skipped
