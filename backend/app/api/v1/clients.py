from __future__ import annotations

from uuid import UUID
from typing import List

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import DBSessionDep, TrainerDep
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate


router = APIRouter()


@router.get("/", response_model=List[ClientRead])
async def list_clients(
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> list[ClientRead]:
    result = db.execute(
        select(Client)
        .where(Client.trainer_id == current_trainer.id)
        .order_by(Client.created_at)
    )
    return result.scalars().all()


@router.post("/", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> ClientRead:
    client = Client(
        trainer_id=current_trainer.id,
        **payload.model_dump(),
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def _get_client_or_404(
    client_id: UUID,
    db: Session,
    trainer_id: UUID,
) -> Client:
    result = db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.trainer_id == trainer_id,
        )
    )
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return obj


@router.get("/{client_id}", response_model=ClientRead)
async def get_client(
    client_id: UUID,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> ClientRead:
    return _get_client_or_404(client_id, db, current_trainer.id)


@router.put("/{client_id}", response_model=ClientRead)
async def update_client(
    client_id: UUID,
    payload: ClientUpdate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> ClientRead:
    client = _get_client_or_404(client_id, db, current_trainer.id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> None:
    client = _get_client_or_404(client_id, db, current_trainer.id)
    db.delete(client)
    db.commit()

