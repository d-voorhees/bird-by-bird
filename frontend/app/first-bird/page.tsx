"use client";

import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedShell } from "@/components/AuthShell";
import { AddTaskModal } from "@/components/AddTaskModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FLOCK_QUERY, HISTORY_QUERY } from "@/lib/graphql/operations";
import type { Task } from "@/lib/types";

export default function FirstBirdPage() {
  return (
    <ProtectedShell>
      <FirstBirdScreen />
    </ProtectedShell>
  );
}

function FirstBirdScreen() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const { data: flockData, loading: flockLoading } = useQuery<{ flock: Task[] }>(
    FLOCK_QUERY,
  );
  const { data: historyData, loading: historyLoading } = useQuery<{ history: Task[] }>(
    HISTORY_QUERY,
    { variables: { limit: 1, offset: 0 } },
  );

  const tasksLoading = flockLoading || historyLoading;
  const hasTasks =
    (flockData?.flock?.length ?? 0) > 0 || (historyData?.history?.length ?? 0) > 0;

  useEffect(() => {
    if (!tasksLoading && hasTasks) {
      router.replace("/");
    }
  }, [tasksLoading, hasTasks, router]);

  const handleTaskAdded = () => {
    router.push("/");
  };

  if (tasksLoading || hasTasks) {
    return (
      <main className="page-bird flex min-h-screen flex-col bg-paper text-ink">
        <header className="flex items-center justify-end px-6 py-5 text-sm">
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/flock" className="text-ink/50 transition hover:text-ink">
              Flock →
            </Link>
          </div>
        </header>
        <section className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8">
          <p className="text-ink/40">Loading…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-bird flex min-h-screen flex-col bg-paper text-ink">
      <header className="flex items-center justify-end px-6 py-5 text-sm">
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/flock" className="text-ink/50 transition hover:text-ink">
            Flock →
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8">
        <div className="max-w-2xl text-center">
          <p className="font-display text-3xl leading-tight sm:text-4xl md:text-5xl">
            Bird by bird.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/Artboard14.svg"
            alt="a bird"
            className="bird-img mx-auto mb-6 mt-6 object-contain"
            style={{ width: "300px", height: "auto" }}
          />
          <p className="text-sm leading-relaxed text-ink/55 sm:text-base">
            Add your first task below. The application will show it to you one at a time until
            the flock is clear.
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-8 rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-fg transition hover:bg-accent/90"
          >
            Add your first bird
          </button>
        </div>
      </section>

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        focusNewTask
        onAdded={handleTaskAdded}
      />
    </main>
  );
}
