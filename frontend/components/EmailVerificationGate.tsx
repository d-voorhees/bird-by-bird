"use client";

import { useMutation } from "@apollo/client/react";
import Image from "next/image";
import { useState } from "react";

import { AuthCreditsFooter } from "@/components/AuthCreditsFooter";
import { useAuth } from "@/components/Providers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { notify } from "@/components/ToastHost";
import { RESEND_VERIFICATION_EMAIL_MUTATION } from "@/lib/graphql/operations";

export function EmailVerificationGate() {
  const { user, refreshUser } = useAuth();
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resend, { loading }] = useMutation(RESEND_VERIFICATION_EMAIL_MUTATION);

  if (!user) {
    return null;
  }

  const handleResend = async () => {
    try {
      await resend();
      setSent(true);
      notify("Verification email sent. Check your inbox.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not resend email");
    }
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    try {
      await refreshUser();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-paper">
      <div className="absolute right-6 top-5">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl text-ink">Bird by Bird</h1>
          <div className="mx-auto flex justify-center">
            <Image
              src="/img/Artboard27.svg"
              alt=""
              width={300}
              height={300}
              className="h-auto w-[300px]"
              priority
            />
          </div>
          <h2 className="font-display text-xl text-ink">Verify your email</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/70">
            We sent a verification link to {user.email}. Open it to start using Bird by Bird.
          </p>
          {sent ? (
            <p className="mt-4 text-sm text-ink/55">Verification email sent.</p>
          ) : (
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={loading}
              className="mt-6 text-sm text-ink underline-offset-2 hover:underline disabled:opacity-50"
            >
              {loading ? "Sending…" : "Resend verification email"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleCheckVerified()}
            disabled={checking}
            className="mt-8 w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-50"
          >
            {checking ? "Checking…" : "I've verified my email"}
          </button>
        </div>
      </div>
      <AuthCreditsFooter />
    </div>
  );
}
