# TrainerAI — Exercise Taxonomy Reference

This document defines the **exercise taxonomy** used across the TrainerAI backend, AI system, and frontend.  
It ensures consistent classification for all exercises and supports structured workout generation.

---

# 1. Subsets

High-level workout categories:

- **upper**
- **lower**
- **core**
- **full_body**
- **conditioning**

### Subset Rules
- **Upper** includes shoulders, chest, triceps, biceps, back  
- **Lower** includes quads, hamstrings, glutes  
- **Core** includes abs + obliques (works inside any workout)  
- **Conditioning** includes rower, bike, etc.  

---

# 2. Muscle Groups

Primary muscle groups available:

- Shoulders  
- Chest  
- Tricep  
- Bicep  
- Back  
- Quads  
- Hamstring  
- Glutes  
- Lower Abs  
- Upper Abs  
- Obliques  

### Mapping logic  
- All upper muscles → subset = **upper**  
- All lower muscles → subset = **lower**  
- Abs/obliques → subset = **core**  

---

# 3. Movement Patterns

Defines the biomechanical category of each exercise:

- **push_horizontal**  
- **push_vertical**  
- **pull_horizontal**  
- **pull_vertical**  
- **squat**  
- **hinge**  
- **lunge**  
- **core_static**  
- **core_dynamic**  
- **conditioning**  

---

# 4. Equipment Types

Possible types of equipment exercises can use:

- barbell  
- dumbbell  
- kettlebell  
- cable  
- machine  
- bodyweight  
- plate  
- band  
- trap_bar  
- other  

---

# 5. Tags

Descriptive metadata for filtering and AI reasoning:

- compound  
- isolation  
- plyometric  
- isometric  
- unilateral  
- bilateral  
- explosive  
- warmup  
- accessory  

(These are optional per exercise.)

---

# 6. Exercise Definition Shape

Backend model shape (SQLite-compatible):

```ts
Exercise {
  id: string
  trainer_id: string

  name: string
  primary_muscle_id: string
  secondary_muscles: string[]        // JSON array
  subset: string
  movement_pattern: string
  equipment: string
  tags: string[]                     // JSON array

  created_at: datetime
  updated_at: datetime
}
All exercises are trainer-scoped (no shared global library).
```

# 7. Examples of Seeded Exercises
- Upper
Bench Press (barbell/dumbbell)

Incline Bench Press

Pushups + clap pushups + holds

Pull-ups / Chin-ups / holds

Lat Pulldown

Overhead Press

Bicep Curls (barbell, dumbbell, EZ bar)

Dips

Skull Crushers

Plate Raises

Lateral Raises

Tricep Pressdowns

- Core
Planks

Side Planks

Russian Twists

Hollow Holds / Rocks

Ab Rollouts

Toe Touches

Flutter Kicks

Leg Lifts (lying/hanging)

Mountain Climbers

Palloff Press

Landmine Rotations

- Lower
Back Squat

Front Squat

RDLs

Deadlift (trap bar / straight bar)

Walking Lunges

Split Squats

Plyo Lunges

Belt Squat

- Conditioning
Rower

Assault Bike

# 8. How The AI Uses This Taxonomy
The taxonomy enables the AI to:

- Select valid exercises for each subset

- Balance push/pull/squat/hinge patterns

- Build supersets intelligently

- Match trainer preferences

- Incorporate core optionally

- Apply consistent metadata for structured generation

- Produce schema-valid AIWorkoutPlan JSON

# 9. Why This Matters
Without this taxonomy:

- The AI would pick random exercises

- Supersets wouldn’t be pattern-balanced

- Upper/lower/core workouts would be inconsistent

- Workout preview UI couldn’t categorize blocks

- Future analytics (progression, frequency tracking) would break

- The taxonomy is the foundation for the entire AI system.
