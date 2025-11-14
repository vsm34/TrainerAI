from sqlalchemy import String, ForeignKey, Integer, DateTime, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from uuid import uuid4

from app.db.base import Base


class ProgressionRule(Base):
    __tablename__ = "progression_rule"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    trainer_id: Mapped[str] = mapped_column(String(36), ForeignKey("trainer.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    applies_to_tag_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("tag.id"), nullable=True)
    applies_to_exercise_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("exercise.id"), nullable=True)
    rule_type: Mapped[str] = mapped_column(String)
    params_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer: Mapped["Trainer"] = relationship("Trainer", back_populates="progression_rules")
    tag: Mapped["Tag | None"] = relationship("Tag")
    exercise: Mapped["Exercise | None"] = relationship("Exercise")

