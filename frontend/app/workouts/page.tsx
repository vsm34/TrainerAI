// frontend/app/workouts/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import Link from "next/link";
import { parseISO, format } from "date-fns";

type Workout = {
  id: number;
  title: string;
  date: string; // ISO from backend (date)
  status: string;
  notes?: string | null;
};

async function fetchWorkouts(): Promise<Workout[]> {
  const res = await api.get("/api/v1/workouts");
  return res.data;
}

// Helper to format workout dates as date-only values (no timezone shift)
const formatWorkoutDate = (value?: string | null) => {
  if (!value) return "";
  // Interpret as a local calendar date and print as MM/DD/YYYY
  return format(parseISO(value), "MM/dd/yyyy");
};

export default function WorkoutsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: fetchWorkouts,
  });

  return (
    <ProtectedRoute>
      <AppShell>
        <h2 className="mb-2 text-2xl font-semibold">Workouts</h2>
        <p className="mb-4 text-sm text-slate-300">
          View and manage your planned and completed workouts.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading workouts...</p>
        ) : (
          <div className="space-y-2">
            {data && data.length === 0 && (
              <p className="text-sm text-slate-500">
                No workouts yet. You can create them later or from the AI page.
              </p>
            )}
            {data?.map((w) => (
              <Link
                key={w.id}
                href={`/workouts/${w.id}`}
                className="block rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm hover:border-slate-600"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{w.title}</p>
                    <p className="text-xs text-slate-400">
                      {formatWorkoutDate(w.date)} ·{" "}
                      {w.status ?? "draft"}
                    </p>
                  </div>
                </div>
                {w.notes && (
                  <p className="mt-1 text-xs text-slate-500">{w.notes}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

