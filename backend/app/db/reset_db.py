"""
Database reset script for development.

WARNING: This will DELETE ALL DATA and recreate the database from scratch.
Only use this in development!

Usage:
    python -m app.db.reset_db
"""

import os
import sys
from pathlib import Path

from app.db.session import engine
from app.db.base import Base
from app.core.config import settings


def reset_database():
    """
    Delete and recreate the database from scratch.
    WARNING: This deletes ALL data!
    """
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_file = Path(db_path)
    
    print("="*60)
    print("Database Reset (DEVELOPMENT ONLY)")
    print("="*60)
    print()
    print(f"Database file: {db_file.absolute()}")
    print()
    
    if db_file.exists():
        print(f"⚠️  WARNING: This will DELETE the existing database!")
        print(f"⚠️  ALL DATA WILL BE LOST!")
        print()
        response = input("Type 'RESET' to confirm: ")
        
        if response != "RESET":
            print("Aborted.")
            sys.exit(0)
        
        try:
            os.remove(db_file)
            print(f"✅ Deleted {db_file}")
        except Exception as e:
            print(f"❌ Failed to delete database: {e}")
            sys.exit(1)
    else:
        print(f"Database file does not exist yet. Will create new one.")
    
    print()
    print("Creating new database with updated schema...")
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database created successfully!")
        print()
        print("Schema includes:")
        for table_name in Base.metadata.tables.keys():
            print(f"  - {table_name}")
        print()
        print("="*60)
        print("Database reset complete!")
        print("Next steps:")
        print("1. Restart the backend to seed global exercises")
        print("2. Create Firebase users and trainers")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Failed to create database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    reset_database()
