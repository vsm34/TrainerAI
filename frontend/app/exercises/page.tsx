// frontend/app/exercises/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

type Exercise = {
  id: number;
  name: string;
  equipment?: string | null;
  movement_pattern?: string | null;
  unilateral: boolean;
  skill_level?: string | null;
  notes?: string | null;
  trainer_id?: number | null;
};

async function fetchExercises(): Promise<Exercise[]> {
  try {
    const res = await api.get("/api/v1/exercises/");
    const data = res.data;
    // Defensively handle both { items: [...] } and array formats
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === "object" && Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  } catch (error: any) {
    // Don't swallow 401/403 - let react-query handle it so we can show error
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw error;
    }
    // For other errors, return empty array
    return [];
  }
}

export default function ExercisesPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: exercises, isLoading, error } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
    enabled: !authLoading && !!user,
  });

  return (
    <ProtectedRoute>
      <AppShell>
        <h2 className="mb-2 text-2xl font-semibold">Exercises</h2>
        <p className="mb-4 text-sm text-slate-300">
          Global and trainer-specific exercises available for building workouts.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading exercises...</p>
        ) : error ? (
          <div className="rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error.response?.status === 401 || error.response?.status === 403
              ? "Authentication failed. Please log in again."
              : error.message || "Failed to load exercises. Please try again."}
          </div>
        ) : !exercises || exercises.length === 0 ? (
          <p className="text-sm text-slate-400">No exercises found.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm"
              >
                <div className="flex justify-between">
                  <p className="font-medium">{ex.name}</p>
                  {ex.trainer_id == null ? (
                    <span className="rounded-full bg-emerald-600/20 px-2 py-0.5 text-[10px] text-emerald-300">
                      Global
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] text-blue-300">
                      Mine
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {ex.movement_pattern ?? "—"}
                  {ex.equipment ? ` · ${ex.equipment}` : ""}
                  {ex.unilateral ? " · Unilateral" : ""}
                  {ex.skill_level ? ` · ${ex.skill_level}` : ""}
                </p>
                {ex.notes && (
                  <p className="mt-1 text-xs text-slate-500">{ex.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

