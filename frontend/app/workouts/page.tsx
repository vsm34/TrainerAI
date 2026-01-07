// frontend/app/workouts/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import Link from "next/link";
import { parseISO, format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type Workout = {
  id: string;
  title: string;
  date: string; // ISO from backend (date)
  status: string;
  notes?: string | null;
};

async function fetchWorkouts(): Promise<Workout[]> {
  const res = await api.get("/api/v1/workouts/");
  return res.data;
}

async function deleteWorkout(id: string): Promise<void> {
  await api.delete(`/api/v1/workouts/${id}`);
}

// Helper to format workout dates as date-only values (no timezone shift)
const formatWorkoutDate = (value?: string | null) => {
  if (!value) return "";
  // Interpret as a local calendar date and print as MM/DD/YYYY
  return format(parseISO(value), "MM/dd/yyyy");
};

export default function WorkoutsPage() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: fetchWorkouts,
    enabled: !authLoading && !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      setMessage({ type: "success", text: "Workout deleted successfully." });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: getApiErrorMessage(error) });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  const handleDelete = (e: React.MouseEvent, workoutId: string, workoutTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${workoutTitle}"? This cannot be undone.`)) {
      deleteMutation.mutate(workoutId);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-semibold">Workouts</h2>
            <p className="text-sm text-slate-300">
              View and manage your planned and completed workouts.
            </p>
          </div>
          <Link
            href="/workouts/new"
            className="rounded bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500"
          >
            Create Workout
          </Link>
        </div>

        {message && (
          <div
            className={`mb-4 rounded border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-green-800 bg-green-950 text-green-200"
                : "border-red-800 bg-red-950 text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

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
              <div
                key={w.id}
                className="group relative rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm hover:border-slate-600"
              >
                <Link href={`/workouts/${w.id}`} className="block">
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
                <button
                  onClick={(e) => handleDelete(e, w.id, w.title)}
                  disabled={deleteMutation.isPending}
                  className="absolute right-2 top-2 rounded bg-red-600/20 px-2 py-1 text-xs font-medium text-red-300 opacity-0 transition-opacity hover:bg-red-600/30 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

