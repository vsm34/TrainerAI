from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """Base class for schemas that read from SQLAlchemy ORM models."""
    model_config = ConfigDict(from_attributes=True)

