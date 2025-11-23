# TrainerAI Backend (FastAPI)

This is the FastAPI backend for TrainerAI.
The main application is in `app/main.py`.  
Database and API routes will be added later.

## Database Setup

### Resetting DB after muscle_group_id removal

We removed the `muscle_group_id` column from the `muscle` table.

In local dev, you must reset the SQLite DB once:

1. Stop the backend server.
2. Delete the SQLite DB file: `backend/trainerai.db` (or whatever file your `DATABASE_URL` points to).
3. Restart the backend (tables will be auto-created on startup via `Base.metadata.create_all()`).
4. Call `POST /api/v1/exercises/seed-defaults` to populate default exercises.

