from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict

from app.schemas.base import ORMModel


# Nested schemas for WorkoutSet
class WorkoutSetCreate(BaseModel):
    exercise_id: str
    set_index: int
    target_sets: Optional[int] = None
    target_reps_min: Optional[int] = None
    target_reps_max: Optional[int] = None
    target_load_type: Optional[str] = None
    target_load_value: Optional[float] = None
    rpe_target: Optional[float] = None
    rest_seconds: Optional[int] = None
    tempo: Optional[str] = None
    is_warmup: bool = False
    notes: Optional[str] = None
    prescription_text: Optional[str] = None


class WorkoutSetRead(ORMModel):
    id: str
    workout_block_id: str
    exercise_id: str
    set_index: int
    target_sets: Optional[int] = None
    target_reps_min: Optional[int] = None
    target_reps_max: Optional[int] = None
    target_load_type: Optional[str] = None
    target_load_value: Optional[float] = None
    rpe_target: Optional[float] = None
    rest_seconds: Optional[int] = None
    tempo: Optional[str] = None
    is_warmup: bool = False
    notes: Optional[str] = None
    prescription_text: Optional[str] = None


class WorkoutSetUpdate(BaseModel):
    id: Optional[str] = None
    set_index: int
    exercise_id: str
    target_sets: Optional[int] = None
    target_reps_min: Optional[int] = None
    target_reps_max: Optional[int] = None
    target_load_type: Optional[str] = None
    target_load_value: Optional[float] = None
    rpe_target: Optional[float] = None
    rest_seconds: Optional[int] = None
    tempo: Optional[str] = None
    is_warmup: bool = False
    notes: Optional[str] = None
    prescription_text: Optional[str] = None


# Nested schemas for WorkoutBlock
class WorkoutBlockCreate(BaseModel):
    block_type: str
    sequence_index: int
    notes: Optional[str] = None
    sets: List[WorkoutSetCreate] = []


class WorkoutBlockRead(ORMModel):
    id: str
    workout_id: str
    block_type: str
    sequence_index: int
    notes: Optional[str] = None
    sets: List[WorkoutSetRead] = []


class WorkoutBlockUpdate(BaseModel):
    id: Optional[str] = None
    sequence_index: int
    block_type: str
    notes: Optional[str] = None
    sets: List[WorkoutSetUpdate] = []


class WorkoutBase(BaseModel):
    title: str
    date: date
    status: str = "draft"  # "draft", "planned", "in_progress", "completed"
    notes: Optional[str] = None
    freeform_log: Optional[str] = None
    client_id: Optional[str] = None
    template_id: Optional[str] = None


class WorkoutCreate(WorkoutBase):
    blocks: List[WorkoutBlockCreate] = []


class WorkoutUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    freeform_log: Optional[str] = None
    client_id: Optional[str] = None
    template_id: Optional[str] = None
    blocks: Optional[List[WorkoutBlockUpdate]] = None

    model_config = ConfigDict(from_attributes=True)


class WorkoutRead(ORMModel, WorkoutBase):
    id: str
    trainer_id: str
    created_at: datetime
    updated_at: datetime
    blocks: List[WorkoutBlockRead] = []
