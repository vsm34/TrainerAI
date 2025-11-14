from sqlalchemy import Column, String, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from uuid import uuid4, UUID

from app.db.base import Base


class ProgressionRule(Base):
    __tablename__ = "progression_rule"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    trainer_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("trainer.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    applies_to_tag_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("tag.id"), nullable=True)
    applies_to_exercise_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("exercise.id"), nullable=True)
    rule_type: Mapped[str] = mapped_column(String)
    params_json: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer: Mapped["Trainer"] = relationship("Trainer", back_populates="progression_rules")
    tag: Mapped["Tag | None"] = relationship("Tag")
    exercise: Mapped["Exercise | None"] = relationship("Exercise")

