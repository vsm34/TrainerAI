/**
 * Workout type definitions matching backend schemas
 * These types mirror backend/app/schemas/workout.py and backend/app/models/workout.py
 */

// ============================================================================
// WorkoutSet types
// ============================================================================

export interface WorkoutSetCreate {
  exercise_id: string;
  set_index: number;
  target_sets?: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_load_type?: string | null;
  target_load_value?: number | null;
  rpe_target?: number | null;
  rest_seconds?: number | null;
  tempo?: string | null;
  is_warmup?: boolean;
  notes?: string | null;
  prescription_text?: string | null;
}

export interface WorkoutSetRead {
  id: string;
  workout_block_id: string;
  exercise_id: string;
  set_index: number;
  target_sets?: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_load_type?: string | null;
  target_load_value?: number | null;
  rpe_target?: number | null;
  rest_seconds?: number | null;
  tempo?: string | null;
  is_warmup: boolean;
  notes?: string | null;
  prescription_text?: string | null;
}

// ============================================================================
// WorkoutBlock types
// ============================================================================

export interface WorkoutBlockCreate {
  block_type: string;
  sequence_index: number;
  notes?: string | null;
  sets: WorkoutSetCreate[];
}

export interface WorkoutBlockRead {
  id: string;
  workout_id: string;
  block_type: string;
  sequence_index: number;
  notes?: string | null;
  sets: WorkoutSetRead[];
}

// ============================================================================
// Workout types
// ============================================================================

export interface WorkoutBase {
  title: string;
  date: string; // ISO date string (YYYY-MM-DD from backend, or full ISO datetime)
  status: string; // "draft" | "planned" | "in_progress" | "completed"
  notes?: string | null;
  freeform_log?: string | null;
  client_id?: string | null;
  template_id?: string | null;
}

export interface WorkoutCreate extends WorkoutBase {
  blocks?: WorkoutBlockCreate[];
}

export interface WorkoutUpdate {
  title?: string;
  date?: string;
  status?: string;
  notes?: string;
  freeform_log?: string;
  client_id?: string;
  template_id?: string;
}

export interface WorkoutRead extends WorkoutBase {
  id: string;
  trainer_id: string;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  blocks: WorkoutBlockRead[];
}

// ============================================================================
// UI-specific types for editor state
// ============================================================================

/**
 * Editable workout set for UI state management
 * Includes both server fields and local UI state
 */
export interface EditableWorkoutSet extends WorkoutSetCreate {
  // Optional id for existing sets (used when updating)
  id?: string;
  // UI-only field to track if this is a new set
  _isNew?: boolean;
}

/**
 * Editable workout block for UI state management
 */
export interface EditableWorkoutBlock {
  // Optional id for existing blocks (used when updating)
  id?: string;
  block_type: string;
  sequence_index: number;
  notes?: string | null;
  sets: EditableWorkoutSet[];
  // UI-only field to track if this is a new block
  _isNew?: boolean;
}

/**
 * Full editable workout for UI state management
 */
export interface EditableWorkout extends WorkoutBase {
  id: string;
  trainer_id: string;
  blocks: EditableWorkoutBlock[];
}
