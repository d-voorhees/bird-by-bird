"use client";

import { useMutation } from "@apollo/client/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/components/Providers";
import { VERIFY_EMAIL_MUTATION } from "@/lib/graphql/operations";

type VerifyState = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("");
  const [verifyEmail] = useMutation(VERIFY_EMAIL_MUTATION);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This verification link is invalid.");
      return;
    }

    void verifyEmail({ variables: { token } })
      .then(async () => {
        await refreshUser();
        setState("success");
        setMessage("Thanks, your email is verified.");
      })
      .catch((error: unknown) => {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Verification failed.");
      });
  }, [token, verifyEmail, refreshUser]);

  return (
    <section className="mx-auto w-full max-w-sm flex-1 px-6 pb-24 pt-16 text-center">
      {state === "loading" ? (
        <p className="text-sm text-ink/60">Verifying your email…</p>
      ) : (
        <>
          <h1 className="font-display text-xl text-ink">
            {state === "success" ? "Email verified" : "Verification failed"}
          </h1>
          <p className="mt-4 text-sm text-ink/70">{message}</p>
          <p className="mt-8">
            <Link href="/first-bird" className="text-sm text-ink underline-offset-2 hover:underline">
              Go to Bird by Bird →
            </Link>
          </p>
        </>
      )}
    </section>
  );
}

export default function VerifyEmailPage() {
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
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
