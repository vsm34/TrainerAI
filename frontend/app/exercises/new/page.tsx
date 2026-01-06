"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import api from "@/lib/apiClient";

export default function NewExercisePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [primaryMuscleId, setPrimaryMuscleId] = useState(0);
  const [muscles, setMuscles] = useState<Array<{id:number;name:string}>>([]);
  const [movementOptions, setMovementOptions] = useState<Array<{key:string;label:string}>>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const [equipment, setEquipment] = useState("");
  const [movementPattern, setMovementPattern] = useState("");
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [unilateral, setUnilateral] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        primary_muscle_id: Number(primaryMuscleId) || 0,
        equipment,
        movement_pattern: movementPattern,
        unilateral,
        skill_level: skillLevel,
        notes: notes || null,
      };
      console.log("EXERCISE CREATE PAYLOAD", payload);
      const res = await api.post("/api/v1/exercises/", payload);
      const created = res.data;
      // Prefer redirect to new detail if API returned id
      if (created?.id) {
        router.push(`/exercises/${created.id}`);
      } else {
        router.push("/exercises");
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create exercise");
      setSaving(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadMeta = async () => {
      if (authLoading) return;
      if (!user) return;
      setMetaLoading(true);
      setMetadataError(null);
      try {
        const res = await api.get("/api/v1/exercises/metadata");
        if (!mounted) return;
        const data = res.data || {};
        setMuscles(data.muscles || []);
        setMovementOptions(data.movement_patterns || []);
        if ((data.muscles || []).length > 0 && primaryMuscleId === 0) {
          setPrimaryMuscleId((data.muscles[0].id) as number);
        }
        if ((data.movement_patterns || []).length > 0 && !movementPattern) {
          setMovementPattern(data.movement_patterns[0].key);
        }
      } catch (err: any) {
        // surface error and allow manual fallback inputs
        const detail = err?.response?.data?.detail || err?.message || String(err);
        setMetadataError(String(detail));
      } finally {
        if (mounted) setMetaLoading(false);
      }
    };
    loadMeta();
    return () => { mounted = false; };
  }, [authLoading, user]);

  return (
    <ProtectedRoute>
      <AppShell>
        <h2 className="mb-2 text-2xl font-semibold">New Exercise</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-slate-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300">Primary Muscle</label>
            <select
              value={primaryMuscleId}
              onChange={(e) => setPrimaryMuscleId(Number(e.target.value))}
              required
              className="mt-1 w-72 rounded border bg-slate-800 px-2 py-1 text-sm text-white"
            >
              {muscles.length === 0 ? (
                <option value={0}>(loading muscles...)</option>
              ) : (
                muscles.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300">Equipment</label>
            <input
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300">Movement Pattern</label>
            <select value={movementPattern} onChange={(e) => setMovementPattern(e.target.value)} className="mt-1 w-72 rounded border bg-slate-800 px-2 py-1 text-sm text-white">
              {movementOptions.length === 0 ? (
                <option value="">(loading...)</option>
              ) : (
                movementOptions.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} />
              Unilateral
            </label>

            <label className="text-sm text-slate-300">Skill</label>
            <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="rounded bg-slate-800 px-2 py-1 text-sm text-white">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white" />
          </div>

          <div className="flex gap-2">
            <button disabled={saving} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
              {saving ? "Saving…" : "Create"}
            </button>
            <a href="/exercises" className="rounded bg-slate-700 px-3 py-1 text-sm text-white">Cancel</a>
          </div>
        </form>
      </AppShell>
    </ProtectedRoute>
  );
}
