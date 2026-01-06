from sqlalchemy import String, Text, Integer, ForeignKey, Numeric, Boolean, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from uuid import uuid4
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .trainer import Trainer
    from .client import Client
    from .template import Template
    from .exercise import Exercise

from app.db.base import Base


class Workout(Base):
    __tablename__ = "workout"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    trainer_id: Mapped[str] = mapped_column(String(36), ForeignKey("trainer.id"), nullable=False)
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("client.id"), nullable=True)
    template_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("template.id"), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    freeform_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer: Mapped["Trainer"] = relationship("Trainer", back_populates="workouts")
    client: Mapped["Client | None"] = relationship("Client", back_populates="workouts")
    template: Mapped["Template | None"] = relationship("Template", back_populates="workouts")
    blocks: Mapped[list["WorkoutBlock"]] = relationship(
        "WorkoutBlock",
        back_populates="workout",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class WorkoutBlock(Base):
    __tablename__ = "workout_block"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workout_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workout.id", ondelete="CASCADE"), nullable=False
    )
    block_type: Mapped[str] = mapped_column(String)
    sequence_index: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    workout: Mapped["Workout"] = relationship("Workout", back_populates="blocks")
    sets: Mapped[list["WorkoutSet"]] = relationship(
        "WorkoutSet",
        back_populates="block",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class WorkoutSet(Base):
    __tablename__ = "workout_set"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workout_block_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workout_block.id", ondelete="CASCADE"), nullable=False
    )
    exercise_id: Mapped[str] = mapped_column(String(36), ForeignKey("exercise.id"), nullable=False)
    set_index: Mapped[int] = mapped_column(Integer)
    target_sets: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_reps_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_reps_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_load_type: Mapped[str | None] = mapped_column(String, nullable=True)
    target_load_value: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    rpe_target: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    rest_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tempo: Mapped[str | None] = mapped_column(String, nullable=True)
    is_warmup: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    prescription_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    block: Mapped["WorkoutBlock"] = relationship("WorkoutBlock", back_populates="sets")
    exercise: Mapped["Exercise"] = relationship("Exercise", back_populates="workout_sets")
    completed_sets: Mapped[list["CompletedSet"]] = relationship(
        "CompletedSet",
        back_populates="workout_set",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class CompletedSet(Base):
    __tablename__ = "completed_set"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workout_set_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workout_set.id", ondelete="CASCADE"), nullable=False
    )
    actual_reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_load: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    actual_rpe: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_failure: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    entry_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    workout_set: Mapped["WorkoutSet"] = relationship("WorkoutSet", back_populates="completed_sets")

