from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base  # <-- make sure this import exists


# Create the engine from DATABASE_URL in config.py
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

# 🚨 DEV-ONLY: auto-create tables if they don't exist
# This is fine for local SQLite while you're building things.
Base.metadata.create_all(bind=engine)


# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
