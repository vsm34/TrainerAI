// frontend/app/generate-workout/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";

type FakePreview = {
  title: string;
  focus: string;
  notes: string;
};

export default function GenerateWorkoutPage() {
  const [prompt, setPrompt] = useState("");
  const [subset, setSubset] = useState("upper");
  const [intensity, setIntensity] = useState("moderate");
  const [preview, setPreview] = useState<FakePreview | null>(null);

  const handleFakeGenerate = () => {
    setPreview({
      title: `Sample ${subset} day (${intensity})`,
      focus: subset,
      notes:
        "AI workout preview will appear here once wired to the backend / Gemini. For now, this is a static placeholder.",
    });
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <h2 className="mb-2 text-2xl font-semibold">Generate Workout</h2>
        <p className="mb-4 text-sm text-slate-300">
          Describe what you want (e.g. "Upper day, bench focus, push-pull with
          2–3 core movements"). In Chat D we will connect this to Gemini and
          the AIWorkoutPlan schema.
        </p>

        <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
          <section className="space-y-3 text-sm">
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
                Intensity
              </label>
              <select
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
              >
                <option value="easy">Easy / deload</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
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
              onClick={handleFakeGenerate}
              className="rounded bg-blue-600 px-4 py-2 text-xs font-medium hover:bg-blue-500"
            >
              Generate (placeholder)
            </button>
          </section>

          <section className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            <h3 className="mb-2 text-sm font-medium text-slate-200">
              Workout preview
            </h3>
            {preview ? (
              <div className="space-y-1 text-xs text-slate-300">
                <p className="font-semibold">{preview.title}</p>
                <p className="text-slate-400">{preview.notes}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  In Chat D, this will render the real AIWorkoutPlan blocks:
                  supersets, circuits, sets, reps, and notes.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No workout generated yet. Fill in the fields and click
                "Generate" to see a placeholder preview.
              </p>
            )}
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

