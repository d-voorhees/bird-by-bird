"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProtectedShell } from "@/components/AuthShell";
import { AddTaskModal } from "@/components/AddTaskModal";
import { BirdImage } from "@/components/BirdImage";
import { EditableTaskContent } from "@/components/EditableTaskContent";
import { ThemeToggle } from "@/components/ThemeToggle";
import { notify } from "@/components/ToastHost";
import {
  COMPLETE_TASK_MUTATION,
  CURRENT_BIRD_QUERY,
  FLOCK_QUERY,
  HISTORY_QUERY,
  SKIP_TASK_MUTATION,
} from "@/lib/graphql/operations";
import { markTaskDoneInCache, skipTaskInCache } from "@/lib/taskCache";
import type { Task } from "@/lib/types";

export default function FocusPage() {
  return (
    <ProtectedShell>
      <ZeroTasksGate>
        <BirdScreen />
      </ZeroTasksGate>
    </ProtectedShell>
  );
}

function ZeroTasksGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: flockData, loading: flockLoading } = useQuery<{ flock: Task[] }>(
    FLOCK_QUERY,
  );
  const { data: historyData, loading: historyLoading } = useQuery<{ history: Task[] }>(
    HISTORY_QUERY,
    { variables: { limit: 1, offset: 0 } },
  );

  const tasksLoading = flockLoading || historyLoading;
  const hasNoTasks =
    (flockData?.flock?.length ?? 0) === 0 && (historyData?.history?.length ?? 0) === 0;

  useEffect(() => {
    if (!tasksLoading && hasNoTasks) {
      router.replace("/first-bird");
    }
  }, [tasksLoading, hasNoTasks, router]);

  if (tasksLoading || hasNoTasks) {
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

  return <>{children}</>;
}

function BirdScreen() {
  const [addOpen, setAddOpen] = useState(false);
  const [displayTask, setDisplayTask] = useState<Task | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSingleBirdPrompt, setShowSingleBirdPrompt] = useState(false);

  const { data, loading } = useQuery<{ currentBird: Task | null }>(CURRENT_BIRD_QUERY);
  const { data: flockData } = useQuery<{ flock: Task[] }>(FLOCK_QUERY);

  const flockCount = flockData?.flock?.length ?? 0;

  const [completeTask, { loading: completing }] = useMutation<
    {
      completeTask:
        | (Pick<Task, "id" | "status" | "completedAt"> & { __typename?: string })
        | null;
    },
    { id: string }
  >(COMPLETE_TASK_MUTATION);

  const [skipTask, { loading: skipping }] = useMutation(SKIP_TASK_MUTATION);

  const currentBird = data?.currentBird ?? null;

  useEffect(() => {
    if (!isTransitioning) {
      setDisplayTask(currentBird);
    }
  }, [currentBird, isTransitioning]);

  useEffect(() => {
    if (flockCount > 1) {
      setShowSingleBirdPrompt(false);
    }
  }, [flockCount]);

  const runWithTransition = useCallback(
    async (action: () => Promise<void>) => {
      if (!displayTask) return;
      setIsTransitioning(true);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      try {
        await action();
      } catch (error) {
        notify(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        window.setTimeout(() => setIsTransitioning(false), 180);
      }
    },
    [displayTask],
  );

  const handleDone = () =>
    runWithTransition(async () => {
      if (!displayTask) return;
      const optimisticCompletedAt = new Date().toISOString();
      await completeTask({
        variables: { id: displayTask.id },
        optimisticResponse: {
          completeTask: {
            __typename: "TaskType",
            id: displayTask.id,
            status: "DONE",
            completedAt: optimisticCompletedAt,
          },
        },
        update(cache, result) {
          const completedAt = result.data?.completeTask?.completedAt ?? optimisticCompletedAt;
          markTaskDoneInCache(cache, displayTask, completedAt, [1, 50]);
        },
      });
    });

  const handleSkip = useCallback(() => {
    if (flockCount <= 1) {
      setShowSingleBirdPrompt(true);
      return;
    }
    void runWithTransition(async () => {
      if (!displayTask) return;
      await skipTask({
        variables: { id: displayTask.id },
        optimisticResponse: {
          skipTask: {
            __typename: "TaskType",
            id: displayTask.id,
            position: flockCount - 1,
          },
        },
        update(cache) {
          skipTaskInCache(cache, displayTask.id);
        },
      });
    });
  }, [displayTask, flockCount, runWithTransition, skipTask]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (addOpen) return;
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        void handleDone();
      }
      if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        void handleSkip();
      }
      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        setAddOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addOpen, handleDone, handleSkip]);

  const handleTaskAdded = useCallback((task: Task) => {
    setDisplayTask(task);
    setShowSingleBirdPrompt(false);
  }, []);

  const busy = loading || completing || skipping || isTransitioning;

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
        {loading && !data ? (
          <p className="text-ink/40">Loading…</p>
        ) : showSingleBirdPrompt && displayTask ? (
          <div className="max-w-2xl text-center">
            <p className="font-display text-2xl sm:text-3xl">
              There&apos;s only one bird currently.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSingleBirdPrompt(false)}
                className="rounded-md border border-stone/30 px-6 py-3 text-sm font-medium text-ink transition hover:border-ink/30"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="rounded-md border border-stone/30 px-6 py-3 text-sm font-medium text-ink transition hover:border-ink/30"
              >
                Add another
              </button>
            </div>
          </div>
        ) : displayTask ? (
          <div
            className={`max-w-2xl text-center transition-opacity duration-[180ms] ${
              isTransitioning ? "opacity-0" : "opacity-100"
            }`}
          >
            <BirdImage
              filename={displayTask.birdImage}
              widthPx={300}
              className="mx-auto mb-6"
            />
            <EditableTaskContent task={displayTask} variant="hero" align="center" />
          </div>
        ) : (
          <div className="text-center">
            <BirdImage filename="Artboard14.svg" widthPx={300} className="mx-auto mb-6" />
            <p className="text-ink/40">No more birds</p>
          </div>
        )}
      </section>

      {!showSingleBirdPrompt ? (
        <div className="flex justify-center px-6 pb-8">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {displayTask ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleDone()}
                  disabled={busy}
                  className="min-w-[7rem] rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-50"
                  aria-label="Mark task done"
                >
                  {completing ? "Done…" : "Done"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSkip()}
                  disabled={busy}
                  className="min-w-[7rem] rounded-md border border-stone/30 px-6 py-3 text-sm font-medium text-ink transition hover:border-ink/30 disabled:opacity-50"
                  aria-label="Skip task"
                >
                  {skipping ? "Skip…" : "Skip"}
                </button>
              </>
            ) : null}
            {displayTask ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-stone/30 text-xl font-medium leading-none text-ink transition hover:border-ink/30"
                aria-label="Add a new bird"
              >
                +
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-fg transition hover:bg-accent/90"
                aria-label="Add a new bird"
              >
                + add a new bird
              </button>
            )}
          </div>
        </div>
      ) : null}

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        focusNewTask
        onAdded={handleTaskAdded}
      />
    </main>
  );
}
