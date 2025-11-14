from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# 👇 IMPORTANT: import all models so their tables are registered
from app.models.trainer import Trainer  # noqa: F401
from app.models.client import Client  # noqa: F401
from app.models.exercise import Exercise  # noqa: F401
from app.models.workout import Workout  # noqa: F401

__all__ = ["Base", "Trainer", "Client", "Exercise", "Workout"]
