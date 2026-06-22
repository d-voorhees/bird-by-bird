"use client";

import Link from "next/link";

import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/components/Providers";

export default function CreditsPage() {
  const { user } = useAuth();

  return (
    <main className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="flex items-center justify-between px-6 py-5 text-sm">
        <span className="font-display text-lg">Bird by Bird</span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <Link href="/flock" className="text-ink/50 transition hover:text-ink">
              Flock →
            </Link>
          ) : (
            <Link href="/sign-in" className="text-ink/50 transition hover:text-ink">
              Sign in →
            </Link>
          )}
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 text-center">
        <h1 className="font-display text-2xl sm:text-3xl">credits</h1>
        <p className="mt-4 text-sm text-ink/60">birds by crosspixel via vecteezy</p>
      </section>
    </main>
  );
}
