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

type Exercise = {
  id: string;
  name: string;
  equipment?: string | null;
  movement_pattern?: string | null;
};

type WorkoutSet = {
  id: string;
  workout_block_id: string;
  exercise_id: string;
  set_index: number;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_load_value?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  prescription_text?: string | null;
};

type WorkoutBlock = {
  id: string;
  workout_id: string;
  block_type: string;
  sequence_index: number;
  notes?: string | null;
  sets: WorkoutSet[];
};

type Workout = {
  id: string;
  title: string;
  date: string;
  status: string;
  notes?: string | null;
  freeform_log?: string | null;
  blocks: WorkoutBlock[];
};

async function fetchWorkout(id: string): Promise<Workout> {
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

type WorkoutUpdate = {
  notes?: string;
  freeform_log?: string;
  status?: string;
  date?: string;
};

// Helper to format workout dates as date-only values (no timezone shift)
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

  const { register, handleSubmit, reset } = useForm<WorkoutUpdate>();

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
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (payload: WorkoutUpdate) =>
      api.put(`/api/v1/workouts/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", id] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.push("/workouts");
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

  const onSubmit = (values: WorkoutUpdate) => {
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

  return (
    <ProtectedRoute>
      <AppShell>
        {isLoading || !data ? (
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

            {data.blocks && data.blocks.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-200">
                  Workout Plan
                </h3>
                <WorkoutPlanPreview blocks={data.blocks} exerciseMap={exerciseMap} />
              </div>
            )}

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
                disabled={mutation.isPending}
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

