from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MuscleGroup(Base):
    __tablename__ = "muscle_group"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    order_index: Mapped[int] = mapped_column(Integer)

    # Note: MuscleGroup is kept for backward compatibility but not used in v1
    # Muscle and Tag models are now in app.models.muscle and app.models.tag
    # No relationship to Muscle - muscles are standalone in v1

