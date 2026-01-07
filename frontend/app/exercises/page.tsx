// frontend/app/exercises/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useState } from "react";

type Exercise = {
  id: number;
  name: string;
  equipment?: string | null;
  movement_pattern?: string | null;
  unilateral: boolean;
  skill_level?: string | null;
  notes?: string | null;
  trainer_id?: string | null;
  is_mine?: boolean;
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all"|"mine"|"global">("all");
  const { data: exercises, isLoading, error } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
    enabled: !authLoading && !!user,
  });

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Exercises</h2>
            <p className="text-sm text-slate-300">Global and trainer-specific exercises available for building workouts.</p>
          </div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name..." className="rounded bg-slate-800 px-2 py-1 text-sm text-white" />
            <select value={filter} onChange={(e)=>setFilter(e.target.value as any)} className="rounded bg-slate-800 px-2 py-1 text-sm text-white">
              <option value="all">All</option>
              <option value="mine">Mine</option>
              <option value="global">Global</option>
            </select>
            <a
              href="/exercises/new"
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white"
            >
              New
            </a>
          </div>
        </div>

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
              {exercises
                .filter((ex) => {
                  if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
                  if (filter === "mine") return ex.is_mine === true;
                  if (filter === "global") return ex.is_mine === false;
                  return true;
                })
                .map((ex) => (
                <div
                  key={ex.id}
                  className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div style={{minWidth:0}}>
                      <p className="font-medium truncate">{ex.name}</p>
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

                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      {ex.is_mine ? (
                        <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] text-blue-300">
                          Mine
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-600/20 px-2 py-0.5 text-[10px] text-emerald-300">
                          Global
                        </span>
                      )}

                      {/* Edit only for trainer-owned exercises */}
                      {ex.is_mine && (
                        <a
                          href={`/exercises/${ex.id}`}
                          className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200"
                        >
                          Edit
                        </a>
                      )}

                      {ex.is_mine && (
                        <DeleteExerciseButton id={ex.id} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

  function DeleteExerciseButton({ id }: { id: string }) {
    const handleDelete = async () => {
      if (!confirm("Delete this exercise? This cannot be undone.")) return;
      try {
        await api.delete(`/api/v1/exercises/${id}`);
        // Simple refresh - navigate to same page to refetch on mount
        window.location.href = "/exercises";
      } catch (err: any) {
        alert(getApiErrorMessage(err));
      }
    };

    return (
      <button
        onClick={handleDelete}
        className="rounded bg-red-700 px-2 py-1 text-xs text-white"
      >
        Delete
      </button>
    );
  }

