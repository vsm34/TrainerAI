from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.base import ORMModel


class ClientBase(BaseModel):
    name: str
    email: str | None = None
    notes: str | None = None
    injury_flags: list[str] = Field(default_factory=list)
    preferences_json: dict[str, Any] | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    notes: str | None = None
    injury_flags: list[str] | None = None
    preferences_json: dict[str, Any] | None = None


class ClientRead(ORMModel, ClientBase):
    id: str
    trainer_id: str
    created_at: datetime
    updated_at: datetime

