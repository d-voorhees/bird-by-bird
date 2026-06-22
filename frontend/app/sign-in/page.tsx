"use client";

import { useMutation } from "@apollo/client/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/components/Providers";
import { notify } from "@/components/ToastHost";
import { SIGN_IN_MUTATION } from "@/lib/graphql/operations";

export default function SignInPage() {
  return (
    <AuthShell>
      <SignInForm />
    </AuthShell>
  );
}

function SignInForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signIn, { loading }] = useMutation(SIGN_IN_MUTATION);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await signIn({ variables: { email, password } });
      await refreshUser();
      router.replace("/");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Sign in failed");
    }
  };

  return (
    <>
      <h1 className="mb-6 text-center font-display text-xl text-ink">Sign in</h1>
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <label className="block text-sm text-ink/70">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-stone/30 bg-surface/60 px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm text-ink/70">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-stone/30 bg-surface/60 px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ink/55">
        <Link href="/forgot-password" className="text-ink underline-offset-2 hover:underline">
          Forgot password?
        </Link>
      </p>
      <p className="mt-6 text-center text-sm text-ink/55">
        No account?{" "}
        <Link href="/sign-up" className="text-ink underline-offset-2 hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
