"""
CLI script to seed default exercises for a trainer.

Usage:
    # Normal server mode:
    uvicorn app.main:app --reload

    # Or seed from command line:
    python -m app.cli.seed_exercises --trainer-id <trainer_uuid>
"""

import argparse
import sys

from app.db.session import SessionLocal
from app.models.trainer import Trainer
from app.services.exercise_seed import seed_default_exercises_for_trainer


def main():
    parser = argparse.ArgumentParser(
        description="Seed default exercises for a trainer"
    )
    parser.add_argument(
        "--trainer-id",
        type=str,
        required=True,
        help="Trainer UUID to seed exercises for",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        # Verify trainer exists
        from sqlalchemy import select
        
        result = db.execute(
            select(Trainer).where(Trainer.id == args.trainer_id)
        )
        trainer = result.scalar_one_or_none()
        
        if not trainer:
            print(f"Error: Trainer with ID {args.trainer_id} not found")
            sys.exit(1)

        # Seed exercises
        created, skipped = seed_default_exercises_for_trainer(db, args.trainer_id)
        
        print(f"Seeding complete!")
        print(f"  Created: {created}")
        print(f"  Skipped: {skipped}")
        print(f"  Total: {created + skipped}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

