from __future__ import annotations

from uuid import UUID
from typing import List
from datetime import datetime, time

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import DBSessionDep, TrainerDep
from app.models.workout import Workout
from app.schemas.workout import WorkoutCreate, WorkoutRead, WorkoutUpdate


router = APIRouter()


@router.get("/", response_model=List[WorkoutRead])
async def list_workouts(
    db: DBSessionDep,
    current_trainer: TrainerDep,
    client_id: UUID | None = Query(None),
    status_filter: str | None = Query(None),
) -> list[WorkoutRead]:
    stmt = select(Workout).where(Workout.trainer_id == current_trainer.id)

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
    # Convert date to datetime for the model
    workout_data = payload.model_dump()
    if "date" in workout_data and workout_data["date"]:
        workout_data["date"] = datetime.combine(workout_data["date"], time.min)
    
    w = Workout(
        trainer_id=current_trainer.id,
        **workout_data,
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


def _get_workout_or_404(
    workout_id: UUID,
    db: Session,
    trainer_id: UUID,
) -> Workout:
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
    workout_id: UUID,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> WorkoutRead:
    return _get_workout_or_404(workout_id, db, current_trainer.id)


@router.put("/{workout_id}", response_model=WorkoutRead)
async def update_workout(
    workout_id: UUID,
    payload: WorkoutUpdate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> WorkoutRead:
    w = _get_workout_or_404(workout_id, db, current_trainer.id)

    update_data = payload.model_dump(exclude_unset=True)
    # Convert date to datetime if provided
    if "date" in update_data and update_data["date"]:
        update_data["date"] = datetime.combine(update_data["date"], time.min)

    for field, value in update_data.items():
        setattr(w, field, value)

    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: UUID,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> None:
    w = _get_workout_or_404(workout_id, db, current_trainer.id)
    db.delete(w)
    db.commit()

