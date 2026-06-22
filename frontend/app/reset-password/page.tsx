"use client";

import { useMutation } from "@apollo/client/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { notify } from "@/components/ToastHost";
import { RESET_PASSWORD_MUTATION } from "@/lib/graphql/operations";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD_MUTATION);

  if (!token) {
    return (
      <section className="mx-auto w-full max-w-sm flex-1 px-6 pb-24 pt-16 text-center">
        <h1 className="font-display text-xl text-ink">Invalid link</h1>
        <p className="mt-4 text-sm text-ink/70">This password reset link is invalid.</p>
        <p className="mt-8">
          <Link href="/forgot-password" className="text-sm text-ink underline-offset-2 hover:underline">
            Request a new link →
          </Link>
        </p>
      </section>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      notify("Passwords do not match");
      return;
    }
    try {
      await resetPassword({ variables: { token, password } });
      notify("Password updated. Sign in with your new password.");
      router.replace("/sign-in");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not reset password");
    }
  };

  return (
    <section className="mx-auto w-full max-w-sm flex-1 px-6 pb-24 pt-16">
      <h1 className="text-center font-display text-xl text-ink">Choose a new password</h1>
      <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
        <label className="block text-sm text-ink/70">
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-stone/30 bg-surface/60 px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm text-ink/70">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-stone/30 bg-surface/60 px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/55">
        <Link href="/sign-in" className="text-ink underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="flex items-center justify-between px-6 py-5 text-sm">
        <span className="font-display text-lg">Bird by Bird</span>
        <ThemeToggle />
      </header>
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-sm flex-1 px-6 pb-24 pt-16 text-center">
            <p className="text-sm text-ink/60">Loading…</p>
          </section>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </main>
  );
}
