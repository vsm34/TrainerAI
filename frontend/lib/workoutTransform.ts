/**
 * Transformation utilities for converting AI workout plans to workout create payloads
 */

import { AIWorkoutPlan, WorkoutBlock, BlockExercise, SetPrescription } from "./ai-schema";

export interface WorkoutCreateOptions {
  client_id?: string | null;
}

export interface WorkoutSetCreate {
  exercise_id: string;
  set_index: number;
  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_load_type: string | null;
  target_load_value: number | null;
  rpe_target: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  is_warmup: boolean;
  notes: string | null;
  prescription_text: string | null;
}

export interface WorkoutBlockCreate {
  block_type: string;
  sequence_index: number;
  notes: string | null;
  sets: WorkoutSetCreate[];
}

export interface WorkoutCreate {
  title: string;
  date: string; // YYYY-MM-DD format
  status: string;
  client_id: string | null;
  blocks: WorkoutBlockCreate[];
}

/**
 * Converts an AIWorkoutPlan into a WorkoutCreate payload.
 * 
 * @param plan - The AI-generated workout plan
 * @param options - Options including optional client_id
 * @returns A WorkoutCreate payload ready to POST to /api/v1/workouts
 */
export function aiPlanToWorkoutCreate(
  plan: AIWorkoutPlan,
  options: WorkoutCreateOptions = {}
): WorkoutCreate {
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  // Map blocks
  const blocks: WorkoutBlockCreate[] = plan.blocks.map((block, blockIndex) => {
    const sets: WorkoutSetCreate[] = [];
    let setIndex = 0;

    // For each exercise in the block
    for (const exercise of block.exercises) {
      // For each set in the exercise
      for (const set of exercise.sets) {
        // Determine prescription text and numeric targets safely
        let prescriptionText: string | null = null;
        let targetRepsMin: number | null = null;
        let targetRepsMax: number | null = null;

        if (typeof set.reps === "number") {
          targetRepsMin = set.reps;
          targetRepsMax = set.reps;
          if (set.weight !== null && set.weight !== undefined) {
            prescriptionText = `${set.reps} reps @ ${set.weight}`;
          } else {
            prescriptionText = `${set.reps} reps`;
          }
        } else if (typeof set.seconds === "number") {
          // Timed set
          prescriptionText = `${set.seconds} seconds`;
          if (set.notes) prescriptionText += ` ${set.notes}`;
        } else if (set.reps_text) {
          prescriptionText = set.reps_text;
          if (set.weight !== null && set.weight !== undefined) {
            prescriptionText += ` @ ${set.weight}`;
          }
        } else if ((set as any).prescription_text) {
          // Fallback to any existing prescription_text field
          prescriptionText = (set as any).prescription_text;
        }

        sets.push({
          exercise_id: exercise.exercise_id,
          set_index: setIndex,
          target_sets: null,
          target_reps_min: targetRepsMin,
          target_reps_max: targetRepsMax,
          target_load_type: null,
          target_load_value: (set as any).weight ?? null,
          rpe_target: null,
          rest_seconds: block.rest_seconds,
          tempo: null,
          is_warmup: false,
          notes: set.notes ?? null,
          prescription_text: prescriptionText,
        });

        setIndex++;
      }
    }

    return {
      block_type: block.block_type,
      sequence_index: blockIndex,
      notes: null,
      sets: sets,
    };
  });

  return {
    title: plan.name,
    date: dateStr,
    status: "draft",
    client_id: options.client_id ?? null,
    blocks: blocks,
  };
}

