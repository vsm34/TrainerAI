from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import clients, exercises, workouts

app = FastAPI(
    title="TrainerAI Backend",
    version="0.1.0",
)

# Allowed explicit origins for local dev
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",  # optional extra
]

# CORS middleware allowing local dev + any *.vercel.app deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "TrainerAI backend is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


# Mount API v1
app.include_router(
    clients.router,
    prefix="/api/v1/clients",
    tags=["clients"],
)
app.include_router(
    exercises.router,
    prefix="/api/v1/exercises",
    tags=["exercises"],
)
app.include_router(
    workouts.router,
    prefix="/api/v1/workouts",
    tags=["workouts"],
)
