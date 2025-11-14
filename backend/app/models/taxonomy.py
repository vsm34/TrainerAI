from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base


class MuscleGroup(Base):
    __tablename__ = "muscle_group"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    order_index: Mapped[int] = mapped_column(Integer)

    # Relationships
    muscles: Mapped[list["Muscle"]] = relationship("Muscle", back_populates="muscle_group")


class Muscle(Base):
    __tablename__ = "muscle"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    muscle_group_id: Mapped[int] = mapped_column(Integer, ForeignKey("muscle_group.id"))

    # Relationships
    muscle_group: Mapped["MuscleGroup"] = relationship("MuscleGroup", back_populates="muscles")
    primary_exercises: Mapped[list["Exercise"]] = relationship("Exercise", back_populates="primary_muscle")


class Tag(Base):
    __tablename__ = "tag"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    # Relationships
    exercises: Mapped[list["ExerciseTag"]] = relationship("ExerciseTag", back_populates="tag")

