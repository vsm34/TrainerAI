from __future__ import annotations

from typing import List
from datetime import datetime, time

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.api.deps import DBSessionDep, TrainerDep
from app.models.workout import Workout, WorkoutBlock, WorkoutSet
from app.models.exercise import Exercise
from app.schemas.workout import WorkoutCreate, WorkoutRead, WorkoutUpdate


router = APIRouter()


@router.get("/", response_model=List[WorkoutRead])
async def list_workouts(
    db: DBSessionDep,
    current_trainer: TrainerDep,
    q: str | None = Query(None, description="Text search on workout title"),
    client_id: str | None = Query(None, description="Filter by client ID"),
    status_filter: str | None = Query(None, description="Filter by status"),
) -> list[WorkoutRead]:
    """
    List all workouts for the current trainer with optional filters.
    """
    stmt = (
        select(Workout)
        .where(Workout.trainer_id == current_trainer.id)
        .options(
            selectinload(Workout.blocks).selectinload(WorkoutBlock.sets)
        )
    )

    # Apply text search filter (case-insensitive, SQLite compatible)
    if q:
        stmt = stmt.where(func.lower(Workout.title).contains(q.lower()))
    
    if client_id is not None:
        stmt = stmt.where(Workout.client_id == client_id)
    if status_filter is not None:
        stmt = stmt.where(Workout.status == status_filter)

    stmt = stmt.order_by(Workout.date.desc(), Workout.created_at.desc())

    result = db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
async def create_workout(
    payload: WorkoutCreate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> WorkoutRead:
    """
    Create a new workout with optional nested blocks and sets.
    Validates that all exercise IDs belong to the trainer.
    """
    # Extract blocks from payload
    blocks_data = payload.blocks
    workout_data = payload.model_dump(exclude={"blocks"})
    
    # Convert date to datetime for the model
    if "date" in workout_data and workout_data["date"]:
        workout_data["date"] = datetime.combine(workout_data["date"], time.min)
    
    # Create the workout
    workout = Workout(
        trainer_id=current_trainer.id,
        **workout_data,
    )
    db.add(workout)
    db.flush()  # Flush to get the workout ID
    
    # Validate and create blocks and sets
    if blocks_data:
        # Collect all exercise IDs to validate in one query
        exercise_ids = set()
        for block in blocks_data:
            for set_data in block.sets:
                exercise_ids.add(set_data.exercise_id)
        
        # Validate all exercise IDs belong to trainer
        if exercise_ids:
            result = db.execute(
                select(Exercise).where(
                    Exercise.id.in_(exercise_ids),
                    Exercise.trainer_id == current_trainer.id
                )
            )
            valid_exercises = {ex.id for ex in result.scalars().all()}
            invalid_exercises = exercise_ids - valid_exercises
            
            if invalid_exercises:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid exercise IDs (not found or not owned by trainer): {', '.join(invalid_exercises)}"
                )
        
        # Create blocks and sets
        for block_data in blocks_data:
            block = WorkoutBlock(
                workout_id=workout.id,
                block_type=block_data.block_type,
                sequence_index=block_data.sequence_index,
                notes=block_data.notes,
            )
            db.add(block)
            db.flush()  # Flush to get the block ID
            
            # Create sets for this block
            for set_data in block_data.sets:
                workout_set = WorkoutSet(
                    workout_block_id=block.id,
                    exercise_id=set_data.exercise_id,
                    set_index=set_data.set_index,
                    target_sets=set_data.target_sets,
                    target_reps_min=set_data.target_reps_min,
                    target_reps_max=set_data.target_reps_max,
                    target_load_type=set_data.target_load_type,
                    target_load_value=set_data.target_load_value,
                    rpe_target=set_data.rpe_target,
                    rest_seconds=set_data.rest_seconds,
                    tempo=set_data.tempo,
                    is_warmup=set_data.is_warmup,
                    notes=set_data.notes,
                    prescription_text=set_data.prescription_text,
                )
                db.add(workout_set)
    
    db.commit()
    
    # Reload with relationships
    result = db.execute(
        select(Workout)
        .where(Workout.id == workout.id)
        .options(
            selectinload(Workout.blocks).selectinload(WorkoutBlock.sets)
        )
    )
    workout = result.scalar_one()
    return workout


def _get_workout_or_404(
    workout_id: str,
    db: Session,
    trainer_id: str,
) -> Workout:
    """
    Helper function to get a workout by ID and trainer_id, or raise 404.
    """
    result = db.execute(
        select(Workout).where(
            Workout.id == workout_id,
            Workout.trainer_id == trainer_id,
        )
    )
    w = result.scalar_one_or_none()
    if w is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )
    return w


@router.get("/{workout_id}", response_model=WorkoutRead)
async def get_workout(
    workout_id: str,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> WorkoutRead:
    """
    Get a single workout by ID with nested blocks and sets, scoped to the current trainer.
    """
    result = db.execute(
        select(Workout)
        .where(
            Workout.id == workout_id,
            Workout.trainer_id == current_trainer.id,
        )
        .options(
            selectinload(Workout.blocks).selectinload(WorkoutBlock.sets)
        )
    )
    workout = result.scalar_one_or_none()
    if workout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )
    return workout


@router.put("/{workout_id}", response_model=WorkoutRead)
async def update_workout(
    workout_id: str,
    payload: WorkoutUpdate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> WorkoutRead:
    """
    Update an existing workout owned by the current trainer.
    Only updates provided fields.
    """
    workout = _get_workout_or_404(workout_id, db, current_trainer.id)

    update_data = payload.model_dump(exclude_unset=True)
    # Normalize date field if present
    if "date" in update_data and update_data["date"] is not None:
        # Expect "YYYY-MM-DD" from frontend / Swagger.
        # Convert to datetime with no time component (00:00) in the current timezone/naive.
        try:
            update_data["date"] = datetime.fromisoformat(update_data["date"])
        except ValueError:
            # If the string is not a valid ISO date, raise a 422-style error
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=[{
                    "loc": ["body", "date"],
                    "msg": "Invalid date format, expected YYYY-MM-DD",
                    "type": "value_error.date"
                }],
            )

    for field, value in update_data.items():
        setattr(workout, field, value)

    db.add(workout)
    db.commit()
    
    # Reload with relationships
    result = db.execute(
        select(Workout)
        .where(Workout.id == workout.id)
        .options(
            selectinload(Workout.blocks).selectinload(WorkoutBlock.sets)
        )
    )
    workout = result.scalar_one()
    return workout


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: str,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> None:
    """
    Delete a workout owned by the current trainer.
    Cascades to blocks and sets automatically via foreign key constraints.
    """
    workout = _get_workout_or_404(workout_id, db, current_trainer.id)
    db.delete(workout)
    db.commit()

