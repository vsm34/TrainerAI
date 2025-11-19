# TrainerAI — Database Schema Documentation

This document defines the full SQLite schema used by the TrainerAI backend.  
All identifiers are **string-based UUIDs**, all complex fields are **JSON**, and all records are **trainer-scoped**.

---

# 1. Overview

The database contains the following core tables:

- trainer
- client
- exercise
- workout
- workout_block
- workout_set
- template_workout (future use)
- progression (future use)

All tables use:

- `id: String(36)` as primary key  
- `created_at` / `updated_at` timestamps  
- SQLAlchemy 2.0 `Mapped[…]` pattern  
- JSON fields instead of Postgres-specific types  

---

# 2. trainer Table

Represents a logged-in trainer (created automatically on first API request).

### Columns
- **id** — String(36), primary key  
- **firebase_uid** — String, unique  
- **email** — String, nullable  
- **name** — String, nullable  
- **created_at** — DateTime  
- **updated_at** — DateTime  

### Relationships
- `clients` — one-to-many  
- `exercises` — one-to-many  
- `workouts` — one-to-many  

### Notes
- Trainers are created implicitly using Firebase ID token  
- No password stored (Firebase handles auth)

---

# 3. client Table

Represents an individual client belonging to a trainer.

### Columns
- **id** — String(36), primary key  
- **trainer_id** — FK → trainer.id  
- **name** — String  
- **email** — String, nullable  
- **notes** — Text, nullable  
- **injury_flags** — JSON array of strings (SQLite-friendly)  
- **preferences_json** — JSON (training preferences)  
- **created_at** — DateTime  
- **updated_at** — DateTime  

### Relationships
- `trainer` — many-to-one  
- `workouts` — one-to-many  

---

# 4. exercise Table

Represents a trainer-defined exercise. (Seeded exercises optional later.)

### Columns
- **id** — String(36)  
- **trainer_id** — FK → trainer.id  
- **name** — String  
- **primary_muscle_id** — String  
- **secondary_muscles** — JSON array of strings  
- **subset** — String (upper, lower, core, full_body)  
- **movement_pattern** — String  
- **equipment** — String  
- **tags** — JSON array of strings  
- **created_at** — DateTime  
- **updated_at** — DateTime  

### Notes
- No ARRAY or JSONB (SQLite compatible)  
- All filtering done via simple WHERE clauses or LIKE  

---

# 5. workout Table

High-level workout container.

### Columns
- **id** — String(36)  
- **trainer_id** — FK → trainer.id  
- **client_id** — FK → client.id, nullable  
- **name** — String  
- **notes** — Text, nullable  
- **created_at** — DateTime  
- **updated_at** — DateTime  

### Relationships
- `blocks` — one-to-many  
- `trainer` — many-to-one  
- `client` — many-to-one  

---

# 6. workout_block Table

Represents a section of a workout (ex: superset, straight sets, circuit).

### Columns
- **id** — String(36)  
- **workout_id** — FK → workout.id  
- **block_type** — String (straight, superset, circuit, etc.)  
- **block_index** — Integer  
- **rest_seconds** — Integer  
- **created_at** — DateTime  
- **updated_at** — DateTime  

### Relationships
- `sets` — one-to-many  
- `workout` — many-to-one  

---

# 7. workout_set Table

Represents individual sets inside a block.

### Columns
- **id** — String(36)  
- **block_id** — FK → workout_block.id  
- **exercise_id** — FK → exercise.id  
- **set_index** — Integer  
- **reps** — Integer  
- **weight** — Numeric (nullable, supports plates/dumbbells)  
- **notes** — Text, nullable  
- **created_at** — DateTime  
- **updated_at** — DateTime  

---

# 8. template_workout Table (Future Feature)

This will allow reusable workout templates (Upper A, Lower B, Push Day, etc.).

### Columns
- **id** — String(36)  
- **trainer_id** — FK → trainer.id  
- **name** — String  
- **tags** — JSON array (ex: ["upper", "push"])  
- **structure_json** — JSON describing blocks + sets  
- **created_at** — DateTime  
- **updated_at** — DateTime  

(This feature is planned, not active yet.)

---

# 9. progression Table (Future Feature)

This will track weight, reps, and performance over time.

### Columns
- **id** — String(36)  
- **trainer_id** — FK → trainer.id  
- **client_id** — FK → client.id  
- **exercise_id** — FK → exercise.id  
- **params_json** — JSON with progression data  
- **created_at** — DateTime  
- **updated_at** — DateTime  

Not active, but schema exists.

---

# 10. Trainer Scoping Rules (Critical)

Every object is tied to a trainer:

- Clients → `trainer_id`  
- Exercises → `trainer_id`  
- Workouts → `trainer_id`  
- Blocks → workout → trainer  
- Sets → block → workout → trainer  

### API Server Behavior
- If a trainer does not exist for a Firebase UID → it auto-creates  
- All CRUD filters by trainer_id  
- Trainer A can never access Trainer B's data  

This rule is fundamental to security and multi-tenancy.

---

# 11. SQLite Compatibility Rules

We enforce:

- No ARRAY → use JSON  
- No JSONB → use JSON  
- No native UUID → use String(36)  
- No Postgres-only operators → use simple logic  
- Case-insensitive search built using `func.lower()`  

---

# 12. Schema Migration Strategy

Since schema changes frequently during development:

- SQLite file should be **deleted** manually when needed  
- Postgres migration scripts will be added later (Alembic)

---

# 13. Diagram (Text-Based)

- trainer (1) ──── (∞) client
- trainer (1) ──── (∞) exercise
- trainer (1) ──── (∞) workout ──── (∞) workout_block ──── (∞) workout_set

# 14. Why This Schema Works

- 100% SQLite compatible  
- 100% ready for Postgres in production  
- Clean relational structure  
- Trainer scoping built into all tables  
- Flexible JSON fields for tags, secondary muscles, preferences  
- Supports AI-generated structured workouts  
- Matches Next.js frontend expectations  