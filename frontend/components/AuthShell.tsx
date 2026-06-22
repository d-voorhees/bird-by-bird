"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthCreditsFooter } from "@/components/AuthCreditsFooter";
import { EmailVerificationGate } from "@/components/EmailVerificationGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/components/Providers";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink/60">
        Loading…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!user.emailVerified) {
    return <EmailVerificationGate />;
  }

  return <>{children}</>;
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink/60">
        Loading…
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-paper">
      <div className="absolute right-6 top-5">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-center font-display text-2xl text-ink">Bird by Bird</h1>
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
          {children}
        </div>
      </div>
      <AuthCreditsFooter />
    </div>
  );
}
