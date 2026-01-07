/**
 * Workout mapping utilities
 * Transforms between API responses and frontend types
 */

import {
  WorkoutRead,
  WorkoutCreate,
  WorkoutUpdate,
  EditableWorkout,
  EditableWorkoutBlock,
  EditableWorkoutSet,
  WorkoutBlockCreate,
  WorkoutSetCreate,
} from "@/types/workout";

// ============================================================================
// API Response -> Frontend Types
// ============================================================================

/**
 * Normalizes a WorkoutRead from the API into an EditableWorkout for UI state
 * This preserves all IDs and marks nothing as new
 * Defensive - ensures blocks is always an array
 */
export function normalizeWorkoutFromApi(apiWorkout: WorkoutRead): EditableWorkout {
  const blocks = Array.isArray(apiWorkout.blocks) ? apiWorkout.blocks : [];
  
  return {
    id: apiWorkout.id,
    trainer_id: apiWorkout.trainer_id,
    title: apiWorkout.title,
    date: apiWorkout.date,
    status: apiWorkout.status,
    notes: apiWorkout.notes,
    freeform_log: apiWorkout.freeform_log,
    client_id: apiWorkout.client_id,
    template_id: apiWorkout.template_id,
    blocks: blocks.map((block) => ({
      id: block.id,
      block_type: block.block_type,
      sequence_index: block.sequence_index,
      notes: block.notes,
      sets: Array.isArray(block.sets)
        ? block.sets.map((set) => ({
            id: set.id,
            exercise_id: set.exercise_id,
            set_index: set.set_index,
            target_sets: set.target_sets,
            target_reps_min: set.target_reps_min,
            target_reps_max: set.target_reps_max,
            target_load_type: set.target_load_type,
            target_load_value: set.target_load_value,
            rpe_target: set.rpe_target,
            rest_seconds: set.rest_seconds,
            tempo: set.tempo,
            is_warmup: set.is_warmup ?? false,
            notes: set.notes,
            prescription_text: set.prescription_text,
            _isNew: false,
          }))
        : [],
      _isNew: false,
    })),
  };
}

// ============================================================================
// Frontend Types -> API Payloads
// ============================================================================

/**
 * Converts an EditableWorkout to a WorkoutUpdate payload (metadata only)
 * This is for updating title, date, status, notes, etc. without touching the plan
 */
export function workoutToMetadataUpdate(workout: EditableWorkout): WorkoutUpdate {
  return {
    title: workout.title,
    date: workout.date,
    status: workout.status,
    notes: workout.notes ?? undefined,
    freeform_log: workout.freeform_log ?? undefined,
    client_id: workout.client_id ?? undefined,
    template_id: workout.template_id ?? undefined,
  };
}

/**
 * Converts an EditableWorkout to a full WorkoutCreate payload
 * Used for creating new workouts or when the backend supports full plan replacement
 * 
 * Important: This removes server-generated IDs and only includes create-time fields
 */
export function workoutToCreatePayload(workout: EditableWorkout): WorkoutCreate {
  const blocks: WorkoutBlockCreate[] = workout.blocks.map((block, idx) => {
    const sets: WorkoutSetCreate[] = block.sets.map((set, setIdx) => ({
      exercise_id: set.exercise_id,
      set_index: setIdx, // Reindex to ensure sequential
      target_sets: set.target_sets ?? null,
      target_reps_min: set.target_reps_min ?? null,
      target_reps_max: set.target_reps_max ?? null,
      target_load_type: set.target_load_type ?? null,
      target_load_value: set.target_load_value ?? null,
      rpe_target: set.rpe_target ?? null,
      rest_seconds: set.rest_seconds ?? null,
      tempo: set.tempo ?? null,
      is_warmup: set.is_warmup ?? false,
      notes: set.notes ?? null,
      prescription_text: set.prescription_text ?? null,
    }));

    return {
      block_type: block.block_type,
      sequence_index: idx, // Reindex to ensure sequential
      notes: block.notes ?? null,
      sets,
    };
  });

  return {
    title: workout.title,
    date: workout.date,
    status: workout.status,
    notes: workout.notes ?? null,
    freeform_log: workout.freeform_log ?? null,
    client_id: workout.client_id ?? null,
    template_id: workout.template_id ?? null,
    blocks,
  };
}

/**
 * Builds a payload for plan updates (blocks only)
 * This will be used once backend supports WorkoutPlanUpdate schema
 * For now, this is a placeholder that matches the create structure
 */
export function workoutToPlanUpdatePayload(workout: EditableWorkout): {
  blocks: WorkoutBlockCreate[];
} {
  const blocks: WorkoutBlockCreate[] = workout.blocks.map((block, idx) => {
    const sets: WorkoutSetCreate[] = block.sets.map((set, setIdx) => ({
      exercise_id: set.exercise_id,
      set_index: setIdx,
      target_sets: set.target_sets ?? null,
      target_reps_min: set.target_reps_min ?? null,
      target_reps_max: set.target_reps_max ?? null,
      target_load_type: set.target_load_type ?? null,
      target_load_value: set.target_load_value ?? null,
      rpe_target: set.rpe_target ?? null,
      rest_seconds: set.rest_seconds ?? null,
      tempo: set.tempo ?? null,
      is_warmup: set.is_warmup ?? false,
      notes: set.notes ?? null,
      prescription_text: set.prescription_text ?? null,
    }));

    return {
      block_type: block.block_type,
      sequence_index: idx,
      notes: block.notes ?? null,
      sets,
    };
  });

  return { blocks };
}

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Creates a new empty workout block with default values
 */
export function createEmptyBlock(sequenceIndex: number): EditableWorkoutBlock {
  return {
    block_type: "straight",
    sequence_index: sequenceIndex,
    notes: null,
    sets: [],
    _isNew: true,
  };
}

/**
 * Creates a new empty workout set with default values
 * setIndex parameter is optional - caller should manage set indexing
 */
export function createEmptySet(setIndex?: number): EditableWorkoutSet {
  return {
    exercise_id: "",
    set_index: setIndex ?? 0,
    target_sets: null,
    target_reps_min: 8,
    target_reps_max: 12,
    target_load_type: null,
    target_load_value: null,
    rpe_target: null,
    rest_seconds: 90,
    tempo: null,
    is_warmup: false,
    notes: null,
    prescription_text: null,
    _isNew: true,
  };
}

/**
 * Reindexes blocks to ensure sequential sequence_index values
 * Defensive - handles both array input and object with blocks property
 */
export function reindexBlocks(
  input: EditableWorkoutBlock[] | { blocks?: EditableWorkoutBlock[] }
): EditableWorkoutBlock[] {
  let blocks: EditableWorkoutBlock[] = [];
  
  // Handle both direct array and object with blocks property
  if (Array.isArray(input)) {
    blocks = input;
  } else if (input && typeof input === "object" && Array.isArray(input.blocks)) {
    blocks = input.blocks;
  }
  
  // Safe map - return empty if not an array
  if (!Array.isArray(blocks)) {
    return [];
  }
  
  return blocks.map((block, idx) => ({
    ...block,
    sequence_index: idx,
  }));
}

/**
 * Reindexes sets within blocks to ensure sequential set_index values
 * Takes an array of blocks and reindexes the sets within each block
 * Defensive against non-arrays
 */
export function reindexSets(
  input: EditableWorkoutBlock[]
): EditableWorkoutBlock[] {
  if (!Array.isArray(input)) {
    return [];
  }
  
  return input.map((block) => ({
    ...block,
    sets: Array.isArray(block.sets)
      ? block.sets.map((set, idx) => ({
          ...set,
          set_index: idx,
        }))
      : [],
  }));
}
