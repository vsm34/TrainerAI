from sqlalchemy import Column, String, Text, Integer, ForeignKey, Numeric, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from uuid import uuid4, UUID

from app.db.base import Base


class Template(Base):
    __tablename__ = "template"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    trainer_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("trainer.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    scope: Mapped[str] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer: Mapped["Trainer"] = relationship("Trainer", back_populates="templates")
    blocks: Mapped[list["TemplateBlock"]] = relationship("TemplateBlock", back_populates="template")
    workouts: Mapped[list["Workout"]] = relationship("Workout", back_populates="template")


class TemplateBlock(Base):
    __tablename__ = "template_block"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    template_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("template.id"), nullable=False)
    block_type: Mapped[str] = mapped_column(String)
    sequence_index: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    template: Mapped["Template"] = relationship("Template", back_populates="blocks")
    sets: Mapped[list["TemplateSet"]] = relationship("TemplateSet", back_populates="block")


class TemplateSet(Base):
    __tablename__ = "template_set"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    template_block_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("template_block.id"), nullable=False)
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

    # Relationships
    block: Mapped["TemplateBlock"] = relationship("TemplateBlock", back_populates="sets")
    exercise: Mapped["Exercise"] = relationship("Exercise", back_populates="template_sets")

