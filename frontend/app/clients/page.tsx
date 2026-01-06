// frontend/app/clients/page.tsx
"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useForm } from "react-hook-form";

type Client = {
  id: number;
  name: string;
  email?: string | null;
  notes?: string | null;
  injury_flags: string[];
};

type ClientCreate = {
  name: string;
  email?: string;
  notes?: string;
};

async function fetchClients(): Promise<Client[]> {
  const res = await api.get("/api/v1/clients/");
  return res.data;
}

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  const { register, handleSubmit, reset } = useForm<ClientCreate>();

  const createMutation = useMutation({
    mutationFn: (payload: ClientCreate) => api.post("/api/v1/clients/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      reset();
    },
  });

  const onSubmit = (values: ClientCreate) => {
    createMutation.mutate(values);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Clients</h2>
            <p className="text-sm text-slate-300">
              Manage your clients. Each trainer only sees their own clients.
            </p>
          </div>

          <section className="grid grid-cols-1 gap-8 md:grid-cols-[1.3fr,1fr]">
            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-200">
                Client List
              </h3>
              {isLoading ? (
                <p className="text-sm text-slate-400">Loading clients...</p>
              ) : (
                <div className="space-y-2">
                  {data && data.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No clients yet. Create your first client on the right.
                    </p>
                  )}
                  {data?.map((client) => (
                    <div
                      key={client.id}
                      className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          {client.email && (
                            <p className="text-xs text-slate-400">
                              {client.email}
                            </p>
                          )}
                        </div>
                      </div>
                      {client.notes && (
                        <p className="mt-1 text-xs text-slate-400">
                          {client.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-200">
                Add Client
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-sm">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Name
                  </label>
                  <input
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                    {...register("name", { required: true })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Email
                  </label>
                  <input
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                    {...register("email")}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Notes
                  </label>
                  <textarea
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                    rows={3}
                    {...register("notes")}
                  />
                </div>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-xs font-medium hover:bg-blue-500"
                >
                  Add Client
                </button>
              </form>
            </div>
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

