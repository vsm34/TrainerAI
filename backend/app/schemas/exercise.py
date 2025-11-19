from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from app.schemas.base import ORMModel


class ExerciseBase(BaseModel):
    name: str
    primary_muscle_id: int
    secondary_muscle_ids: list[int] = Field(default_factory=list)
    equipment: str
    movement_pattern: str
    unilateral: bool = False
    skill_level: str
    notes: str | None = None
    is_active: bool = True


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(BaseModel):
    name: str | None = None
    primary_muscle_id: int | None = None
    secondary_muscle_ids: list[int] | None = None
    equipment: str | None = None
    movement_pattern: str | None = None
    unilateral: bool | None = None
    skill_level: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class ExerciseRead(ORMModel, ExerciseBase):
    id: str
    trainer_id: str | None = None
    created_at: datetime
    updated_at: datetime


class ExerciseList(BaseModel):
    items: List[ExerciseRead]

