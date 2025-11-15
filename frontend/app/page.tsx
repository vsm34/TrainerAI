// frontend/app/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { DebugTokenButton } from "@/components/DebugTokenButton";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
        <p className="text-sm text-slate-300">
          Welcome to TrainerAI. Use the sidebar to manage clients, exercises,
          workouts, and generate AI-assisted plans.
        </p>
        <DebugTokenButton />
      </AppShell>
    </ProtectedRoute>
  );
}
