/**
 * AI Workout Schema
 *
 * This module defines TypeScript types for AI-generated workout plans.
 * These types mirror the Pydantic models in backend/app/schemas/ai_workout.py
 * and the JSON output structure described in docs/ai_prompt_design.md.
 *
 * All types are designed to match the AI output structure that can later be
 * converted into the standard Workout models.
 */

// Enum-like types matching taxonomy_reference.md
export type SubsetType = "upper" | "lower" | "core" | "full_body" | "conditioning";
export type BlockType = "straight" | "superset" | "circuit";

/**
 * Represents a single set prescription within a workout exercise.
 * Used by the AI to specify reps, weight, and optional notes for each set.
 */
export interface SetPrescription {
  reps?: number | null;
  seconds?: number | null;
  reps_text?: string | null;
  weight?: number | null;
  notes?: string | null;
}

/**
 * Represents an exercise within a workout block.
 * References an exercise by ID and contains a list of set prescriptions.
 */
export interface BlockExercise {
  exercise_id: string;
  sets: SetPrescription[];
}

/**
 * Represents a block of exercises in a workout plan.
 * Can be a straight set block, superset, or circuit.
 */
export interface WorkoutBlock {
  block_type: BlockType;
  rest_seconds: number;
  exercises: BlockExercise[];
}

/**
 * Top-level schema for an AI-generated workout plan.
 * Contains the workout name, target subsets/muscles, and structured blocks.
 * This mirrors the JSON output structure expected from Gemini as described
 * in docs/ai_prompt_design.md.
 */
export interface AIWorkoutPlan {
  name: string;
  focus_subsets: SubsetType[];
  muscles_targeted: string[]; // Muscle group names from taxonomy
  blocks: WorkoutBlock[];
}




