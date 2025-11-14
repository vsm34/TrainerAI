from sqlalchemy import String, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from uuid import uuid4

from app.db.base import Base


class Trainer(Base):
    __tablename__ = "trainer"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    firebase_uid: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    clients: Mapped[list["Client"]] = relationship("Client", back_populates="trainer")
    templates: Mapped[list["Template"]] = relationship("Template", back_populates="trainer")
    workouts: Mapped[list["Workout"]] = relationship("Workout", back_populates="trainer")
    exercises: Mapped[list["Exercise"]] = relationship("Exercise", back_populates="trainer")
    progression_rules: Mapped[list["ProgressionRule"]] = relationship("ProgressionRule", back_populates="trainer")

