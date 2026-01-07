from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from uuid import uuid4

from app.db.base import Base


class Exercise(Base):
    __tablename__ = "exercise"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid4()))
    trainer_id = Column(String(36), ForeignKey("trainer.id"), nullable=True, index=True)  # ✅ Nullable for global exercises

    name = Column(String, nullable=False)
    primary_muscle_id = Column(Integer, ForeignKey("muscle.id"), nullable=False)

    equipment = Column(String, nullable=False)
    movement_pattern = Column(String, nullable=True)
    skill_level = Column(String, nullable=False, default="beginner")
    unilateral = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

    notes = Column(String, nullable=True)

    # ✅ relationships
    trainer = relationship("Trainer", back_populates="exercises")
    primary_muscle = relationship("Muscle", back_populates="exercises")

    tags = relationship(
        "ExerciseTag",
        back_populates="exercise",
        cascade="all, delete-orphan",
    )

    template_sets = relationship(
        "TemplateSet",
        back_populates="exercise",
        cascade="all, delete-orphan",
    )

    workout_sets = relationship(
        "WorkoutSet",
        back_populates="exercise",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("name", "trainer_id", name="uq_exercise_name_trainer"),
    )


class ExerciseTag(Base):
    __tablename__ = "exercise_tag"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(String(36), ForeignKey("exercise.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tag.id"), nullable=False)

    exercise = relationship("Exercise", back_populates="tags")
    tag = relationship("Tag", back_populates="exercise_links")

    __table_args__ = (
        UniqueConstraint("exercise_id", "tag_id", name="uix_exercise_tag"),
    )

