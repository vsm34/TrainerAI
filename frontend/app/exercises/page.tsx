// frontend/app/exercises/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";

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
  const res = await api.get("/api/v1/exercises");
  return res.data;
}

export default function ExercisesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
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
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {data?.map((ex) => (
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

