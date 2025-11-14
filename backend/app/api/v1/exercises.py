from __future__ import annotations

from uuid import UUID
from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import DBSessionDep, TrainerDep
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseCreate, ExerciseRead, ExerciseUpdate


router = APIRouter()


@router.get("/", response_model=List[ExerciseRead])
async def list_exercises(
    db: DBSessionDep,
    current_trainer: TrainerDep,
    include_global: bool = Query(True),
    only_mine: bool = Query(False),
) -> list[ExerciseRead]:

    if only_mine:
        wc = Exercise.trainer_id == current_trainer.id
    elif include_global:
        wc = or_(
            Exercise.trainer_id == current_trainer.id,
            Exercise.trainer_id.is_(None),
        )
    else:
        wc = Exercise.trainer_id == current_trainer.id

    result = db.execute(
        select(Exercise)
        .where(wc)
        .order_by(Exercise.name)
    )
    return result.scalars().all()


@router.post("/", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    payload: ExerciseCreate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> ExerciseRead:
    ex = Exercise(
        trainer_id=current_trainer.id,
        **payload.model_dump(),
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


def _get_owned_exercise_or_404(
    exercise_id: UUID,
    db: Session,
    trainer_id: UUID,
) -> Exercise:
    result = db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            Exercise.trainer_id == trainer_id,
        )
    )
    o = result.scalar_one_or_none()
    if o is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found or not owned by this trainer",
        )
    return o


@router.get("/{exercise_id}", response_model=ExerciseRead)
async def get_exercise(
    exercise_id: UUID,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> ExerciseRead:
    result = db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            or_(
                Exercise.trainer_id == current_trainer.id,
                Exercise.trainer_id.is_(None),
            ),
        )
    )
    o = result.scalar_one_or_none()
    if o is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    return o


@router.put("/{exercise_id}", response_model=ExerciseRead)
async def update_exercise(
    exercise_id: UUID,
    payload: ExerciseUpdate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> ExerciseRead:
    ex = _get_owned_exercise_or_404(exercise_id, db, current_trainer.id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ex, field, value)

    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: UUID,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> None:
    ex = _get_owned_exercise_or_404(exercise_id, db, current_trainer.id)
    db.delete(ex)
    db.commit()

