// frontend/app/workouts/[id]/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { parseISO, format } from "date-fns";
import { WorkoutPlanPreview } from "@/components/WorkoutPlanPreview";
import { useAuth } from "@/context/AuthContext";
import {
  WorkoutRead,
  WorkoutUpdate as WorkoutUpdatePayload,
  EditableWorkout,
  EditableWorkoutBlock,
  EditableWorkoutSet,
} from "@/types/workout";
import {
  normalizeWorkoutFromApi,
  workoutToMetadataUpdate,
  workoutToPlanUpdatePayload,
  createEmptyBlock,
  createEmptySet,
  reindexBlocks,
  reindexSets,
} from "@/lib/workoutMappers";

type Exercise = {
  id: string;
  name: string;
  equipment?: string | null;
  movement_pattern?: string | null;
};

async function fetchWorkout(id: string): Promise<WorkoutRead> {
  const res = await api.get(`/api/v1/workouts/${id}`);
  return res.data;
}

async function fetchExercises(): Promise<Exercise[]> {
  try {
    const res = await api.get("/api/v1/exercises/");
    const data = res.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === "object" && Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw error;
    }
    return [];
  }
}

async function deleteWorkout(id: string): Promise<void> {
  await api.delete(`/api/v1/workouts/${id}`);
}

// Helper to convert ISO datetime to YYYY-MM-DD
const formatWorkoutDate = (value?: string | null) => {
  if (!value) return "";
  // Interpret as a local calendar date and print as MM/DD/YYYY
  return format(parseISO(value), "MM/dd/yyyy");
};

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editableWorkout, setEditableWorkout] = useState<EditableWorkout | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["workout", id],
    queryFn: () => fetchWorkout(id),
    enabled: !!id && !authLoading && !!user,
  });

  const { data: exercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
    enabled: !authLoading && !!user,
  });

  // Build lookup map from exercise_id -> exercise object
  const exerciseMap = useMemo(() => {
    if (!exercises) return new Map<string, Exercise>();
    const map = new Map<string, Exercise>();
    exercises.forEach((ex) => {
      map.set(ex.id, ex);
    });
    return map;
  }, [exercises]);

  const { register, handleSubmit, reset } = useForm<WorkoutUpdatePayload>();

  // Helper to convert ISO datetime to YYYY-MM-DD
  function isoToDateOnly(iso?: string | null): string {
    if (!iso) return "";
    // iso is like "2025-11-20T04:08:13.395Z" or similar
    return iso.split("T")[0] ?? "";
  }

  useEffect(() => {
    if (data) {
      reset({
        notes: data.notes ?? "",
        freeform_log: data.freeform_log ?? "",
        status: data.status ?? "planned",
        date: isoToDateOnly(data.date),
      });
      // Initialize editable plan state
      setEditableWorkout(normalizeWorkoutFromApi(data));
      setIsEditingPlan(false);
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (payload: WorkoutUpdatePayload) =>
      api.put(`/api/v1/workouts/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", id] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.push("/workouts");
    },
  });

  const planMutation = useMutation({
    mutationFn: (payload: any) =>
      api.put(`/api/v1/workouts/${id}`, payload),
    onSuccess: (response: { data: WorkoutRead }) => {
      // Extract workout from axios response
      const updatedWorkout = response.data;
      
      // Update React Query cache with fresh data
      queryClient.setQueryData(["workout", id], updatedWorkout);
      
      // Re-normalize from response into editable state
      setEditableWorkout(normalizeWorkoutFromApi(updatedWorkout));
      
      // Exit edit mode
      setIsEditingPlan(false);
      
      // Show success message
      setMessage({ type: "success", text: "Workout plan updated." });
      setTimeout(() => setMessage(null), 5000);
    },
    onError: (error: any) => {
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update workout plan.";
      setMessage({ type: "error", text: errorMsg });
      // Stay in edit mode on error so user can retry
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkout(id!),
    onSuccess: () => {
      // Invalidate queries first
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout", id] });
      // Remove the workout from cache to prevent navigation to it
      queryClient.removeQueries({ queryKey: ["workout", id] });
      // Navigate away immediately
      router.push("/workouts");
    },
    onError: (error: any) => {
      // Log detailed error information
      console.error("Delete workout error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        stack: error.stack,
      });
      
      const errorMsg =
        error.response?.data?.detail || 
        error.response?.data?.message ||
        error.message || 
        `Failed to delete workout. Status: ${error.response?.status || "unknown"}`;
      setMessage({ type: "error", text: errorMsg });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  const handleDelete = () => {
    if (data && confirm(`Delete "${data.title}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const onSubmit = (values: WorkoutUpdatePayload) => {
    const payload: any = {
      status: values.status,
      notes: values.notes,
      freeform_log: values.freeform_log,
    };

    if (values.date) {
      // Send YYYY-MM-DD string; backend will convert to datetime
      payload.date = values.date;
    }

    mutation.mutate(payload);
  };

  // Plan editor handlers
  const handleEditPlan = () => {
    setIsEditingPlan(true);
  };

  const handleCancelEdit = () => {
    // Get fresh data from query cache (not local state reference)
    const cachedData = queryClient.getQueryData<WorkoutRead>(["workout", id]);
    if (cachedData) {
      // Re-normalize from cache to ensure fresh state
      setEditableWorkout(normalizeWorkoutFromApi(cachedData));
      setIsEditingPlan(false);
      // Clear any error messages
      setMessage(null);
    }
  };

  const handleAddBlock = () => {
    if (!editableWorkout) return;
    const newBlock = createEmptyBlock(editableWorkout.blocks.length);
    const updated = {
      ...editableWorkout,
      blocks: [...editableWorkout.blocks, newBlock],
    };
    setEditableWorkout({
      ...editableWorkout,
      blocks: reindexBlocks(updated.blocks),
    });
  };

  const handleRemoveBlock = (blockIndex: number) => {
    if (!editableWorkout) return;
    const blocks = editableWorkout.blocks.filter((_, i) => i !== blockIndex);
    setEditableWorkout({
      ...editableWorkout,
      blocks: reindexBlocks(blocks),
    });
  };

  const handleMoveBlockUp = (blockIndex: number) => {
    if (!editableWorkout || blockIndex === 0) return;
    const blocks = [...editableWorkout.blocks];
    [blocks[blockIndex - 1], blocks[blockIndex]] = [
      blocks[blockIndex],
      blocks[blockIndex - 1],
    ];
    setEditableWorkout({
      ...editableWorkout,
      blocks: reindexBlocks(blocks),
    });
  };

  const handleMoveBlockDown = (blockIndex: number) => {
    if (!editableWorkout || blockIndex >= editableWorkout.blocks.length - 1)
      return;
    const blocks = [...editableWorkout.blocks];
    [blocks[blockIndex], blocks[blockIndex + 1]] = [
      blocks[blockIndex + 1],
      blocks[blockIndex],
    ];
    setEditableWorkout({
      ...editableWorkout,
      blocks: reindexBlocks(blocks),
    });
  };

  const handleAddSet = (blockIndex: number) => {
    if (!editableWorkout) return;
    const blocks = [...editableWorkout.blocks];
    const currentBlock = blocks[blockIndex];
    if (!currentBlock) return;
    
    const newSet = createEmptySet(currentBlock.sets.length);
    blocks[blockIndex] = {
      ...currentBlock,
      sets: [...currentBlock.sets, newSet],
    };
    
    // Reindex all sets in all blocks to ensure consistency
    const reindexed = reindexSets(blocks);
    setEditableWorkout({
      ...editableWorkout,
      blocks: reindexed,
    });
  };

  const handleRemoveSet = (blockIndex: number, setIndex: number) => {
    if (!editableWorkout) return;
    const blocks = [...editableWorkout.blocks];
    const currentBlock = blocks[blockIndex];
    if (!currentBlock) return;
    
    blocks[blockIndex] = {
      ...currentBlock,
      sets: currentBlock.sets.filter((_, i) => i !== setIndex),
    };
    
    // Reindex all sets in all blocks
    const reindexed = reindexSets(blocks);
    setEditableWorkout({
      ...editableWorkout,
      blocks: reindexed,
    });
  };

  const handleUpdateSet = (
    blockIndex: number,
    setIndex: number,
    updates: Partial<EditableWorkoutSet>
  ) => {
    if (!editableWorkout) return;
    const blocks = [...editableWorkout.blocks];
    blocks[blockIndex] = {
      ...blocks[blockIndex],
      sets: blocks[blockIndex].sets.map((s, i) =>
        i === setIndex ? { ...s, ...updates } : s
      ),
    };
    setEditableWorkout({ ...editableWorkout, blocks });
  };

  const handleUpdateBlock = (
    blockIndex: number,
    updates: Partial<EditableWorkoutBlock>
  ) => {
    if (!editableWorkout) return;
    const blocks = [...editableWorkout.blocks];
    blocks[blockIndex] = { ...blocks[blockIndex], ...updates };
    setEditableWorkout({ ...editableWorkout, blocks });
  };

  const handleSavePlan = () => {
    if (!editableWorkout) return;
    if (planMutation.isPending) return; // Prevent double-submit
    
    const payload = workoutToPlanUpdatePayload(editableWorkout);
    planMutation.mutate(payload);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        {isLoading || !data || !editableWorkout ? (
          <p className="text-sm text-slate-400">Loading workout...</p>
        ) : error ? (
          <div className="rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error.response?.status === 404
              ? "Workout not found."
              : error.message || "Failed to load workout. Please try again."}
          </div>
        ) : (
          <div className="space-y-4">
            {message && (
              <div
                className={`rounded border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-green-800 bg-green-950 text-green-200"
                    : "border-red-800 bg-red-950 text-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{data.title}</h2>
                <p className="text-sm text-slate-400">
                  {formatWorkoutDate(data.date)} ·{" "}
                  {data.status ?? "planned"}
                </p>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>

            {/* Workout Plan Section */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-200">
                  Workout Plan
                </h3>
                {isEditingPlan ? (
                  <button
                    onClick={handleAddBlock}
                    disabled={planMutation.isPending}
                    className="rounded bg-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add Block
                  </button>
                ) : (
                  <button
                    onClick={handleEditPlan}
                    className="rounded bg-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-600"
                  >
                    Edit Plan
                  </button>
                )}
              </div>

              {!isEditingPlan ? (
                editableWorkout.blocks && editableWorkout.blocks.length > 0 ? (
                  <WorkoutPlanPreview
                    blocks={editableWorkout.blocks}
                    exerciseMap={exerciseMap}
                  />
                ) : (
                  <div className="rounded border border-slate-700 bg-slate-900 p-4 text-xs text-slate-300">
                    <p className="mb-2">No blocks yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        handleEditPlan();
                        handleAddBlock();
                      }}
                      className="rounded bg-slate-700 px-3 py-1 font-medium hover:bg-slate-600"
                    >
                      + Add Block
                    </button>
                  </div>
                )
              ) : (
                <PlanEditor
                  editable={editableWorkout}
                  exercises={exercises || []}
                  onAddBlock={handleAddBlock}
                  onRemoveBlock={handleRemoveBlock}
                  onMoveBlockUp={handleMoveBlockUp}
                  onMoveBlockDown={handleMoveBlockDown}
                  onAddSet={handleAddSet}
                  onRemoveSet={handleRemoveSet}
                  onUpdateSet={handleUpdateSet}
                  onUpdateBlock={handleUpdateBlock}
                  isSaving={planMutation.isPending}
                  onSave={handleSavePlan}
                  onCancel={handleCancelEdit}
                  exerciseMap={exerciseMap}
                />
              )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  {...register("date")}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Status
                </label>
                <select
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  {...register("status")}
                >
                  <option value="draft">Draft</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Notes
                </label>
                <textarea
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  rows={3}
                  {...register("notes")}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Freeform log (sets, reps, weights, thoughts, etc.)
                </label>
                <textarea
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  rows={8}
                  {...register("freeform_log")}
                />
              </div>

              <button
                type="submit"
                disabled={mutation.isPending || isEditingPlan}
                className="rounded bg-blue-600 px-4 py-2 text-xs font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </form>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

// Plan Editor Component
interface PlanEditorProps {
  editable: EditableWorkout;
  exercises: Exercise[];
  onAddBlock: () => void;
  onRemoveBlock: (blockIndex: number) => void;
  onMoveBlockUp: (blockIndex: number) => void;
  onMoveBlockDown: (blockIndex: number) => void;
  onAddSet: (blockIndex: number) => void;
  onRemoveSet: (blockIndex: number, setIndex: number) => void;
  onUpdateSet: (
    blockIndex: number,
    setIndex: number,
    updates: Partial<EditableWorkoutSet>
  ) => void;
  onUpdateBlock: (blockIndex: number, updates: Partial<EditableWorkoutBlock>) => void;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  exerciseMap: Map<string, Exercise>;
}

function PlanEditor({
  editable,
  exercises,
  onAddBlock,
  onRemoveBlock,
  onMoveBlockUp,
  onMoveBlockDown,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onUpdateBlock,
  isSaving,
  onSave,
  onCancel,
  exerciseMap,
}: PlanEditorProps) {
  return (
    <div className="space-y-4 rounded border border-slate-700 bg-slate-900 p-4">
      {editable.blocks.length === 0 && (
        <div className="rounded border border-slate-700 bg-slate-900 p-6 text-center text-xs text-slate-300">
          <p className="mb-3">No blocks yet.</p>
          <button
            type="button"
            onClick={onAddBlock}
            disabled={isSaving}
            className="rounded bg-slate-700 px-4 py-2 font-medium hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Block
          </button>
        </div>
      )}
      {editable.blocks.map((block, blockIndex) => (
        <div key={block.id || blockIndex} className="space-y-3 rounded bg-slate-800 p-3">
          {/* Block Header */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={block.block_type}
              onChange={(e) =>
                onUpdateBlock(blockIndex, { block_type: e.target.value })
              }
              placeholder="Block type (e.g., straight, superset)"
              className="flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onMoveBlockUp(blockIndex)}
                disabled={blockIndex === 0}
                className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onMoveBlockDown(blockIndex)}
                disabled={blockIndex >= editable.blocks.length - 1}
                className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onRemoveBlock(blockIndex)}
                className="rounded bg-red-700 px-2 py-1 text-xs hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Block Notes */}
          <input
            type="text"
            value={block.notes || ""}
            onChange={(e) => onUpdateBlock(blockIndex, { notes: e.target.value })}
            placeholder="Block notes (optional)"
            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
          />

          {/* Sets in Block */}
          <div className="space-y-2 pl-2">
            {block.sets.map((set, setIndex) => (
              <div
                key={set.id || setIndex}
                className="space-y-2 rounded border border-slate-700 bg-slate-850 p-2"
              >
                {/* Exercise Dropdown */}
                <div className="flex gap-2">
                  <select
                    value={set.exercise_id}
                    onChange={(e) =>
                      onUpdateSet(blockIndex, setIndex, {
                        exercise_id: e.target.value,
                      })
                    }
                    className="flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
                  >
                    <option value="">-- Select Exercise --</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveSet(blockIndex, setIndex)}
                    className="rounded bg-red-700 px-2 py-1 text-xs hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>

                {/* Set Fields */}
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  <input
                    type="number"
                    value={set.target_sets || ""}
                    onChange={(e) =>
                      onUpdateSet(blockIndex, setIndex, {
                        target_sets: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Sets"
                    className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
                  />
                  <input
                    type="number"
                    value={set.target_reps_min || ""}
                    onChange={(e) =>
                      onUpdateSet(blockIndex, setIndex, {
                        target_reps_min: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Min reps"
                    className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
                  />
                  <input
                    type="number"
                    value={set.target_reps_max || ""}
                    onChange={(e) =>
                      onUpdateSet(blockIndex, setIndex, {
                        target_reps_max: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Max reps"
                    className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={set.target_load_value || ""}
                    onChange={(e) =>
                      onUpdateSet(blockIndex, setIndex, {
                        target_load_value: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Load (lbs/kg)"
                    className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
                  />
                  <input
                    type="number"
                    value={set.rest_seconds || ""}
                    onChange={(e) =>
                      onUpdateSet(blockIndex, setIndex, {
                        rest_seconds: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Rest (sec)"
                    className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
                  />
                  <input
                    type="text"
                    value={set.tempo || ""}
                    onChange={(e) =>
                      onUpdateSet(blockIndex, setIndex, { tempo: e.target.value })
                    }
                    placeholder="Tempo"
                    className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
                  />
                </div>

                {/* Optional Fields */}
                <input
                  type="text"
                  value={set.prescription_text || ""}
                  onChange={(e) =>
                    onUpdateSet(blockIndex, setIndex, {
                      prescription_text: e.target.value,
                    })
                  }
                  placeholder="Prescription text (e.g., '3x8-12 @ RPE 7')"
                  className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={set.notes || ""}
                  onChange={(e) =>
                    onUpdateSet(blockIndex, setIndex, { notes: e.target.value })
                  }
                  placeholder="Notes"
                  className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
                />

                {/* Is Warmup Checkbox */}
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={set.is_warmup || false}
                    onChange={(e) =>
                      onUpdateSet(blockIndex, setIndex, {
                        is_warmup: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span>Warmup set</span>
                </label>
              </div>
            ))}

            {/* Add Set Button */}
            <button
              type="button"
              onClick={() => onAddSet(blockIndex)}
              className="w-full rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
            >
              + Add Set
            </button>
          </div>
        </div>
      ))}

      {/* Add Block Button */}
      <button
        type="button"
        onClick={onAddBlock}
        disabled={isSaving}
        className="w-full rounded bg-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Add Block
      </button>

      {/* Save/Cancel Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 rounded bg-green-600 px-4 py-2 text-xs font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save Plan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 rounded bg-slate-600 px-4 py-2 text-xs font-medium hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}