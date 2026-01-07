"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type Client = {
  id: string;
  name: string;
  email?: string | null;
  notes?: string | null;
  injury_flags?: string[] | null;
};

type FormState = {
  name: string;
  email: string;
  notes: string;
  injuryFlagsText: string;
};

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { user, loading: authLoading } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);

  useEffect(() => {
    if (!id) return;
    if (authLoading) return;
    if (!user) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/v1/clients/${id}`);
        if (!mounted) return;
        const data: Client = res.data;
        setClient(data);
        setFormState({
          name: data.name || "",
          email: data.email || "",
          notes: data.notes || "",
          injuryFlagsText: (data.injury_flags || []).join(", "),
        });
      } catch (err: any) {
        setClient(null);
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
    if (!id || !formState) return;

    try {
      const injury_flags = formState.injuryFlagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: formState.name,
        email: formState.email || null,
        notes: formState.notes || null,
        injury_flags,
      };

      await api.put(`/api/v1/clients/${id}`, payload);
      router.push("/clients");
    } catch (err: any) {
      alert(getApiErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this client?")) return;

    try {
      await api.delete(`/api/v1/clients/${id}`);
      router.push("/clients");
    } catch (err: any) {
      alert(getApiErrorMessage(err));
    }
  };

  if (!id || loading) {
    return (
      <ProtectedRoute>
        <AppShell>
          <p className="text-sm text-slate-400">Loading…</p>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!client || !formState) {
    return (
      <ProtectedRoute>
        <AppShell>
          <h2 className="mb-2 text-2xl font-semibold">Client</h2>
          <div className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            <p className="text-sm text-slate-400">Client not found or not owned by you.</p>
            <a
              href="/clients"
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
        <h2 className="mb-2 text-2xl font-semibold">{client.name}</h2>

        {!editing ? (
          <div className="space-y-3">
            <div className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
              <p className="font-medium">{client.name}</p>
              {client.email && (
                <p className="mt-1 text-xs text-slate-400">{client.email}</p>
              )}
              {client.notes && (
                <p className="mt-1 text-xs text-slate-500">{client.notes}</p>
              )}
              {client.injury_flags && client.injury_flags.length > 0 && (
                <p className="mt-2 text-[11px] text-slate-300">
                  Injury flags: {client.injury_flags.join(", ")}
                </p>
              )}
            </div>

            <div className="flex gap-2">
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
              <a
                href="/clients"
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
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Email</label>
              <input
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Injury Flags (comma separated)</label>
              <input
                value={formState.injuryFlagsText}
                onChange={(e) => setFormState({ ...formState, injuryFlagsText: e.target.value })}
                className="mt-1 w-full rounded border bg-slate-800 px-2 py-1 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Notes</label>
              <textarea
                value={formState.notes}
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
