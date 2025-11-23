// frontend/app/workouts/[id]/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { parseISO, format } from "date-fns";

type Workout = {
  id: number;
  title: string;
  date: string;
  status: string;
  notes?: string | null;
  freeform_log?: string | null;
};

async function fetchWorkout(id: string): Promise<Workout> {
  const res = await api.get(`/api/v1/workouts/${id}`);
  return res.data;
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
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["workout", id],
    queryFn: () => fetchWorkout(id),
    enabled: !!id,
  });

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
    },
  });

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
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">{data.title}</h2>
              <p className="text-sm text-slate-400">
                {formatWorkoutDate(data.date)} ·{" "}
                {data.status ?? "planned"}
              </p>
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
                className="rounded bg-blue-600 px-4 py-2 text-xs font-medium hover:bg-blue-500"
              >
                Save changes
              </button>
            </form>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

