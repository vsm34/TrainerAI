"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function NewClientPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [injuryFlagsText, setInjuryFlagsText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading || !user) return;

    setSaving(true);
    try {
      const injury_flags = injuryFlagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name,
        email: email || null,
        notes: notes || null,
        injury_flags,
      };

      const res = await api.post("/api/v1/clients/", payload);
      const created = res.data;
      if (created?.id) {
        router.push(`/clients/${created.id}`);
      } else {
        router.push("/clients");
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create client");
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <h2 className="mb-2 text-2xl font-semibold">New Client</h2>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
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
            <label className="block text-sm text-slate-300">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300">Injury Flags (comma separated)</label>
            <input
              value={injuryFlagsText}
              onChange={(e) => setInjuryFlagsText(e.target.value)}
              className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
              placeholder="e.g. shoulder, knee"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              disabled={saving}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
            >
              {saving ? "Saving…" : "Create"}
            </button>
            <a
              href="/clients"
              className="rounded bg-slate-700 px-3 py-1 text-sm text-white"
            >
              Cancel
            </a>
          </div>
        </form>
      </AppShell>
    </ProtectedRoute>
  );
}
