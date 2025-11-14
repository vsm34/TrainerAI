// frontend/components/AppShell.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/exercises", label: "Exercises" },
  { href: "/workouts", label: "Workouts" },
  { href: "/generate-workout", label: "Generate Workout" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOutUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOutUser();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <aside className="w-56 border-r border-slate-800 bg-slate-900/60 p-4">
        <h1 className="mb-6 text-xl font-semibold">TrainerAI</h1>
        <nav className="space-y-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded px-3 py-2 ${
                pathname === item.href
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-6 w-full rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
        >
          Log out
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

