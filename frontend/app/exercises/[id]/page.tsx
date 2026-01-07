"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type Exercise = {
  id: string;
  name: string;
  primary_muscle_id?: number;
  equipment?: string | null;
  movement_pattern?: string | null;
  unilateral?: boolean;
  skill_level?: string | null;
  notes?: string | null;
  trainer_id?: string | null;
  is_mine?: boolean; // we’ll add this from backend
};

export default function ExerciseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { user, loading: authLoading } = useAuth();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formState, setFormState] = useState<any>({});

  useEffect(() => {
    if (!id) return;
    if (authLoading) return;
    if (!user) return;

    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/v1/exercises/${id}`);
        if (!mounted) return;
        setExercise(res.data);
        setFormState(res.data);
      } catch (err: any) {
        setExercise(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id, authLoading, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const payload: Partial<Exercise> = {
        name: formState.name,
        primary_muscle_id: formState.primary_muscle_id ?? null,
        equipment: formState.equipment ?? null,
        movement_pattern: formState.movement_pattern ?? null,
        unilateral: !!formState.unilateral,
        skill_level: formState.skill_level ?? null,
        notes: formState.notes ?? null,
      };

      await api.put(`/api/v1/exercises/${id}`, payload);
      router.push("/exercises");
    } catch (err: any) {
      alert(getApiErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this exercise?")) return;

    try {
      await api.delete(`/api/v1/exercises/${id}`);
      router.push("/exercises");
    } catch (err: any) {
      alert(getApiErrorMessage(err));
    }
  };

  // If params haven't resolved yet, show loading
  if (!id || loading) {
    return (
      <ProtectedRoute>
        <AppShell>
          <p className="text-sm text-slate-400">Loading…</p>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!exercise) {
    return (
      <ProtectedRoute>
        <AppShell>
          <h2 className="mb-2 text-2xl font-semibold">Exercise</h2>
          <div className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            <p className="text-sm text-slate-400">
              Exercise not found or not owned by you. Global exercises are read-only.
            </p>
            <a
              href="/exercises"
              className="mt-3 inline-block rounded bg-slate-700 px-3 py-1 text-sm text-white"
            >
              Back
            </a>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <h2 className="mb-2 text-2xl font-semibold">{exercise.name}</h2>

        {!editing ? (
          <div className="space-y-3">
            <div className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
              <p className="font-medium">{exercise.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                {exercise.movement_pattern ?? "—"}
                {exercise.equipment ? ` · ${exercise.equipment}` : ""}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-300">
                <span className="rounded-full bg-slate-800 px-2 py-0.5">
                  {exercise.is_mine ? "Mine" : "Global"}
                </span>
              </div>
              {exercise.notes && <p className="mt-1 text-xs text-slate-500">{exercise.notes}</p>}
            </div>

            <div className="flex gap-2">
              {exercise.is_mine && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="rounded bg-red-700 px-3 py-1 text-sm text-white"
                  >
                    Delete
                  </button>
                </>
              )}
              <a
                href="/exercises"
                className="rounded bg-slate-700 px-3 py-1 text-sm text-white"
              >
                Back
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300">Name</label>
              <input
                value={formState.name || ""}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Equipment</label>
              <input
                value={formState.equipment || ""}
                onChange={(e) => setFormState({ ...formState, equipment: e.target.value })}
                className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Movement Pattern</label>
              <input
                value={formState.movement_pattern || ""}
                onChange={(e) =>
                  setFormState({ ...formState, movement_pattern: e.target.value })
                }
                className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Notes</label>
              <textarea
                value={formState.notes || ""}
                onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
              />
            </div>

            <div className="flex gap-2">
              <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded bg-slate-700 px-3 py-1 text-sm text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
