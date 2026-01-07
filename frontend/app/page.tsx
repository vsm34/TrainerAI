// frontend/app/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { parseISO, format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

type MinimalWorkout = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD or ISO
  status: string;
  client_id?: string | null;
  blocks?: Array<{
    sets?: Array<{ exercise_id?: string | number | null }>;
  }>;
};

type Exercise = {
  id: string | number;
  name: string;
};

type Client = {
  id: string;
  name: string;
};

async function fetchWorkouts(): Promise<MinimalWorkout[]> {
  try {
    const res = await api.get("/api/v1/workouts/");
    const data = res.data;
    if (Array.isArray(data)) return data as MinimalWorkout[];
    if (data && typeof data === "object" && Array.isArray(data.items)) return data.items as MinimalWorkout[];
    return [];
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) throw error;
    return [];
  }
}

async function fetchExercises(): Promise<Exercise[]> {
  try {
    const res = await api.get("/api/v1/exercises/");
    const data = res.data;
    if (Array.isArray(data)) return data as Exercise[];
    if (data && typeof data === "object" && Array.isArray(data.items)) return data.items as Exercise[];
    return [];
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) throw error;
    return [];
  }
}

async function fetchClients(): Promise<Client[]> {
  try {
    const res = await api.get("/api/v1/clients/");
    const data = res.data;
    if (Array.isArray(data)) return data as Client[];
    if (data && typeof data === "object" && Array.isArray(data.items)) return data.items as Client[];
    return [];
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) throw error;
    return [];
  }
}

// Helpers
function fmtDate(value?: string | null) {
  if (!value) return "";
  try {
    return format(parseISO(value), "yyyy-MM-dd");
  } catch {
    return value;
  }
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();

  const { data: workouts, isLoading: wLoading, error: wError } = useQuery({
    queryKey: ["workouts"],
    queryFn: fetchWorkouts,
    enabled: !authLoading && !!user,
  });

  const { data: exercises, isLoading: eLoading, error: eError } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
    enabled: !authLoading && !!user,
  });

  const { data: clients, isLoading: cLoading, error: cError } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
    enabled: !authLoading && !!user,
  });

  // Build maps
  const clientNameById = new Map<string, string>();
  (clients || []).forEach((c) => {
    // client id may be string; keep as string key
    clientNameById.set(String(c.id), c.name);
  });

  const exerciseNameById = new Map<string, string>();
  (exercises || []).forEach((ex) => {
    exerciseNameById.set(String(ex.id), ex.name);
  });

  // Recent 5 workouts (sorted by date desc)
  const recent = (workouts || [])
    .slice()
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    .slice(0, 5);

  // This week's status counts
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(now, { weekStartsOn: 1 });
  const statusCounts: Record<string, number> = { planned: 0, completed: 0, skipped: 0, in_progress: 0, draft: 0 };
  (workouts || []).forEach((w) => {
    try {
      const d = parseISO(w.date);
      if (isWithinInterval(d, { start, end })) {
        statusCounts[w.status] = (statusCounts[w.status] || 0) + 1;
      }
    } catch {}
  });

  // Most used exercises (top 5) — requires sets data
  const hasBlocks = Array.isArray(workouts) && workouts.some((w) => Array.isArray(w.blocks) && w.blocks.length > 0);
  const exerciseCounts = new Map<string, number>();
  if (hasBlocks) {
    (workouts || []).forEach((w) => {
      (w.blocks || []).forEach((b) => {
        (b.sets || []).forEach((s) => {
          if (s.exercise_id) {
            const key = String(s.exercise_id);
            exerciseCounts.set(key, (exerciseCounts.get(key) || 0) + 1);
          }
        });
      });
    });
  }
  const topExercises = Array.from(exerciseCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Compliance: planned vs completed this week
  const plannedThisWeek = statusCounts.planned || 0;
  const completedThisWeek = statusCounts.completed || 0;

  const anyLoading = authLoading || wLoading || eLoading || cLoading;
  const anyError = wError || eError || cError;

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-slate-300">Overview of your training activity.</p>
        </div>

        {anyLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : anyError ? (
          <div className="mb-4 rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            Failed to load some data. You can still use the app.
          </div>
        ) : null}

        {/* Totals */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Total Workouts</p>
            <p className="mt-1 text-2xl font-semibold">{(workouts || []).length}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Total Exercises</p>
            <p className="mt-1 text-2xl font-semibold">{(exercises || []).length}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Total Clients</p>
            <p className="mt-1 text-2xl font-semibold">{(clients || []).length}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-200">Recent Workouts</h3>
            <div className="space-y-2">
              {recent.length === 0 ? (
                <p className="text-xs text-slate-400">No recent workouts.</p>
              ) : (
                recent.map((w) => (
                  <div key={w.id} className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{w.title}</p>
                        <p className="text-xs text-slate-400">{fmtDate(w.date)} · {w.status || "—"}</p>
                        {w.client_id && (
                          <p className="text-[11px] text-slate-500">{clientNameById.get(String(w.client_id)) || "Unknown client"}</p>
                        )}
                      </div>
                      <a href={`/workouts/${w.id}`} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">View</a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* This Week Status */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-200">This Week</h3>
            <div className="rounded border border-slate-800 bg-slate-900 p-4">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="rounded bg-slate-800 p-2">
                    <p className="text-[11px] text-slate-400">{status}</p>
                    <p className="text-lg font-semibold">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-200">Most Used Exercises</h3>
            {!hasBlocks ? (
              <div className="rounded border border-slate-800 bg-slate-900 p-4 text-xs text-slate-300">
                Not enough data from list endpoint.
              </div>
            ) : topExercises.length === 0 ? (
              <div className="rounded border border-slate-800 bg-slate-900 p-4 text-xs text-slate-300">
                No exercise usage data.
              </div>
            ) : (
              <div className="space-y-2">
                {topExercises.map(([id, count]) => (
                  <div key={id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900 px-4 py-2 text-sm">
                    <span>{exerciseNameById.get(id) || `Exercise ${id}`}</span>
                    <span className="text-xs text-slate-400">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-200">Compliance (This Week)</h3>
            <div className="rounded border border-slate-800 bg-slate-900 p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded bg-slate-800 p-3 text-center">
                  <p className="text-[11px] text-slate-400">Planned</p>
                  <p className="text-xl font-semibold">{plannedThisWeek}</p>
                </div>
                <div className="rounded bg-slate-800 p-3 text-center">
                  <p className="text-[11px] text-slate-400">Completed</p>
                  <p className="text-xl font-semibold">{completedThisWeek}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
