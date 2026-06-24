"use client";

import Image from "next/image";
import Link from "next/link";

import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { HowItWorksRail } from "@/components/landing/HowItWorksRail";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="flex items-center justify-between px-6 py-5 text-sm">
        <span className="font-display text-lg">Bird by Bird</span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/sign-in" className="text-ink/50 transition hover:text-ink">
            Sign in →
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 pb-20 pt-12 text-center sm:pt-16">
        <Image
          src="/img/Artboard27.svg"
          alt=""
          width={300}
          height={300}
          className="mb-8 h-auto w-[300px]"
          priority
        />
        <h1 className="font-display text-3xl leading-relaxed sm:text-4xl md:text-5xl">
          Just take it bird by bird.
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink/75 sm:text-base">
          Bird by Bird is a focus tool. Most task managers show you all your tasks at once. Bird by Bird shows you them one at a time. Each task is a bird. Add what you want to work on today and work through it, bird by bird.
        </p>
        <LandingCTA className="mt-10" />
      </section>

      <section
        id="how-it-works"
        className="border-t border-stone/20 bg-paper px-6 py-16 sm:py-20"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto w-full max-w-2xl">
          <h2 id="how-it-works-heading" className="font-display text-2xl sm:text-3xl">
            How it works
          </h2>
          <div className="mt-12">
            <HowItWorksRail />
          </div>
        </div>
      </section>

      <section
        className="border-t border-stone/20 px-6 py-16 sm:py-20"
        aria-labelledby="what-not-heading"
      >
        <div className="mx-auto w-full max-w-2xl">
          <h2 id="what-not-heading" className="font-display text-2xl sm:text-3xl">
            What Bird by Bird is not
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-ink/75 sm:text-base">
            Bird by Bird is not a replacement for your task manager. The application does not send
            notifications, track streaks, or let you assign tasks across people, projects, or
            priorities. Instead it is a focus tool. Instead of being overwhelmed by a giant list of tasks, this displays one task to focus on at a time.
          </p>
        </div>
      </section>

      <section
        className="border-t border-stone/20 px-6 py-16 sm:py-20"
        aria-labelledby="why-heading"
      >
        <div className="mx-auto w-full max-w-2xl">
          <h2 id="why-heading" className="font-display text-2xl sm:text-3xl">
            Why
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink/75 sm:text-base">
            <p>
              Knowledge workers lose hours every day to context switching. The cost is the energy
              spent remembering where you were and what you were doing, every time you bounce between
              tabs and tools and a giant to do list. Most task managers worsen the problem by showing you every open item
              the moment you sign in, leading to task overwhelm.
            </p>
            <p>
              Bird by Bird is a focus tool that pulls one item out of the noise and gives it the whole screen
              until you are done with it. Helping you to focus on one thing at a time.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-stone/20 px-6 py-16 sm:py-20" aria-labelledby="try-heading">
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-lg border border-stone/20 bg-surface/40 px-6 py-10 text-center sm:px-10 sm:py-12">
            <h2 id="try-heading" className="font-display text-2xl sm:text-3xl">
              Try it
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/75">
              Start with one bird. The application is free to use, no credit card required.
            </p>
            <LandingCTA className="mt-8" />
          </div>
        </div>
      </section>

      <section
        className="border-t border-stone/20 px-6 py-16 sm:py-20"
        aria-labelledby="faq-heading"
      >
        <div className="mx-auto w-full max-w-2xl">
          <h2 id="faq-heading" className="font-display text-2xl sm:text-3xl">
            FAQ
          </h2>
          <div className="mt-8">
            <FaqAccordion />
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
