from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Integer, UniqueConstraint, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from uuid import uuid4, UUID

from app.db.base import Base


class Exercise(Base):
    __tablename__ = "exercise"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    trainer_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("trainer.id"), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    primary_muscle_id: Mapped[int] = mapped_column(Integer, ForeignKey("muscle.id"), nullable=False)
    secondary_muscle_ids: Mapped[list[int] | None] = mapped_column(ARRAY(Integer), nullable=True)
    equipment: Mapped[str] = mapped_column(String)
    movement_pattern: Mapped[str] = mapped_column(String)
    unilateral: Mapped[bool] = mapped_column(Boolean, default=False)
    skill_level: Mapped[str] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer: Mapped["Trainer | None"] = relationship("Trainer", back_populates="exercises")
    primary_muscle: Mapped["Muscle"] = relationship("Muscle", back_populates="primary_exercises")
    tags: Mapped[list["ExerciseTag"]] = relationship("ExerciseTag", back_populates="exercise")
    workout_sets: Mapped[list["WorkoutSet"]] = relationship("WorkoutSet", back_populates="exercise")
    template_sets: Mapped[list["TemplateSet"]] = relationship("TemplateSet", back_populates="exercise")

    __table_args__ = (
        UniqueConstraint("name", "trainer_id", name="uq_exercise_name_trainer"),
    )


class ExerciseTag(Base):
    __tablename__ = "exercise_tag"

    exercise_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("exercise.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(Integer, ForeignKey("tag.id"), primary_key=True)

    # Relationships
    exercise: Mapped["Exercise"] = relationship("Exercise", back_populates="tags")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="exercises")

