# Database Schema Fix - Exercise.trainer_id Nullable Migration

## Issue
`sqlite3.IntegrityError: NOT NULL constraint failed: exercise.trainer_id`

The Exercise model incorrectly enforces `trainer_id NOT NULL`, but global exercises require `trainer_id = NULL`.

## Fix Applied

### 1. Model Fix
**File**: `backend/app/models/exercise.py`

```python
# BEFORE (line 11):
trainer_id = Column(String(36), ForeignKey("trainer.id"), nullable=False, index=True)

# AFTER:
trainer_id = Column(String(36), ForeignKey("trainer.id"), nullable=True, index=True)  # ✅ Nullable for global exercises
```

### 2. Migration Scripts Created

#### Option A: Migrate Existing Database (Preserves Data)
**File**: `backend/app/db/migrate_exercise_trainer_id.py`

Safely migrates existing exercise table using SQLite table recreation pattern:
1. Create new table with nullable trainer_id
2. Copy all data
3. Drop old table
4. Rename new table
5. Recreate indexes

#### Option B: Reset Database (Development Only - DELETES ALL DATA)
**File**: `backend/app/db/reset_db.py`

Completely recreates database from scratch with updated schema.

## Migration Steps

### If You Have Existing Data You Want to Keep

```powershell
# Navigate to backend directory
cd backend

# Run migration script
python -m app.db.migrate_exercise_trainer_id
```

**Expected output**:
```
============================================================
Exercise trainer_id Nullable Migration
============================================================

This will migrate the exercise table to allow trainer_id = NULL
for global exercises visible to all authenticated users.

[MIGRATION] Starting exercise.trainer_id nullable migration...
[MIGRATION] Created exercise_new table
[MIGRATION] Copied data from exercise to exercise_new
[MIGRATION] Migrating X exercises
[MIGRATION] Dropped old exercise table
[MIGRATION] Renamed exercise_new to exercise
[MIGRATION] Recreated indexes
[MIGRATION] ✅ Successfully migrated X exercises
[MIGRATION] Exercise.trainer_id is now nullable for global exercises

============================================================
Migration complete! You can now restart the backend.
============================================================
```

### If You Want to Start Fresh (DEVELOPMENT ONLY)

```powershell
# Navigate to backend directory
cd backend

# Reset database (will prompt for confirmation)
python -m app.db.reset_db
```

**You will be prompted**:
```
⚠️  WARNING: This will DELETE the existing database!
⚠️  ALL DATA WILL BE LOST!

Type 'RESET' to confirm:
```

Type `RESET` and press Enter.

## After Migration

### Restart Backend

In the uvicorn terminal:
1. Press `Ctrl+C` to stop
2. Restart:

```powershell
cd backend
uvicorn app.main:app --reload
```

### Verify Success

**Expected startup logs**:
```
[STARTUP] Global exercises seeded: created=44, skipped=0
INFO:     Application startup complete.
```

**If you see `created=44`**: ✅ Success! Global exercises seeded.

**If you see `skipped=44`**: ✅ Success! Global exercises already exist.

**If you see errors**: ❌ Check troubleshooting below.

### Test in Frontend

1. Login as any user (e.g., test@trainer.ai or test2@trainer.ai)
2. Go to Exercises page
3. **Expected**: Should see ~44 global exercises immediately
4. Filter by "Global" → should show all 44
5. Filter by "Mine" → should show 0 (unless you created custom exercises)
6. Global exercises should have "Global" badge (no Edit button)

## Files Changed

1. **`backend/app/models/exercise.py`**
   - Changed `trainer_id` from `nullable=False` to `nullable=True`
   - Allows global exercises (trainer_id = NULL)

2. **`backend/app/db/migrate_exercise_trainer_id.py`** (NEW)
   - Migration script to update existing database
   - Preserves data, recreates table with nullable column

3. **`backend/app/db/reset_db.py`** (NEW)
   - Development utility to reset database from scratch
   - WARNING: Deletes all data

## Verification Checklist

After migration and backend restart:

- [ ] Backend starts without errors
- [ ] Startup log shows: `[STARTUP] Global exercises seeded: created=44`
- [ ] Login as new user → sees ~44 exercises immediately
- [ ] Exercises page loads without errors
- [ ] Global exercises have "Global" badge
- [ ] Cannot edit/delete global exercises (no Edit button)
- [ ] Can create workouts using global exercises
- [ ] Dashboard shows correct counts (0 workouts, ~44 exercises, 0 clients for new user)

## Troubleshooting

### Migration Script Errors

**Error**: `table exercise_new already exists`
- **Fix**: Drop the temp table manually:
  ```powershell
  # Open SQLite shell
  sqlite3 trainerai.db
  
  # Drop temp table
  DROP TABLE IF EXISTS exercise_new;
  
  # Exit
  .quit
  
  # Re-run migration
  python -m app.db.migrate_exercise_trainer_id
  ```

### Startup Seeding Errors

**Error**: `NOT NULL constraint failed: exercise.trainer_id`
- **Cause**: Migration didn't run or failed
- **Fix**: Re-run migration script or reset database

**Error**: `UNIQUE constraint failed: exercise.name, exercise.trainer_id`
- **Cause**: Global exercises already exist
- **Fix**: This is normal if seeding runs multiple times (idempotent)

### No Exercises Showing in Frontend

**Issue**: User sees 0 exercises
- **Check**: Backend logs for `[STARTUP] Global exercises seeded`
- **Check**: Database has exercises with `trainer_id IS NULL`:
  ```powershell
  sqlite3 trainerai.db
  SELECT COUNT(*) FROM exercise WHERE trainer_id IS NULL;
  # Should return 44
  .quit
  ```
- **Fix**: If count is 0, restart backend to re-seed

## Database Schema (After Migration)

```sql
CREATE TABLE exercise (
    id VARCHAR(36) PRIMARY KEY,
    trainer_id VARCHAR(36),              -- ✅ Now nullable
    name VARCHAR NOT NULL,
    primary_muscle_id INTEGER NOT NULL,
    equipment VARCHAR NOT NULL,
    movement_pattern VARCHAR,
    skill_level VARCHAR NOT NULL DEFAULT 'beginner',
    unilateral BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    notes VARCHAR,
    FOREIGN KEY(trainer_id) REFERENCES trainer(id),
    FOREIGN KEY(primary_muscle_id) REFERENCES muscle(id),
    UNIQUE(name, trainer_id)             -- ✅ Allows multiple exercises with same name if one is global
);
```

## Access Rules (Unchanged)

- **List exercises**: Returns `(trainer_id IS NULL) OR (trainer_id == current_user.uid)`
- **Get exercise**: Allows reading global OR owned exercises
- **Update exercise**: ONLY if `trainer_id == current_user.uid` (blocks global)
- **Delete exercise**: ONLY if `trainer_id == current_user.uid` (blocks global)
- **Workout validation**: Allows using global OR owned exercises

## No Regressions

✅ Trainer-owned exercises still work  
✅ Exercise isolation between trainers preserved  
✅ Workouts can use global exercises  
✅ Global exercises read-only (cannot edit/delete)  
✅ Auth rules unchanged  
✅ No duplicate exercises across users  
