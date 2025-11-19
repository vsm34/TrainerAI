# TrainerAI — AI Prompt Design Specification

This document defines **how Gemini will be prompted** to generate structured workout plans using the taxonomy, schema, and behavioral rules of the TrainerAI platform.

It ensures AI outputs are:
- Predictable  
- Schema-valid  
- Trainer-scoped  
- Usable by the frontend immediately  
- Safe, consistent, and deterministic  

---

# 1. Overview

The AI system generates **full workout plans** in a JSON structure that strictly matches:

- `AIWorkoutPlan`
- `WorkoutBlock`
- `BlockExercise`
- `SetPrescription`

This enables:
- Previewing workouts
- Saving workouts as plans
- Converting into editable workouts
- Replicating CrossFit-style, hypertrophy-style, or strength-style programming

---

# 2. High-Level Requirements

The AI must:

- Use only exercises contained within **trainer-defined exercises** (passed in prompt).
- Select exercises based on:
  - primary/secondary muscle groups  
  - movement pattern  
  - equipment availability  
  - subsets (upper/lower/core)  
- Produce workouts that follow:
  - clear structure (blocks → exercises → sets)
  - constraints (e.g., number of exercises, total sets)
  - rep/weight styles (hypertrophy, strength, endurance, conditioning)
- Never hallucinate new exercises.
- Always produce **valid JSON** compatible with Pydantic schemas.

---

# 3. Input Provided to Gemini

We pass Gemini a structured prompt including:

### 3.1 Trainer context
- Focus of workout (push, legs, full-body, conditioning)
- Equipment list (dumbbells, barbell, cable, machines, bodyweight)
- Client constraints (injuries, preferences)
- Difficulty level (beginner / intermediate / advanced)

### 3.2 Exercise taxonomy
We send:

- All exercises available to that trainer
- With:
  - name  
  - id  
  - subset  
  - primary_muscle_id  
  - movement_pattern  
  - equipment  
  - tags  

### 3.3 Expected output schema
We embed the full schema definition in the prompt (see Section 4).

### 3.4 Example workouts
To anchor formatting, we include:
- 3–5 sample workouts you provide  
- In the exact JSON structure the AI must mimic  

---

# 4. Output Schema (AI → Backend)

AI outputs must match the Pydantic schema:

## 4.1 AIWorkoutPlan
```jsonc
{
  "name": "Upper Body Hypertrophy",
  "focus_subsets": ["upper"],
  "muscles_targeted": ["chest", "shoulders", "triceps", "back", "biceps"],
  "blocks": [...]
}
```
## 4.2 WorkoutBlock
```jsonc
{
  "block_type": "straight" | "superset" | "circuit",
  "rest_seconds": 90,
  "exercises": [...]
}
```
## 4.3 BlockExercise
```jsonc
{
  "exercise_id": "string-id",
  "sets": [...]
}
```
## 4.4 SetPrescription
```jsonc

{
  "reps": 10,
  "weight": null,
  "notes": "moderate tempo"
}
```

# 5. AI Prompt Template (Core)
This section contains the exact prompt structure sent from backend → Gemini.

- You are TrainerAI, an expert workout generator that creates structured workout plans
according to a strict JSON schema.

### RULES
- USE ONLY the exercises provided in the list.
- NEVER hallucinate new exercises.
- ALWAYS match the provided schema exactly.
- Names must exactly match exercise.name and exercise.id.
- Ensure each block has valid exercises and set prescriptions.
- Return ONLY JSON. No commentary.

### CONTEXT
Client goal: {client_goal}
Client notes: {client_notes}
Injuries: {injuries}
Equipment available: {equipment}
Difficulty: {difficulty}

### SCHEMA
{insert AIWorkoutPlan schema}

### AVAILABLE EXERCISES
{insert trainer's exercises}

### EXAMPLES
{insert 3–5 sample workouts}

### INSTRUCTION
Generate exactly 1 workout plan in valid JSON that follows:
- {desired_style} (e.g., push day, full-body, strength, hypertrophy)
- {exercise_count} exercises total
- {sets_per_exercise} sets each unless a circuit
- Rest: {rest_seconds}

RETURN ONLY VALID JSON.

# 6. Validation Rules
After AI returns output:

## 6.1 Structural validation
We validate using Pydantic:

AIWorkoutPlan

WorkoutBlock

BlockExercise

SetPrescription

## 6.2 Exercise validation
exercise_id must exist in trainer's exercise list

No duplicates unless intentional (e.g., two bench variations)

Blocks must have at least 1 exercise

## 6.3 Safety rules
No prescription exceeding safe rep ranges (e.g., “500 reps”)

No contradictory instructions (e.g., “heavy weight, 30 reps”)

No exercises that contradict injuries

# 7. Error Handling (AI-side)
If AI produces invalid output:

We retry with “fix invalid JSON”

If still invalid, we show a frontend warning and allow user to retry manually

# 8. Examples of Expected Output
Example: Push Day Hypertrophy

```json
{
  "name": "Push Day Hypertrophy",
  "focus_subsets": ["upper"],
  "muscles_targeted": ["chest", "shoulders", "triceps"],
  "blocks": [
    {
      "block_type": "straight",
      "rest_seconds": 120,
      "exercises": [
        {
          "exercise_id": "bench_press_id",
          "sets": [
            {"reps": 10, "weight": null, "notes": "RPE 7"},
            {"reps": 10, "weight": null},
            {"reps": 8, "weight": null}
          ]
        }
      ]
    }
  ]
}
```

# 9. Future Extensions
AI can generate progression plans

AI can generate weekly splits

AI can generate beginner → intermediate → advanced templates

AI can rewrite workouts into:

low-equipment options

time-efficient versions

mobility-focused adaptations

AI can adjust based on RPE or velocity

# 10. Why This Prompt Architecture Works
It constrains Gemini to deterministic outputs

Prevents hallucination

Keeps schema consistent

Allows trainer-specific exercise catalogs

Provides a modular system for future features

# 11. Summary
TrainerAI’s AI layer is built on top of:

A strict JSON schema

A complete taxonomy system

Trainer-scoped exercise lists

Example-guided structured prompting

Full post-processing validation

This file documents how the backend will reliably integrate Gemini to produce structured, valid, safe workouts.