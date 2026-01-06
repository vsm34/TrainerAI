// frontend/app/workouts/new/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

type Client = {
  id: string;
  name: string;
};

type WorkoutCreate = {
  title: string;
  date: string; // YYYY-MM-DD format
  status: string;
  client_id?: string | null;
  notes?: string | null;
};

async function fetchClients(): Promise<Client[]> {
  const res = await api.get("/api/v1/clients/");
  return res.data;
}

async function createWorkout(payload: WorkoutCreate): Promise<{ id: string }> {
  const res = await api.post("/api/v1/workouts/", payload);
  return res.data;
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
    enabled: !authLoading && !!user,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<WorkoutCreate>({
    defaultValues: {
      date: getTodayDate(),
      status: "draft",
      client_id: null,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: createWorkout,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      setSuccessMessage("Workout created successfully!");
      // Redirect after a brief delay to show success message
      setTimeout(() => {
        router.push(`/workouts/${data.id}`);
      }, 500);
    },
    onError: (error: any) => {
      console.error("Failed to create workout:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
    },
  });

  const onSubmit = (values: WorkoutCreate) => {
    const payload: WorkoutCreate = {
      title: values.title,
      date: values.date,
      status: values.status,
      client_id: values.client_id && values.client_id !== "" ? values.client_id : null,
      notes: values.notes && values.notes.trim() !== "" ? values.notes.trim() : null,
    };
    createMutation.mutate(payload);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <h2 className="mb-2 text-2xl font-semibold">Create Workout</h2>
        <p className="mb-4 text-sm text-slate-300">
          Create a new workout manually. You can add exercises and sets later.
        </p>

        {successMessage && (
          <div className="mb-4 rounded border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-200">
            {successMessage}
          </div>
        )}

        {createMutation.isError && (
          <div className="mb-4 rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {createMutation.error?.response?.data?.detail ||
              createMutation.error?.response?.data?.message ||
              createMutation.error?.message ||
              "Failed to create workout. Please try again."}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs text-slate-300">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              {...register("title", { required: "Title is required" })}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-300">Date</label>
            <input
              type="date"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              {...register("date", { required: "Date is required" })}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-red-400">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-300">Status</label>
            <select
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              {...register("status")}
            >
              <option value="draft">Draft</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-xs text-red-400">{errors.status.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-300">Client (optional)</label>
            {clientsLoading ? (
              <p className="text-xs text-slate-400">Loading clients...</p>
            ) : (
              <select
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                {...register("client_id")}
              >
                <option value="">No client</option>
                {clients?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-300">Notes (optional)</label>
            <textarea
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              rows={3}
              {...register("notes")}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? "Creating..." : "Create Workout"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/workouts")}
              className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </AppShell>
    </ProtectedRoute>
  );
}

