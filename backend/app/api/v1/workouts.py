from __future__ import annotations

from typing import List
from datetime import datetime, time

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session, selectinload

from app.api.deps import DBSessionDep, TrainerDep
from app.models.workout import Workout, WorkoutBlock, WorkoutSet
from app.models.exercise import Exercise, ExerciseTag
from app.models.muscle import Muscle
from app.models.tag import Tag
from app.models.client import Client
from app.schemas.workout import WorkoutCreate, WorkoutRead, WorkoutUpdate
from app.schemas.ai_workout import (
    WorkoutGenerateRequest,
    WorkoutGenerateResponse,
    AIWorkoutPlan,
)
from app.core.ai_client import generate_workout_plan


router = APIRouter()


@router.get("/", response_model=List[WorkoutRead])
async def list_workouts(
    db: DBSessionDep,
    current_trainer: TrainerDep,
    q: str | None = Query(None, description="Text search on workout title"),
    client_id: str | None = Query(None, description="Filter by client ID"),
    status_filter: str | None = Query(None, description="Filter by status"),
) -> list[WorkoutRead]:
    """
    List all workouts for the current trainer with optional filters.
    """
    stmt = (
        select(Workout)
        .where(Workout.trainer_id == current_trainer.id)
        .options(
            selectinload(Workout.blocks).selectinload(WorkoutBlock.sets)
        )
    )

    # Apply text search filter (case-insensitive, SQLite compatible)
    if q:
        stmt = stmt.where(func.lower(Workout.title).contains(q.lower()))
    
    if client_id is not None:
        stmt = stmt.where(Workout.client_id == client_id)
    if status_filter is not None:
        stmt = stmt.where(Workout.status == status_filter)

    stmt = stmt.order_by(Workout.date.desc(), Workout.created_at.desc())

    result = db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
async def create_workout(
    payload: WorkoutCreate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> WorkoutRead:
    """
    Create a new workout with optional nested blocks and sets.
    Validates that all exercise IDs belong to the trainer.
    """
    # Extract blocks from payload
    blocks_data = payload.blocks
    workout_data = payload.model_dump(exclude={"blocks"})
    
    # Convert date to datetime for the model
    if "date" in workout_data and workout_data["date"]:
        workout_data["date"] = datetime.combine(workout_data["date"], time.min)
    
    # Create the workout
    workout = Workout(
        trainer_id=current_trainer.id,
        **workout_data,
    )
    db.add(workout)
    db.flush()  # Flush to get the workout ID
    
    # Validate and create blocks and sets
    if blocks_data:
        # Collect all exercise IDs to validate in one query
        exercise_ids = set()
        for block in blocks_data:
            for set_data in block.sets:
                exercise_ids.add(set_data.exercise_id)
        
        # Validate all exercise IDs exist (global or trainer-owned)
        if exercise_ids:
            result = db.execute(
                select(Exercise).where(
                    Exercise.id.in_(exercise_ids),
                    (Exercise.trainer_id == current_trainer.id) | (Exercise.trainer_id.is_(None))
                )
            )
            valid_exercises = {ex.id for ex in result.scalars().all()}
            invalid_exercises = exercise_ids - valid_exercises
            
            if invalid_exercises:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid exercise IDs (not found): {', '.join(invalid_exercises)}"
                )
        
        # Create blocks and sets
        for block_data in blocks_data:
            block = WorkoutBlock(
                workout_id=workout.id,
                block_type=block_data.block_type,
                sequence_index=block_data.sequence_index,
                notes=block_data.notes,
            )
            db.add(block)
            db.flush()  # Flush to get the block ID
            
            # Create sets for this block
            for set_data in block_data.sets:
                workout_set = WorkoutSet(
                    workout_block_id=block.id,
                    exercise_id=set_data.exercise_id,
                    set_index=set_data.set_index,
                    target_sets=set_data.target_sets,
                    target_reps_min=set_data.target_reps_min,
                    target_reps_max=set_data.target_reps_max,
                    target_load_type=set_data.target_load_type,
                    target_load_value=set_data.target_load_value,
                    rpe_target=set_data.rpe_target,
                    rest_seconds=set_data.rest_seconds,
                    tempo=set_data.tempo,
                    is_warmup=set_data.is_warmup,
                    notes=set_data.notes,
                    prescription_text=set_data.prescription_text,
                )
                db.add(workout_set)
    
    db.commit()
    
    # Reload with relationships
    result = db.execute(
        select(Workout)
        .where(Workout.id == workout.id)
        .options(
            selectinload(Workout.blocks).selectinload(WorkoutBlock.sets)
        )
    )
    workout = result.scalar_one()
    return workout


@router.post("/generate", response_model=WorkoutGenerateResponse)
async def generate_workout(
    payload: WorkoutGenerateRequest,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> WorkoutGenerateResponse:
    """
    Generate an AI workout plan using Gemini.
    Returns a structured workout plan that can be previewed and optionally saved.
    """
    # Fetch client if provided
    client = None
    if payload.client_id:
        result = db.execute(
            select(Client).where(
                Client.id == payload.client_id,
                Client.trainer_id == current_trainer.id,
            )
        )
        client = result.scalar_one_or_none()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

    # Fetch all active exercises for this trainer (including global) with relationships
    stmt = (
        select(Exercise)
        .where(
            (Exercise.trainer_id == current_trainer.id) | (Exercise.trainer_id.is_(None)),
            Exercise.is_active == True,
        )
        .options(
            selectinload(Exercise.primary_muscle),
            # Load association rows and then the Tag objects
            selectinload(Exercise.tags).selectinload(ExerciseTag.tag),
        )
        .order_by(Exercise.name)
    )

    result = db.execute(stmt)
    exercises = result.scalars().unique().all()

    if not exercises:
        # Either tell the trainer to seed/create exercises, or optionally auto-seed here.
        # For now, keep the explicit error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No exercises available. Please create exercises or call /exercises/seed-defaults before generating workouts.",
        )

    # Format exercises for the prompt
    # Derive subset from muscle name (simplified mapping based on taxonomy_reference.md)
    muscle_name_to_subset = {
        "Shoulders": "upper",
        "Chest": "upper",
        "Tricep": "upper",
        "Bicep": "upper",
        "Back": "upper",
        "Quads": "lower",
        "Hamstring": "lower",
        "Glutes": "lower",
        "Lower Abs": "core",
        "Upper Abs": "core",
        "Obliques": "core",
    }
    
    exercises_list = []
    for ex in exercises:
        # Derive subset from primary muscle name
        subset = "unknown"
        if ex.primary_muscle:
            muscle_name = ex.primary_muscle.name
            # Try exact match first, then case-insensitive
            subset = muscle_name_to_subset.get(muscle_name) or muscle_name_to_subset.get(
                muscle_name.title()
            ) or "unknown"
        
        exercise_data = {
            "id": ex.id,
            "name": ex.name,
            "subset": subset,
            "primary_muscle_id": ex.primary_muscle_id,
            "movement_pattern": ex.movement_pattern,
            "equipment": ex.equipment,
            "tags": [tag.tag.name for tag in ex.tags] if ex.tags else [],
        }
        exercises_list.append(exercise_data)

    # Build the prompt according to docs/ai_prompt_design.md
    prompt_parts = [
        "You are TrainerAI, an expert workout generator that creates structured workout plans",
        "according to a strict JSON schema.",
        "",
        "### RULES",
        "- USE ONLY the exercises provided in the list.",
        "- NEVER hallucinate new exercises.",
        "- ALWAYS match the provided schema exactly.",
        "- Names must exactly match exercise.name and exercise.id.",
        "- Ensure each block has valid exercises and set prescriptions.",
        "- Return ONLY JSON. No commentary.",
        "",
        "### CONTEXT",
    ]

    # Add client context if available
    if client:
        prompt_parts.append(f"Client name: {client.name}")
        if client.notes:
            prompt_parts.append(f"Client notes: {client.notes}")
        if client.injury_flags:
            prompt_parts.append(f"Injuries: {', '.join(client.injury_flags)}")
        if client.preferences_json:
            prompt_parts.append(f"Preferences: {client.preferences_json}")
    else:
        prompt_parts.append("Client: Not specified")

    # Add workout constraints
    prompt_parts.append(f"Focus subsets: {', '.join(payload.focus_subsets)}")
    if payload.session_length_minutes:
        prompt_parts.append(f"Session length: {payload.session_length_minutes} minutes")
    if payload.equipment_available:
        prompt_parts.append(f"Equipment available: {', '.join(payload.equipment_available)}")
    if payload.notes:
        prompt_parts.append(f"Trainer notes: {payload.notes}")

    # Add schema definition
    prompt_parts.extend([
        "",
        "### SCHEMA",
        "The output must be a JSON object matching this structure:",
        "{",
        '  "name": "string (workout name)",',
        '  "focus_subsets": ["upper" | "lower" | "core" | "full_body" | "conditioning"],',
        '  "muscles_targeted": ["string (muscle names)"],',
        '  "blocks": [',
        "    {",
        '      "block_type": "straight" | "superset" | "circuit",',
        '      "rest_seconds": number,',
        '      "exercises": [',
        "        {",
        '          "exercise_id": "string (must match an exercise.id from the list)",',
        '          "sets": [',
        "            {",
        '              "reps": number,',
        '              "weight": number | null,',
        '              "notes": "string | null"',
        "            }",
        "          ]",
        "        }",
        "      ]",
        "    }",
        "  ]",
        "}",
        "",
        "### AVAILABLE EXERCISES",
    ])

    # Add exercises list
    for ex in exercises_list:
        ex_str = f"- id: {ex['id']}, name: {ex['name']}, subset: {ex['subset']}, "
        ex_str += f"primary_muscle_id: {ex['primary_muscle_id']}, "
        ex_str += f"movement_pattern: {ex['movement_pattern']}, equipment: {ex['equipment']}"
        if ex['tags']:
            ex_str += f", tags: {', '.join(ex['tags'])}"
        prompt_parts.append(ex_str)

    # Add instruction
    prompt_parts.extend([
        "",
        "### INSTRUCTION",
        f"Generate exactly 1 workout plan in valid JSON that follows:",
        f"- Focus on: {', '.join(payload.focus_subsets)}",
        f"- Include 4-6 exercises total",
        f"- 3-4 sets per exercise unless it's a circuit",
        f"- Rest: 60-120 seconds between sets",
        "",
        "RETURN ONLY VALID JSON.",
    ])

    prompt = "\n".join(prompt_parts)

    # Call Gemini
    try:
        raw_plan = await generate_workout_plan(prompt)
    except ValueError as e:
        # Typically GEMINI_API_KEY not set
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        # Gemini or JSON related issues
        raise HTTPException(status_code=502, detail=str(e))

    # Validate with Pydantic schema
    try:
        plan = AIWorkoutPlan.model_validate(raw_plan)
    except Exception as e:
        # Log validation error for debugging (but don't expose internal details)
        import traceback
        print(f"[ERROR] Workout plan validation failed: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=502,
            detail=f"Generated workout plan failed validation: {str(e)}",
        )

    return WorkoutGenerateResponse(plan=plan)


def _get_workout_or_404(
    workout_id: str,
    db: Session,
    trainer_id: str,
) -> Workout:
    """
    Helper function to get a workout by ID and trainer_id, or raise 404.
    """
    result = db.execute(
        select(Workout).where(
            Workout.id == workout_id,
            Workout.trainer_id == trainer_id,
        )
    )
    w = result.scalar_one_or_none()
    if w is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )
    return w


@router.get("/{workout_id}", response_model=WorkoutRead)
async def get_workout(
    workout_id: str,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> WorkoutRead:
    """
    Get a single workout by ID with nested blocks and sets, scoped to the current trainer.
    """
    result = db.execute(
        select(Workout)
        .where(
            Workout.id == workout_id,
            Workout.trainer_id == current_trainer.id,
        )
        .options(
            selectinload(Workout.blocks).selectinload(WorkoutBlock.sets)
        )
    )
    workout = result.scalar_one_or_none()
    if workout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )
    return workout


@router.put("/{workout_id}", response_model=WorkoutRead)
async def update_workout(
    workout_id: str,
    payload: WorkoutUpdate,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> WorkoutRead:
    """
    Update an existing workout owned by the current trainer.
    
    Supports two modes:
    1. Metadata-only update: Provide fields like title, date, status, etc. (no blocks field)
    2. Full plan update: Provide blocks field to replace the entire workout structure
    
    When blocks are provided:
    - Existing blocks and sets are deleted
    - New structure is created from the payload
    - All operations are transactional
    """
    workout = _get_workout_or_404(workout_id, db, current_trainer.id)

    update_data = payload.model_dump(exclude_unset=True)
    
    # Extract blocks if present (will handle separately)
    blocks_data = update_data.pop("blocks", None)
    
    # Update metadata fields
    if "date" in update_data and update_data["date"] is not None:
        # Expect "YYYY-MM-DD" from frontend / Swagger.
        # Convert to datetime with no time component (00:00) in the current timezone/naive.
        try:
            update_data["date"] = datetime.fromisoformat(update_data["date"])
        except ValueError:
            # If the string is not a valid ISO date, raise a 422-style error
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=[{
                    "loc": ["body", "date"],
                    "msg": "Invalid date format, expected YYYY-MM-DD",
                    "type": "value_error.date"
                }],
            )

    for field, value in update_data.items():
        setattr(workout, field, value)

    # Handle structural plan update if blocks provided
    if blocks_data is not None:
        # Delete existing blocks and sets using explicit SQL queries
        # This is safer than relying on ORM cascade with SQLite FK constraints
        
        # Step 1: Delete all WorkoutSets for blocks belonging to this workout
        # Use subquery to find block IDs, then delete sets
        db.execute(
            delete(WorkoutSet).where(
                WorkoutSet.workout_block_id.in_(
                    select(WorkoutBlock.id).where(WorkoutBlock.workout_id == workout.id)
                )
            )
        )
        
        # Step 2: Delete all WorkoutBlocks for this workout
        db.execute(
            delete(WorkoutBlock).where(WorkoutBlock.workout_id == workout.id)
        )
        
        # Step 3: Flush to execute the deletes
        db.flush()
        
        # Validate and create new blocks and sets
        if blocks_data:
            # Collect all exercise IDs to validate in one query
            exercise_ids = set()
            for block in blocks_data:
                for set_data in block.get("sets", []):
                    exercise_ids.add(set_data.get("exercise_id"))
            
            # Validate all exercise IDs exist (global or trainer-owned)
            if exercise_ids:
                result = db.execute(
                    select(Exercise).where(
                        Exercise.id.in_(exercise_ids),
                        (Exercise.trainer_id == current_trainer.id) | (Exercise.trainer_id.is_(None))
                    )
                )
                valid_exercises = {ex.id for ex in result.scalars().all()}
                invalid_exercises = exercise_ids - valid_exercises
                
                if invalid_exercises:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid exercise IDs (not found): {', '.join(invalid_exercises)}"
                    )
            
            # Create new blocks and sets
            for block_data in blocks_data:
                block = WorkoutBlock(
                    workout_id=workout.id,
                    block_type=block_data.get("block_type"),
                    sequence_index=block_data.get("sequence_index"),
                    notes=block_data.get("notes"),
                )
                db.add(block)
                db.flush()  # Flush to get the block ID
                
                # Create sets for this block
                for set_data in block_data.get("sets", []):
                    workout_set = WorkoutSet(
                        workout_block_id=block.id,
                        exercise_id=set_data.get("exercise_id"),
                        set_index=set_data.get("set_index"),
                        target_sets=set_data.get("target_sets"),
                        target_reps_min=set_data.get("target_reps_min"),
                        target_reps_max=set_data.get("target_reps_max"),
                        target_load_type=set_data.get("target_load_type"),
                        target_load_value=set_data.get("target_load_value"),
                        rpe_target=set_data.get("rpe_target"),
                        rest_seconds=set_data.get("rest_seconds"),
                        tempo=set_data.get("tempo"),
                        is_warmup=set_data.get("is_warmup", False),
                        notes=set_data.get("notes"),
                        prescription_text=set_data.get("prescription_text"),
                    )
                    db.add(workout_set)

    db.add(workout)
    db.commit()
    
    # Reload with relationships to get fresh instances
    # This ensures deleted blocks are not referenced
    db.expire(workout)
    result = db.execute(
        select(Workout)
        .where(Workout.id == workout.id)
        .options(
            selectinload(Workout.blocks).selectinload(WorkoutBlock.sets)
        )
    )
    workout = result.scalar_one()
    return workout


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: str,
    db: DBSessionDep,
    current_trainer: TrainerDep,
) -> None:
    """
    Delete a workout owned by the current trainer.
    Cascades to blocks, sets, and completed_sets automatically via foreign key constraints.
    """
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy.orm import selectinload

    # Load workout with all relationships to ensure cascade works
    result = db.execute(
        select(Workout)
        .where(
            Workout.id == workout_id,
            Workout.trainer_id == current_trainer.id,
        )
        .options(
            selectinload(Workout.blocks).selectinload(WorkoutBlock.sets).selectinload(WorkoutSet.completed_sets)
        )
    )
    workout = result.scalar_one_or_none()
    
    if workout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )
    
    try:
        # Explicitly delete children first as a fallback if cascade doesn't work
        # This ensures deletion works even if foreign keys aren't properly configured
        if workout.blocks:
            for block in workout.blocks:
                if block.sets:
                    for workout_set in block.sets:
                        # Delete completed sets if they exist
                        if workout_set.completed_sets:
                            for completed_set in workout_set.completed_sets:
                                db.delete(completed_set)
                        db.delete(workout_set)
                    db.flush()
                db.delete(block)
            db.flush()
        
        # Delete the workout
        db.delete(workout)
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Failed to delete workout due to database constraints: {str(e)}",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete workout: {str(e)}",
        )

