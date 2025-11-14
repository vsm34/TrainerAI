from datetime import datetime

from app.schemas.base import ORMModel


class TrainerRead(ORMModel):
    id: str
    firebase_uid: str
    email: str | None = None
    name: str | None = None
    created_at: datetime
    updated_at: datetime

