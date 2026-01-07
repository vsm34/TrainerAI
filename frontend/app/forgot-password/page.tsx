"use client";

import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type ForgotPasswordForm = {
  email: string;
};

export default function ForgotPasswordPage() {
  const { resetPassword, user } = useAuth();
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<ForgotPasswordForm>();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const onSubmit = async (data: ForgotPasswordForm) => {
    setError("");
    setSuccess(false);

    try {
      await resetPassword(data.email);
      setSuccess(true);
    } catch (err: any) {
      // Do NOT reveal whether email exists or not - security best practice
      setSuccess(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-md rounded-xl bg-slate-900 p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-semibold">Reset Password</h1>

        {!success ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-slate-400">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div>
              <label className="mb-1 block text-sm">Email</label>
              <input
                type="email"
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                {...register("email", { required: true })}
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
              {formState.isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded border border-green-900 bg-green-950 px-3 py-2 text-sm text-green-200">
              If an account exists for this email, a reset link has been sent.
            </div>
            <p className="text-sm text-slate-400">
              Please check your email and follow the instructions to reset your password.
            </p>
          </div>
        )}

        <div className="mt-4 text-center text-sm text-slate-400">
          Remember your password?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
