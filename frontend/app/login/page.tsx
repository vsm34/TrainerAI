// frontend/app/login/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<LoginForm>();

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const onSubmit = async (data: LoginForm) => {
    try {
      await signIn(data.email, data.password);
      router.push("/");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-md rounded-xl bg-slate-900 p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-semibold">TrainerAI Login</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input
              type="email"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              {...register("email", { required: true })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Password</label>
            <input
              type="password"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              {...register("password", { required: true })}
            />
          </div>
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
          >
            {formState.isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

