from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import clients, exercises, workouts
from app.db.session import SessionLocal
from app.services.global_exercise_seed import seed_global_exercises


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler to seed global exercises on startup.
    """
    # Startup: seed global exercises once
    db = SessionLocal()
    try:
        created, skipped = seed_global_exercises(db)
        print(f"[STARTUP] Global exercises seeded: created={created}, skipped={skipped}")
    except Exception as e:
        print(f"[STARTUP] Failed to seed global exercises: {e}")
    finally:
        db.close()
    
    yield
    
    # Shutdown: cleanup if needed
    print("[SHUTDOWN] App shutting down")


app = FastAPI(
    title="TrainerAI Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# Allowed explicit origins for local dev
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",  # optional extra
]

# CORS middleware allowing local dev + any *.vercel.app deployment
# Must be added BEFORE exception handlers to ensure CORS headers on errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers to ensure CORS headers are included in error responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={"Access-Control-Allow-Origin": request.headers.get("origin", "*")},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers={"Access-Control-Allow-Origin": request.headers.get("origin", "*")},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": request.headers.get("origin", "*")},
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
