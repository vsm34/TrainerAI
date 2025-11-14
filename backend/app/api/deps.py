from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_trainer
from app.db.session import get_db
from app.models.trainer import Trainer


DBSessionDep = Annotated[Session, Depends(get_db)]
TrainerDep = Annotated[Trainer, Depends(get_current_trainer)]

