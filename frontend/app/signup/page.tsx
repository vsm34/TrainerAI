"use client";

import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type SignUpForm = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignUpPage() {
  const { signUp, user } = useAuth();
  const router = useRouter();
  const { register, handleSubmit, formState, watch } = useForm<SignUpForm>();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const onSubmit = async (data: SignUpForm) => {
    setError("");

    // Client-side validation
    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (data.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      await signUp(data.email, data.password);
      router.push("/");
    } catch (err: any) {
      // Handle Firebase errors
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email address");
      } else {
        setError("Failed to create account. Please try again");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-md rounded-xl bg-slate-900 p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-semibold">Create Account</h1>
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
          <div>
            <label className="mb-1 block text-sm">Confirm Password</label>
            <input
              type="password"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              {...register("confirmPassword", { required: true })}
            />
          </div>

          {error && (
            <div className="rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
          >
            {formState.isSubmitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
