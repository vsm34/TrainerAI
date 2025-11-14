from sqlalchemy import String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from uuid import uuid4

from app.db.base import Base


class Client(Base):
    __tablename__ = "client"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    trainer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("trainer.id"),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ✅ Use JSON instead of ARRAY / JSONB so SQLite can handle it
    injury_flags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    preferences_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Relationships
    trainer: Mapped["Trainer"] = relationship("Trainer", back_populates="clients")
    workouts: Mapped[list["Workout"]] = relationship("Workout", back_populates="client")
