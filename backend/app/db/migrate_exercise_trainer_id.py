"""
Database migration script for Exercise.trainer_id nullable fix.

SQLite doesn't support ALTER COLUMN directly, so we need to:
1. Create new table with correct schema
2. Copy data from old table
3. Drop old table
4. Rename new table

Run this ONCE before restarting the backend.

Usage:
    python -m app.db.migrate_exercise_trainer_id
"""

import sys
from sqlalchemy import text

from app.db.session import SessionLocal
from app.db.base import Base
from app.core.config import settings


def migrate_exercise_trainer_id():
    """
    Migrate exercise table to allow trainer_id = NULL for global exercises.
    """
    db = SessionLocal()
    
    try:
        # Check if migration is needed
        result = db.execute(text("PRAGMA table_info(exercise)"))
        columns = {row[1]: row for row in result.fetchall()}
        
        if 'trainer_id' not in columns:
            print("[MIGRATION] Exercise table doesn't exist yet. Skipping migration.")
            db.close()
            return
        
        trainer_id_col = columns['trainer_id']
        is_nullable = trainer_id_col[3] == 0  # notnull column
        
        if is_nullable:
            print("[MIGRATION] Exercise.trainer_id is already nullable. Migration not needed.")
            db.close()
            return
        
        print("[MIGRATION] Starting exercise.trainer_id nullable migration...")
        
        # Step 1: Create temporary table with new schema
        db.execute(text("""
            CREATE TABLE exercise_new (
                id VARCHAR(36) PRIMARY KEY,
                trainer_id VARCHAR(36),
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
                UNIQUE(name, trainer_id)
            )
        """))
        print("[MIGRATION] Created exercise_new table")
        
        # Step 2: Copy data from old table to new table
        db.execute(text("""
            INSERT INTO exercise_new 
                (id, trainer_id, name, primary_muscle_id, equipment, movement_pattern, 
                 skill_level, unilateral, is_active, notes)
            SELECT 
                id, trainer_id, name, primary_muscle_id, equipment, movement_pattern,
                skill_level, unilateral, is_active, notes
            FROM exercise
        """))
        print("[MIGRATION] Copied data from exercise to exercise_new")
        
        # Step 3: Get count before drop
        count_result = db.execute(text("SELECT COUNT(*) FROM exercise"))
        count = count_result.scalar()
        print(f"[MIGRATION] Migrating {count} exercises")
        
        # Step 4: Drop old table
        db.execute(text("DROP TABLE exercise"))
        print("[MIGRATION] Dropped old exercise table")
        
        # Step 5: Rename new table
        db.execute(text("ALTER TABLE exercise_new RENAME TO exercise"))
        print("[MIGRATION] Renamed exercise_new to exercise")
        
        # Step 6: Recreate indexes
        db.execute(text("CREATE INDEX ix_exercise_id ON exercise(id)"))
        db.execute(text("CREATE INDEX ix_exercise_trainer_id ON exercise(trainer_id)"))
        print("[MIGRATION] Recreated indexes")
        
        # Commit transaction
        db.commit()
        print(f"[MIGRATION] ✅ Successfully migrated {count} exercises")
        print("[MIGRATION] Exercise.trainer_id is now nullable for global exercises")
        
    except Exception as e:
        db.rollback()
        print(f"[MIGRATION] ❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


def main():
    print("="*60)
    print("Exercise trainer_id Nullable Migration")
    print("="*60)
    print()
    print("This will migrate the exercise table to allow trainer_id = NULL")
    print("for global exercises visible to all authenticated users.")
    print()
    
    migrate_exercise_trainer_id()
    
    print()
    print("="*60)
    print("Migration complete! You can now restart the backend.")
    print("="*60)


if __name__ == "__main__":
    main()
