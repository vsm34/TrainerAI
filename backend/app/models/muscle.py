from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base


class MuscleGroup(Base):
    __tablename__ = "muscle_group"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    muscles = relationship("Muscle", back_populates="muscle_group")


class Muscle(Base):
    __tablename__ = "muscle"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    # ✅ allow NULL so we can create muscles without specifying a group
    muscle_group_id = Column(Integer, ForeignKey("muscle_group.id"), nullable=True)

    muscle_group = relationship("MuscleGroup", back_populates="muscles")

    # existing relationship from Muscle to Exercise
    exercises = relationship("Exercise", back_populates="primary_muscle")

