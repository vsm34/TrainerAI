from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.base import ORMModel


class WorkoutBase(BaseModel):
    title: str
    date: date
    status: str = "draft"  # "draft", "planned", "in_progress", "completed"
    notes: Optional[str] = None
    freeform_log: Optional[str] = None
    client_id: Optional[int] = None
    # If your Template PK is int, change this to Optional[int]
    template_id: Optional[UUID] = None


class WorkoutCreate(WorkoutBase):
    pass


class WorkoutUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    freeform_log: Optional[str] = None
    client_id: Optional[int] = None
    template_id: Optional[UUID] = None  # or Optional[int] if templates use int PK


class WorkoutRead(ORMModel, WorkoutBase):
    id: int
    trainer_id: int
    created_at: datetime
    updated_at: datetime
