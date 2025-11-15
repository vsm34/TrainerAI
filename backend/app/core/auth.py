from __future__ import annotations

import os
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.db.session import get_db
from app.models.trainer import Trainer


# Initialize Firebase Admin app once
if not firebase_admin._apps:
    cred_path = os.getenv("FIREBASE_CREDENTIALS_FILE")
    if cred_path:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

security = HTTPBearer(auto_error=True)


async def get_current_trainer(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> Trainer:
    token = creds.credentials

    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token",
        )

    firebase_uid = decoded.get("uid")
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase token missing uid",
        )

    # Lookup existing trainer by firebase_uid
    result = db.execute(
        select(Trainer).where(Trainer.firebase_uid == firebase_uid)
    )
    trainer = result.scalar_one_or_none()

    # If trainer doesn't exist, create a new one
    if trainer is None:
        email = decoded.get("email")
        name = decoded.get("name")
        
        trainer = Trainer(
            firebase_uid=firebase_uid,
            email=email,
            name=name,
        )
        db.add(trainer)
        db.commit()
        db.refresh(trainer)

    return trainer

