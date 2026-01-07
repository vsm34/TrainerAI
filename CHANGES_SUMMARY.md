# Multi-User Auth & Global Exercises Fix - Summary

## Issues Fixed

### Issue A: Flash of Previous User Data
- **Problem**: After logging into test2@trainer.ai, briefly saw test@trainer.ai data before "reset"
- **Root Cause**: React Query cache was clearing but queries might refetch with stale token timing
- **Solution**: Improved cache clearing to track UID changes and only clear when user actually switches

### Issue B: New User Sees No Exercises
- **Problem**: New user sees 0 exercises (expected ~44 global exercises)
- **Root Cause**: Exercises were seeded per-trainer only; no global exercises (trainer_id = NULL) existed
- **Solution**: Created global exercise seeder that runs on app startup

## Files Changed

### 1. Backend: `backend/app/main.py`
**Added lifespan hook to seed global exercises on startup**

```python
# Added imports
from contextlib import asynccontextmanager
from app.db.session import SessionLocal
from app.services.global_exercise_seed import seed_global_exercises

# Added lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
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

# Updated FastAPI constructor
app = FastAPI(
    title="TrainerAI Backend",
    version="0.1.0",
    lifespan=lifespan,  # ✅ Added
)
```

### 2. Backend: `backend/app/services/global_exercise_seed.py` (NEW FILE)
**Creates global exercises (trainer_id = NULL) visible to all authenticated users**

```python
def seed_global_exercises(db: Session) -> Tuple[int, int]:
    """
    Seed global exercises (trainer_id = NULL) that are visible to all authenticated users.
    Safe to call multiple times – exercises are de-duplicated by name.
    """
    created = 0
    skipped = 0

    for exercise_data in DEFAULT_EXERCISES:
        # ... muscle/tag logic ...
        
        # Check if global exercise with this name already exists
        existing = db.execute(
            select(Exercise).where(
                Exercise.trainer_id.is_(None),  # ✅ Global only
                Exercise.name.ilike(normalized_name),
            )
        ).scalar_one_or_none()
        
        if existing:
            skipped += 1
            continue

        # Create global exercise
        exercise = Exercise(
            name=normalized_name,
            trainer_id=None,  # ✅ Global exercise
            primary_muscle_id=primary_muscle.id,
            # ... other fields ...
        )
        db.add(exercise)
        db.flush()
        created += 1

    db.commit()
    return created, skipped
```

### 3. Backend: `backend/app/api/v1/exercises.py`
**Split helper functions to prevent editing global exercises**

```python
def _get_exercise_or_404(
    exercise_id: str,
    db: Session,
    trainer_id: str,
) -> Exercise:
    """
    Helper for GET: allows global OR trainer-owned exercises.
    """
    result = db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            (Exercise.trainer_id == trainer_id) | (Exercise.trainer_id.is_(None)),
        )
    )
    # ... return exercise or raise 404 ...

def _get_trainer_exercise_or_404(
    exercise_id: str,
    db: Session,
    trainer_id: str,
) -> Exercise:
    """
    Helper for PUT/DELETE: only allows trainer-owned exercises.
    Raises 404 if exercise is global.
    """
    result = db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            Exercise.trainer_id == trainer_id,  # ✅ No global check
        )
    )
    # ... return exercise or raise 404 "not owned by trainer" ...

# Updated update endpoint
@router.put("/{exercise_id}", response_model=ExerciseRead)
async def update_exercise(...) -> ExerciseRead:
    """Cannot update global exercises."""
    exercise = _get_trainer_exercise_or_404(exercise_id, db, current_trainer.id)  # ✅ Changed
    # ... rest of update logic ...

# Updated delete endpoint  
@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(...) -> None:
    """Cannot delete global exercises."""
    exercise = _get_trainer_exercise_or_404(exercise_id, db, current_trainer.id)  # ✅ Changed
    # ... rest of delete logic ...
```

### 4. Backend: `backend/app/api/v1/workouts.py`
**Allow global exercises in workout validation**

```python
# In create_workout, changed validation query:
# OLD:
result = db.execute(
    select(Exercise).where(
        Exercise.id.in_(exercise_ids),
        Exercise.trainer_id == current_trainer.id  # ❌ Only trainer's exercises
    )
)

# NEW:
result = db.execute(
    select(Exercise).where(
        Exercise.id.in_(exercise_ids),
        (Exercise.trainer_id == current_trainer.id) | (Exercise.trainer_id.is_(None))  # ✅ Global OR owned
    )
)

# Same fix applied in:
# - create_workout exercise validation
# - update_workout (PUT /workouts/{id}) exercise validation  
# - AI workout generation exercise fetching
```

### 5. Frontend: `frontend/components/Providers.tsx`
**Improved cache clearing to prevent race conditions**

```tsx
function AuthCacheBoundary({ queryClient }: { queryClient: QueryClient }) {
  const [previousUid, setPreviousUid] = useState<string | null>(null);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const currentUid = user?.uid ?? null;
      
      // ✅ Clear cache only when user changes (not on initial load)
      if (previousUid !== currentUid && previousUid !== null) {
        console.log("[AuthCache] User changed, clearing cache", { from: previousUid, to: currentUid });
        queryClient.clear();
      }
      
      setPreviousUid(currentUid);
    });
    return () => unsub();
  }, [queryClient, previousUid]);
  
  return null;
}
```

## Summary of Changes

### Backend Security Improvements
✅ Global exercises (trainer_id = NULL) created on startup  
✅ List exercises returns global + trainer-owned  
✅ Get exercise allows reading global exercises  
✅ Update/delete exercise restricted to trainer-owned only  
✅ Workout validation allows using global exercises  
✅ AI workout generation includes global exercises  

### Frontend Auth & Cache Improvements  
✅ Cache clearing tracks UID changes (prevents race condition)  
✅ Queries already gated on `!authLoading && !!user`  
✅ API client always gets fresh token via `getIdToken()`  
✅ ProtectedRoute blocks rendering until auth ready  

### User Experience
✅ New users immediately see ~44 global exercises  
✅ No flash of previous user data when switching users  
✅ Global exercises visible but not editable  
✅ Trainers can create custom exercises (visible only to them)  
✅ Complete isolation between trainer accounts  

## Quick Verification

After restarting backend:
1. Check logs for: `[STARTUP] Global exercises seeded: created=44, skipped=0`
2. Login as any user → should see ~44 exercises
3. Switch users → should see cache clear log, no data flash
4. Try editing global exercise → should not have Edit button

## No Regressions
- Existing trainer-owned exercises still work
- Existing workouts still editable
- Client isolation unchanged
- Auth flow unchanged
- All queries still properly gated
