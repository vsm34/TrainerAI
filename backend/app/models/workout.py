from sqlalchemy import Column, String, Text, Integer, ForeignKey, Numeric, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from uuid import uuid4, UUID

from app.db.base import Base


class Workout(Base):
    __tablename__ = "workout"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    trainer_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("trainer.id"), nullable=False)
    client_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("client.id"), nullable=True)
    template_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("template.id"), nullable=True)
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
    blocks: Mapped[list["WorkoutBlock"]] = relationship("WorkoutBlock", back_populates="workout")


class WorkoutBlock(Base):
    __tablename__ = "workout_block"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    workout_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("workout.id"), nullable=False)
    block_type: Mapped[str] = mapped_column(String)
    sequence_index: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    workout: Mapped["Workout"] = relationship("Workout", back_populates="blocks")
    sets: Mapped[list["WorkoutSet"]] = relationship("WorkoutSet", back_populates="block")


class WorkoutSet(Base):
    __tablename__ = "workout_set"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    workout_block_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("workout_block.id"), nullable=False)
    exercise_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("exercise.id"), nullable=False)
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
    completed_sets: Mapped[list["CompletedSet"]] = relationship("CompletedSet", back_populates="workout_set")


class CompletedSet(Base):
    __tablename__ = "completed_set"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    workout_set_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("workout_set.id"), nullable=False)
    actual_reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_load: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    actual_rpe: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_failure: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    entry_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    workout_set: Mapped["WorkoutSet"] = relationship("WorkoutSet", back_populates="completed_sets")

