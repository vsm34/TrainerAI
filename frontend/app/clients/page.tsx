// frontend/app/clients/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

type Client = {
  id: string;
  name: string;
  email?: string | null;
  notes?: string | null;
  injury_flags?: string[] | null;
};

async function fetchClients(): Promise<Client[]> {
  const res = await api.get("/api/v1/clients/");
  return res.data;
}

export default function ClientsPage() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
    enabled: !authLoading && !!user,
  });

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Clients</h2>
            <p className="text-sm text-slate-300">
              Manage your clients. Each trainer only sees their own clients.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name..."
              className="rounded bg-slate-800 px-2 py-1 text-sm text-white"
            />
            <a
              href="/clients/new"
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white"
            >
              New
            </a>
          </div>
        </div>

        {isLoading || authLoading ? (
          <p className="text-sm text-slate-400">Loading clients...</p>
        ) : error ? (
          <div className="rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error.response?.status === 401 || error.response?.status === 403
              ? "Authentication failed. Please log in again."
              : error.message || "Failed to load clients. Please try again."}
          </div>
        ) : !clients || clients.length === 0 ? (
          <p className="text-sm text-slate-400">No clients found.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {clients
              .filter((c) =>
                search
                  ? c.name.toLowerCase().includes(search.toLowerCase())
                  : true
              )
              .map((client) => (
                <div
                  key={client.id}
                  className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div style={{ minWidth: 0 }}>
                      <p className="truncate font-medium">{client.name}</p>
                      {client.email && (
                        <p className="mt-1 truncate text-xs text-slate-400">{client.email}</p>
                      )}
                      {client.notes && (
                        <p className="mt-1 text-xs text-slate-500">{client.notes}</p>
                      )}
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      <a
                        href={`/clients/${client.id}`}
                        className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200"
                      >
                        View / Edit
                      </a>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

