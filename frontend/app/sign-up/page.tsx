"use client";

import { useMutation } from "@apollo/client/react";
import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/components/Providers";
import { notify } from "@/components/ToastHost";
import { SIGN_UP_MUTATION } from "@/lib/graphql/operations";

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUpForm />
    </AuthShell>
  );
}

function SignUpForm() {
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signUp, { loading }] = useMutation(SIGN_UP_MUTATION);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await signUp({ variables: { email, password } });
      await refreshUser();
      notify("Account created. Check your email to verify your address.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Sign up failed");
    }
  };

  return (
    <>
      <h1 className="mb-6 text-center font-display text-xl text-ink">Sign up</h1>
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
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-stone/30 bg-surface/60 px-3 py-2 pr-10 text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center border-0 bg-transparent p-0 text-ink/50 hover:text-ink"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs leading-relaxed text-ink/50">
        By signing up you agree to our{" "}
        <Link href="/privacy" className="text-ink/70 underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="mt-6 text-center text-sm text-ink/55">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-ink underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M1 8s2.5-4 7-4 7 4 7 4-2.5 4-7 4-7-4-7-4z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M1 8s2.5-4 7-4 7 4 7 4-2.5 4-7 4-7-4-7-4z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M2 2l12 12"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
