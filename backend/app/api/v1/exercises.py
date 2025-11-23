from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import DBSessionDep, TrainerDep
from app.models.exercise import Exercise
from app.schemas.exercise import (
    ExerciseCreate,
    ExerciseRead,
    ExerciseUpdate,
    ExerciseList,
    SeedDefaultsResponse,
)
from app.services.exercise_seed import seed_default_exercises_for_trainer


router = APIRouter()


@router.get("/", response_model=ExerciseList)
async def list_exercises(
    db: DBSessionDep,
    current_trainer: TrainerDep,
    q: str | None = Query(None, description="Text search on exercise name"),
    primary_muscle_id: int | None = Query(None, description="Filter by primary muscle ID"),
    movement_pattern: str | None = Query(None, description="Filter by movement pattern"),
    equipment: str | None = Query(None, description="Filter by equipment type"),
) -> ExerciseList:
    """
    List all exercises for the current trainer with optional filters.
    """
    stmt = select(Exercise).where(Exercise.trainer_id == current_trainer.id)

    # Apply filters
    if q:
        # Case-insensitive search compatible with SQLite
        stmt = stmt.where(func.lower(Exercise.name).contains(q.lower()))
    
    if primary_muscle_id is not None:
        stmt = stmt.where(Exercise.primary_muscle_id == primary_muscle_id)
    
    if movement_pattern:
        stmt = stmt.where(Exercise.movement_pattern == movement_pattern)
    
    if equipment:
        stmt = stmt.where(Exercise.equipment == equipment)

    result = db.execute(stmt.order_by(Exercise.name))
    exercises = result.scalars().all()
    
    return ExerciseList(items=list(exercises))


@router.get("/{exercise_id}", response_model=ExerciseRead)
async def get_exercise(
    exercise_id: str,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> ExerciseRead:
    """
    Get a single exercise by ID, scoped to the current trainer.
    """
    return _get_exercise_or_404(exercise_id, db, current_trainer.id)


@router.post("/", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    payload: ExerciseCreate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> ExerciseRead:
    """
    Create a new exercise for the current trainer.
    """
    exercise = Exercise(
        trainer_id=current_trainer.id,
        **payload.model_dump(),
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.put("/{exercise_id}", response_model=ExerciseRead)
async def update_exercise(
    exercise_id: str,
    payload: ExerciseUpdate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> ExerciseRead:
    """
    Update an existing exercise owned by the current trainer.
    """
    exercise = _get_exercise_or_404(exercise_id, db, current_trainer.id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(exercise, field, value)

    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: str,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> None:
    """
    Delete an exercise owned by the current trainer.
    """
    exercise = _get_exercise_or_404(exercise_id, db, current_trainer.id)
    db.delete(exercise)
    db.commit()


@router.post("/seed-defaults", response_model=SeedDefaultsResponse)
def seed_default_exercises(
    db: DBSessionDep,
    current_trainer: TrainerDep,
):
    """
    Seed default exercises for the current trainer.
    Safe to call multiple times – exercises are de-duplicated by (trainer_id, name).
    """
    try:
        created, skipped = seed_default_exercises_for_trainer(db, current_trainer.id)
    except Exception as exc:
        # Log and surface as 500
        import traceback
        print(f"[ERROR] Exercise seeding failed: {exc}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed exercises: {exc}",
        )

    from sqlalchemy import select, func
    total_after = db.execute(
        select(func.count(Exercise.id)).where(Exercise.trainer_id == current_trainer.id)
    ).scalar_one()
    return SeedDefaultsResponse(created=created, skipped=skipped, total_after=total_after)


def _get_exercise_or_404(
    exercise_id: str,
    db: Session,
    trainer_id: str,
) -> Exercise:
    """
    Helper function to get an exercise by ID and trainer_id, or raise 404.
    """
    result = db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            Exercise.trainer_id == trainer_id,
        )
    )
    exercise = result.scalar_one_or_none()
    if exercise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    return exercise

