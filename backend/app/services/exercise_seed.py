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

    muscle = Muscle(name=muscle_name)  # ✅ no muscle_group_id required
    db.add(muscle)
    db.flush()  # to get id
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


def _get_or_create_exercise(
    db: Session,
    trainer_id: str,
    name: str,
    primary_muscle: Muscle,
    equipment: str,
    movement_pattern: str,
    skill_level: str,
    unilateral: bool,
    notes: str | None,
) -> Exercise:
    """
    Get an existing exercise (by name + trainer) or create a new one.
    """
    normalized = name.strip()
    exercise = db.execute(
        select(Exercise).where(
            Exercise.trainer_id == trainer_id,
            Exercise.name.ilike(normalized),
        )
    ).scalar_one_or_none()
    if exercise:
        return exercise

    exercise = Exercise(
        name=normalized,
        trainer_id=trainer_id,
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
    return exercise


def seed_default_exercises_for_trainer(db: Session, trainer_id: str) -> Tuple[int, int]:
    """
    Seed default exercises for a trainer using DEFAULT_EXERCISES from app.data.default_exercises.

    Returns:
        created_count, skipped_count
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

        # Skip if no primary muscle name provided (primary_muscle_id is required)
        if not primary_muscle_name:
            skipped += 1
            continue

        primary_muscle = _get_or_create_muscle(db, primary_muscle_name)
        if not primary_muscle:
            skipped += 1
            continue

        # Check if exercise exists
        existing = db.execute(
            select(Exercise).where(
                Exercise.trainer_id == trainer_id,
                Exercise.name.ilike(name),
            )
        ).scalar_one_or_none()
        if existing:
            skipped += 1
            continue

        # Create exercise
        exercise = _get_or_create_exercise(
            db=db,
            trainer_id=trainer_id,
            name=name,
            primary_muscle=primary_muscle,
            equipment=equipment,
            movement_pattern=movement_pattern,
            skill_level=skill_level,
            unilateral=unilateral,
            notes=notes,
        )

        # Attach tags
        for tag_name in tag_names:
            tag = _get_or_create_tag(db, tag_name)
            # avoid duplicate ExerciseTag rows
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
