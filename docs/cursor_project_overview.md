# 📘 TrainerAI – Cursor Project Overviewsure 

Last updated: 2025-11-18

This document gives Cursor full context and instructions for how to work inside the TrainerAI project.
Every Cursor session should load this file first.

# 1. Project Summary

TrainerAI is a full-stack trainer platform designed for:

Client management

Exercise management

Workout building & logging

AI-generated workouts using Gemini

Secure trainer-scoped data separation

Tech stack:

Frontend

Next.js 14 (App Router)

Tailwind + shadcn

React Query

React Hook Form

TypeScript

Firebase Authentication

Backend

FastAPI

SQLAlchemy 2.0

SQLite (for dev) — later Postgres

Firebase Admin server-side verification

AI

Gemini API (structured JSON schema)

Taxonomy-driven workout logic

Trainer-specific workout style learning

# 2. Architectural Rules (VERY IMPORTANT)
2.1. ID Rules

All IDs are string UUIDs (str(uuid4()))

ORM columns use String(36)

No UUID, no PG_UUID, no Postgres-dialects

All schemas use str for IDs

2.2. SQLite Compatibility

No ARRAY

No JSONB

Use JSON for lists, tags, metadata

Avoid Postgres-only features

2.3. Trainer Scoping

Everything belongs to the trainer:

Tables include trainer_id

All queries filter by trainer_id

No global exercises

No shared templates

No cross-trainer visibility

2.4. Authentication Rules

Frontend uses Firebase Auth

Backend verifies using Firebase Admin

Never log ID tokens

DebugTokenButton removed

2.5. Model–Schema Match

SQLAlchemy models and Pydantic schemas must align exactly

Same fields

Same nullability

Same str/JSON/date types

2.6. DB Creation

Database is auto-created using:

Base.metadata.create_all(bind=engine)


No Alembic for now

# 3. Frontend Conventions
3.1 Authentication

Use AuthContext and ProtectedRoute

No unauthenticated page access except /login

3.2 API Client

Axios instance with interceptor:

Automatically attaches Firebase token

Refreshes token if needed

3.3 UI Structure

AppShell layout

Sidebar navigation

Page folders in /app/*

React Query for all data fetching

React Hook Form for all forms

3.4 Do Not

Print Firebase tokens

Store sensitive data in localStorage

Hardcode backend URL (always .env.local)

# 4. Database Models (Current Status Overview)
Model	Status	Notes
Trainer	✔ done	auto-created on token verify
Client	✔ done	CRUD functional
Exercise	✔ done	CRUD functional
Workout	⚠️ partial	CRUD created but needs enhancements
Templates	❌ not implemented	part of Chat C/D
Progression	✔ basic model	not used yet
Taxonomy	✔ complete	60 exercises, movements, subsets
# 5. Completed Features
Backend

Firebase Admin verification

Trainer auto-creation

Full CRUD: Clients

Full CRUD: Exercises

SQLite-safe models

CORS working

No token logging

Frontend

Login/logout

Protected routes

Clients page

Exercises page

Workouts basic list

Axios token interceptor

Token logging removed

AI

Full exercise taxonomy

Pydantic AIWorkoutPlan schema

Muscle/subset mapping

Movement patterns

# 6. Remaining Work (Future Chat Tasks)

This governs future Cursor work.

6.1 Workout CRUD (Backend + Frontend)

Improve models

Add sets/reps/weight structure

Add freeform logs

Add workout detail page

Add workout editing

Add delete/duplicate features

6.2 Templates

Template model

Template CRUD

Template builder UI

Convert template → workout

6.3 AI Integration

Gemini prompt engineering

Structured JSON outputs

Validation rules

Insert trainer sample workouts

AI workout generator (frontend)

Add caching + rate limit

6.4 UI Polish

Loading & errors

Better exercise filtering

Reusable form components

Search

Equipment/movement filters

6.5 Deployment

Render backend

Vercel frontend

Environment setup

Optional migration to Postgres

# 7. Developer Commands
Backend
cd backend
uvicorn app.main:app --reload

Frontend
cd frontend
npm install
npm run dev

Rebuild DB
rm backend/trainerai.db

# 8. Environment Variables
Backend .env
DATABASE_URL=sqlite:///./trainerai.db
FIREBASE_CREDENTIALS_FILE=backend/firebase-adminsdk.json

Frontend .env.local

(No quotes)

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# 9. Cursor Usage Instructions

When starting a new session in Cursor, say:

Load context from docs/cursor_project_overview.md.
Follow all architectural rules (string IDs, SQLite compatibility, trainer-scoping).
Maintain model/schema consistency.
Assume Firebase authentication is required for all API calls.

Then state your request.

# 📁 Documentation Files

The project includes three important documentation files that Cursor should read before modifying related areas:

## 1. backend/docs/taxonomy_reference.md

Defines the exercise taxonomy, muscle groups, subsets, movement patterns, and tags.

Cursor should reference this when modifying:

exercise classification

AI-generation logic related to subsets/muscle groups

filtering or search logic

## 2. backend/docs/db_schema.md

Contains the current database schema for SQLite + SQLAlchemy models.

Cursor must consult this before:

altering models

updating CRUD routers

writing migrations (later)

modifying schema-related Pydantic models

## 3. backend/docs/ai_prompt_design.md

Defines the prompt format, schema constraints, and behavioral rules for Gemini.

Cursor should reference this when:

building AI endpoints

shaping Gemini input/output

validating AI responses

building the AI workout generator UX

# 10. Project Vision

TrainerAI should enable trainers to:

Manage clients

Build structured workouts

Log workouts with sets/reps/weight

Create templates

Generate AI workouts

Tailor workouts to preferences, equipment, injuries

Deploy the platform publicly