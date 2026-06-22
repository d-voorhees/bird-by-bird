"use client";

import { useMutation } from "@apollo/client/react";
import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import { notify } from "@/components/ToastHost";
import { REQUEST_PASSWORD_RESET_MUTATION } from "@/lib/graphql/operations";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [requestReset, { loading }] = useMutation(REQUEST_PASSWORD_RESET_MUTATION);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await requestReset({ variables: { email } });
      setSent(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not send reset email");
    }
  };

  if (sent) {
    return (
      <>
        <h1 className="mb-4 text-center font-display text-xl text-ink">Check your email</h1>
        <p className="text-center text-sm leading-relaxed text-ink/70">
          We sent a password reset link to {email}. The link expires in one hour.
        </p>
        <p className="mt-6 text-center text-sm text-ink/55">
          <Link href="/sign-in" className="text-ink underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-center font-display text-xl text-ink">Reset password</h1>
      <p className="mb-6 text-center text-sm leading-relaxed text-ink/70">
        Enter the email address for your account. We will send a link to choose a new password.
      </p>
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
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/55">
        <Link href="/sign-in" className="text-ink underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
