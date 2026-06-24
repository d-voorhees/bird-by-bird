"use client";

import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { useMemo } from "react";

import { ProtectedShell } from "@/components/AuthShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompletedTaskRow } from "@/components/CompletedTaskRow";
import { CreditsLink } from "@/components/CreditsLink";
import { HistoryClearMenu } from "@/components/HistoryClearMenu";
import { HistoryDownloadMenu } from "@/components/HistoryDownloadMenu";
import { historyActionsRowClass } from "@/components/historyActionsStyles";
import { HISTORY_QUERY } from "@/lib/graphql/operations";
import { groupTasksByDay, type Task } from "@/lib/types";

const PAGE_SIZE = 50;

export default function HistoryPage() {
  return (
    <ProtectedShell>
      <HistoryScreen />
    </ProtectedShell>
  );
}

function HistoryScreen() {
  const { data, loading, fetchMore } = useQuery<{ history: Task[] }>(
    HISTORY_QUERY,
    { variables: { limit: PAGE_SIZE, offset: 0 } },
  );

  const tasks = useMemo(() => data?.history ?? [], [data?.history]);
  const groups = useMemo(() => groupTasksByDay(tasks), [tasks]);
  const hasMore = tasks.length > 0 && tasks.length % PAGE_SIZE === 0;

  const loadMore = async () => {
    await fetchMore({
      variables: { limit: PAGE_SIZE, offset: tasks.length },
      updateQuery: (previous, { fetchMoreResult }) => {
        if (!fetchMoreResult) return previous;
        return {
          history: [...previous.history, ...fetchMoreResult.history],
        };
      },
    });
  };

  return (
    <main className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="border-b border-stone/20 px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link href="/flock" className="font-display text-lg">
            ← Flock
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <h1 className="mb-8 font-display text-2xl">History</h1>

        {loading && tasks.length === 0 ? (
          <p className="text-ink/40">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-ink/40">Nothing completed yet.</p>
        ) : (
          <div className="space-y-8">
            {groups.map((group, index) => (
              <section key={group.label}>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h2 className="font-display text-sm font-semibold text-ink sm:text-lg">
                    <span className="sm:hidden">{group.label.replace(/,\s*\d{4}$/, "")}</span>
                    <span className="hidden sm:inline">{group.label}</span>
                  </h2>
                  {index === 0 ? (
                    <div className={historyActionsRowClass}>
                      <HistoryDownloadMenu tasks={tasks} />
                      <span className="text-ink/50" aria-hidden="true">
                        ·
                      </span>
                      <HistoryClearMenu />
                    </div>
                  ) : null}
                </div>
                <div className="flock-list space-y-2">
                  {group.tasks.map((task) => (
                    <CompletedTaskRow
                      key={task.id}
                      task={task}
                      historyLimit={PAGE_SIZE}
                      showBird
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {hasMore ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loading}
              className="rounded-md border border-stone/30 px-4 py-2 text-sm text-ink/70 transition hover:border-ink/25 hover:text-ink disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </section>

      <CreditsLink />
    </main>
  );
}
