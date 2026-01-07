// frontend/app/generate-workout/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { AIWorkoutPlan } from "@/lib/ai-schema";
import { aiPlanToWorkoutCreate } from "@/lib/workoutTransform";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type Client = {
  id: string;
  name: string;
};

type Exercise = {
  id: string;
  name: string;
  equipment?: string | null;
  movement_pattern?: string | null;
};

type WorkoutGenerateRequest = {
  client_id?: string | null;
  focus_subsets: string[];
  session_length_minutes?: number | null;
  equipment_available?: string[] | null;
  notes?: string | null;
};

type WorkoutGenerateResponse = {
  plan: AIWorkoutPlan;
};

async function fetchClients(): Promise<Client[]> {
  const res = await api.get("/api/v1/clients/");
  return res.data;
}

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
    // Don't swallow 401/403 - let react-query handle it
    if (error && typeof error === 'object' && 'response' in error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) throw error;
    }
    // For other errors, return empty array
    return [];
  }
}

async function generateWorkout(payload: WorkoutGenerateRequest): Promise<WorkoutGenerateResponse> {
  const res = await api.post("/api/v1/workouts/generate", payload);
  return res.data;
}

async function createWorkout(payload: any): Promise<{ id: string }> {
  const res = await api.post("/api/v1/workouts/", payload);
  return res.data;
}

export default function GenerateWorkoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [subset, setSubset] = useState("upper");
  const [clientId, setClientId] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<AIWorkoutPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
    enabled: !authLoading && !!user,
  });

  const { data: exercises, isLoading: exercisesLoading, error: exercisesError } = useQuery({
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

  const generateMutation = useMutation({
    mutationFn: generateWorkout,
    onSuccess: (data) => {
      setGeneratedPlan(data.plan);
      setError(null);
    },
    onError: (err: any) => {
      setError(getApiErrorMessage(err));
      setGeneratedPlan(null);
    },
  });

  const saveMutation = useMutation({
    mutationFn: createWorkout,
    onSuccess: (data) => {
      router.push(`/workouts/${data.id}`);
    },
    onError: (err: any) => {
      setError(getApiErrorMessage(err));
    },
  });

  const handleGenerate = () => {
    const focusSubsets = [subset];
    if (subset === "full_body") {
      focusSubsets.push("upper", "lower", "core");
    }

    const payload: WorkoutGenerateRequest = {
      client_id: clientId || null,
      focus_subsets: focusSubsets as any,
      notes: prompt || null,
    };

    generateMutation.mutate(payload);
  };

  const handleSave = () => {
    if (!generatedPlan) return;

    const workoutPayload = aiPlanToWorkoutCreate(generatedPlan, {
      client_id: clientId,
    });

    saveMutation.mutate(workoutPayload);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <h2 className="mb-2 text-2xl font-semibold">Generate Workout</h2>
        <p className="mb-4 text-sm text-slate-300">
          Describe what you want (e.g. "Upper day, bench focus, push-pull with
          2–3 core movements"). The AI will generate a structured workout plan.
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {exercisesError && (
          <div className="mb-4 rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {getApiErrorMessage(exercisesError)}
          </div>
        )}
        {!exercisesLoading && !exercisesError && (!exercises || exercises.length === 0) && (
          <div className="mb-4 rounded border border-yellow-800 bg-yellow-950 px-4 py-3 text-sm text-yellow-200">
            No exercises available. Please create exercises or seed default exercises before generating workouts.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
          <section className="space-y-3 text-sm">
            {clients && clients.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Client (optional)
                </label>
                <select
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={clientId || ""}
                  onChange={(e) => setClientId(e.target.value || null)}
                >
                  <option value="">No client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Focus subset
              </label>
              <select
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                value={subset}
                onChange={(e) => setSubset(e.target.value)}
              >
                <option value="upper">Upper</option>
                <option value="lower">Lower</option>
                <option value="core">Core</option>
                <option value="full_body">Full body</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Describe what you want
              </label>
              <textarea
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                rows={7}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Upper push emphasis (bench, overhead press), 2 back movements, finish with 10–15 min core."
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateMutation.isPending || exercisesLoading || !exercises || exercises.length === 0}
              className="rounded bg-blue-600 px-4 py-2 text-xs font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generateMutation.isPending ? "Generating..." : "Generate Workout"}
            </button>
          </section>

          <section className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            <h3 className="mb-2 text-sm font-medium text-slate-200">
              Workout preview
            </h3>
            {generatedPlan ? (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-slate-200">{generatedPlan.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Focus: {generatedPlan.focus_subsets.join(", ")}
                  </p>
                  {generatedPlan.muscles_targeted.length > 0 && (
                    <p className="mt-1 text-xs text-slate-400">
                      Muscles: {generatedPlan.muscles_targeted.join(", ")}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {generatedPlan.blocks.map((block, blockIdx) => (
                    <div key={blockIdx} className="rounded border border-slate-700 bg-slate-950 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300 capitalize">
                          {block.block_type} block
                        </span>
                        <span className="text-xs text-slate-500">
                          {block.rest_seconds}s rest
                        </span>
                      </div>
                      <div className="space-y-2">
                        {block.exercises.map((exercise, exIdx) => {
                          const exerciseData = exerciseMap.get(exercise.exercise_id);
                          const exerciseName = exerciseData?.name || exercise.exercise_id;
                          return (
                            <div key={exIdx} className="text-xs">
                              <p className="font-medium text-slate-200">
                                {exerciseName}
                                {exerciseData?.movement_pattern || exerciseData?.equipment ? (
                                  <span className="ml-2 text-slate-500">
                                    {exerciseData.movement_pattern || ""}
                                    {exerciseData.movement_pattern && exerciseData.equipment ? " · " : ""}
                                    {exerciseData.equipment || ""}
                                  </span>
                                ) : null}
                              </p>
                              <div className="mt-1 ml-2 space-y-1">
                                {exercise.sets.map((set, setIdx) => (
                                  <p key={setIdx} className="text-slate-400">
                                    Set {setIdx + 1}: {set.reps} reps
                                    {set.weight !== null && set.weight !== undefined && (
                                      <> @ {set.weight}</>
                                    )}
                                    {set.notes && (
                                      <> · {set.notes}</>
                                    )}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="mt-4 w-full rounded bg-green-600 px-4 py-2 text-xs font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Workout"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No workout generated yet. Fill in the fields and click
                "Generate Workout" to create a workout plan.
              </p>
            )}
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

