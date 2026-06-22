"use client";

import Link from "next/link";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="flex items-center justify-between px-6 py-5 text-sm">
        <span className="font-display text-lg">Bird by Bird</span>
        <ThemeToggle />
      </header>

      <section className="mx-auto w-full max-w-xl flex-1 px-6 pb-24 pt-4">
        <h1 className="font-display text-2xl sm:text-3xl">Privacy policy</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink/75">
          <p>
            We collect your email address so we can create and maintain your account and save your
            tasks to your profile. Your data remains in your account until you choose to delete or
            clear it.
          </p>
          <p>
            We do not sell or share your personal data. We only access user data as needed to
            operate and improve the service.
          </p>
          <p>
            We use basic analytics to understand how the product is used and to improve performance.
            We also send transactional emails, such as account verification and essential
            account-related notifications.
          </p>
          <p>
            We rely on a limited number of third-party services for analytics and email delivery. We
            do not use third parties for advertising or data resale.
          </p>
        </div>
        <p className="mt-10 text-sm text-ink/55">
          <Link href="/sign-in" className="text-ink underline-offset-2 hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
