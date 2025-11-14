from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.base import ORMModel


class WorkoutBase(BaseModel):
    title: str
    date: date
    status: str = "draft"  # "draft", "planned", "in_progress", "completed"
    notes: Optional[str] = None
    freeform_log: Optional[str] = None
    client_id: Optional[str] = None
    template_id: Optional[str] = None


class WorkoutCreate(WorkoutBase):
    pass


class WorkoutUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    freeform_log: Optional[str] = None
    client_id: Optional[str] = None
    template_id: Optional[str] = None


class WorkoutRead(ORMModel, WorkoutBase):
    id: str
    trainer_id: str
    created_at: datetime
    updated_at: datetime
