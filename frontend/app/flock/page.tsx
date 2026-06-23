"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProtectedShell } from "@/components/AuthShell";
import { AddTaskModal } from "@/components/AddTaskModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BirdImage } from "@/components/BirdImage";
import { EditableTaskContent, taskEditRefetchQueries } from "@/components/EditableTaskContent";
import { FlockRowText } from "@/components/FlockRowText";
import { CompletedTaskRow } from "@/components/CompletedTaskRow";
import { CreditsLink } from "@/components/CreditsLink";
import {
  FlockListFooter,
  FlockSecondaryButton,
  FlockSecondaryLink,
} from "@/components/FlockSecondaryAction";
import { DragReorderButton, SquareCheckbox } from "@/components/SquareCheckbox";
import { notify } from "@/components/ToastHost";
import {
  COMPLETE_TASK_MUTATION,
  CURRENT_BIRD_QUERY,
  DELETE_TASK_MUTATION,
  FLOCK_QUERY,
  HISTORY_QUERY,
  REORDER_TASKS_MUTATION,
} from "@/lib/graphql/operations";
import { markTaskDoneInCache } from "@/lib/taskCache";
import { filterCompletedToday, isCompletedToday, type Task } from "@/lib/types";

export default function FlockPage() {
  return (
    <ProtectedShell>
      <FlockScreen />
    </ProtectedShell>
  );
}

function FlockScreen() {
  const [addOpen, setAddOpen] = useState(false);

  const {
    data: flockData,
    loading: flockLoading,
    error: flockError,
  } = useQuery<{ flock: Task[] }>(FLOCK_QUERY);
  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
  } = useQuery<{ history: Task[] }>(HISTORY_QUERY, {
    variables: { limit: 50, offset: 0 },
  });

  const flockFromServer = flockData?.flock ?? [];
  const [orderedTasks, setOrderedTasks] = useState<Task[]>([]);
  const pendingOrderRef = useRef<string | null>(null);

  useEffect(() => {
    const serverIds = flockFromServer.map((task) => task.id).join(",");
    if (pendingOrderRef.current === serverIds) {
      pendingOrderRef.current = null;
      return;
    }
    setOrderedTasks(flockFromServer);
  }, [flockFromServer]);

  const flownTasks = useMemo(() => historyData?.history ?? [], [historyData?.history]);
  const tasksFlownToday = useMemo(
    () => filterCompletedToday(flownTasks),
    [flownTasks],
  );
  const hasOlderHistory = useMemo(
    () => flownTasks.some((task) => !isCompletedToday(task)),
    [flownTasks],
  );
  const completedToday = tasksFlownToday.length;

  const [reorderTasks] = useMutation(REORDER_TASKS_MUTATION);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedTasks.findIndex((task) => task.id === String(active.id));
      const newIndex = orderedTasks.findIndex((task) => task.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(orderedTasks, oldIndex, newIndex);
      const orderedIds = reordered.map((task) => task.id);
      pendingOrderRef.current = orderedIds.join(",");
      setOrderedTasks(reordered);

      try {
        await reorderTasks({
          variables: { orderedIds },
          update(cache) {
            cache.writeQuery({ query: FLOCK_QUERY, data: { flock: reordered } });
            cache.writeQuery({
              query: CURRENT_BIRD_QUERY,
              data: { currentBird: reordered[0] ?? null },
            });
          },
        });
      } catch (error) {
        pendingOrderRef.current = null;
        setOrderedTasks(flockFromServer);
        notify(error instanceof Error ? error.message : "Could not reorder tasks");
      }
    },
    [orderedTasks, flockFromServer, reorderTasks],
  );

  return (
    <main className="page-flock flex min-h-screen flex-col bg-paper text-ink">
      <header className="border-b border-stone/20 px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg">
            ← Focus
          </Link>
          <div className="flex items-center gap-4">
            <p className="text-sm text-ink/55">
              {completedToday} completed today ·{" "}
              <Link href="/history" className="underline-offset-2 hover:underline">
                History
              </Link>
            </p>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <h1 className="mb-8 font-display text-2xl">Flock</h1>

        <div className="space-y-12">
          <section aria-labelledby="awaiting-flight-heading">
            <h2
              id="awaiting-flight-heading"
              className="mb-4 font-display text-lg text-ink"
            >
              Awaiting flight
            </h2>
            {flockLoading && !flockData ? (
              <p className="text-sm text-ink/40">Loading…</p>
            ) : flockError ? (
              <p className="text-sm text-red-800">Could not load awaiting tasks.</p>
            ) : orderedTasks.length === 0 ? (
              <FlockListFooter
                list={<p className="text-sm text-ink/40">No birds waiting.</p>}
                action={
                  <FlockSecondaryButton onClick={() => setAddOpen(true)}>
                    add another
                  </FlockSecondaryButton>
                }
              />
            ) : (
              <FlockListFooter
                list={
                  <div className="flock-list space-y-2">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => void handleDragEnd(event)}
                    >
                      <SortableContext
                        items={orderedTasks.map((task) => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {orderedTasks.map((task) => (
                          <AwaitingFlightRow key={task.id} task={task} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                }
                action={
                  <FlockSecondaryButton onClick={() => setAddOpen(true)}>
                    add another
                  </FlockSecondaryButton>
                }
              />
            )}
          </section>

          <section aria-labelledby="flown-heading">
            <h2 id="flown-heading" className="mb-4 font-display text-lg text-ink">
              This bird has flown
            </h2>
            {historyLoading && !historyData ? (
              <p className="text-sm text-ink/40">Loading…</p>
            ) : historyError ? (
              <p className="text-sm text-red-800">Could not load completed tasks.</p>
            ) : flownTasks.length === 0 ? (
              <p className="text-sm text-ink/40">Nothing completed yet today.</p>
            ) : tasksFlownToday.length === 0 ? (
              <FlockListFooter
                list={<p className="text-sm text-ink/40">Nothing completed yet today.</p>}
                action={
                  hasOlderHistory ? (
                    <FlockSecondaryLink href="/history">older history</FlockSecondaryLink>
                  ) : undefined
                }
              />
            ) : (
              <FlockListFooter
                list={
                  <div className="flock-list space-y-2">
                    {tasksFlownToday.map((task) => (
                      <CompletedTaskRow key={task.id} task={task} showBird />
                    ))}
                  </div>
                }
                action={
                  hasOlderHistory ? (
                    <FlockSecondaryLink href="/history">older history</FlockSecondaryLink>
                  ) : undefined
                }
              />
            )}
          </section>
        </div>
      </section>

      <CreditsLink />

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </main>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M3 4.5H13M6 4.5V3.5H10V4.5M5.5 4.5L6 13H10L10.5 4.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function AwaitingFlightRow({ task }: { task: Task }) {
  const refetch = [
    { query: FLOCK_QUERY },
    { query: CURRENT_BIRD_QUERY },
    { query: HISTORY_QUERY, variables: { limit: 50, offset: 0 } },
  ];

  const [completeTask, { loading: completing }] = useMutation<
    {
      completeTask:
        | (Pick<Task, "id" | "status" | "completedAt"> & { __typename?: string })
        | null;
    },
    { id: string }
  >(COMPLETE_TASK_MUTATION);
  const [deleteTask, { loading: deleting }] = useMutation(DELETE_TASK_MUTATION, {
    refetchQueries: refetch,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: task.id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Action failed");
    }
  };

  const busy = completing || deleting;

  const handleComplete = async () => {
    const optimisticCompletedAt = new Date().toISOString();

    await completeTask({
      variables: { id: task.id },
      optimisticResponse: {
        completeTask: {
          __typename: "TaskType",
          id: task.id,
          status: "DONE",
          completedAt: optimisticCompletedAt,
        },
      },
      update(cache, result) {
        const completedAt = result.data?.completeTask?.completedAt ?? optimisticCompletedAt;
        markTaskDoneInCache(cache, task, completedAt, [50]);
      },
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flock-list-item rounded-lg border border-stone/20 bg-surface/40 px-3 py-2 ${
        isDragging ? "z-10 opacity-90" : ""
      }`}
    >
      <div className="flock-row">
        <SquareCheckbox
          checked={false}
          disabled={busy}
          label={`Mark ${task.title} done`}
          onToggle={() => void runAction(handleComplete)}
        />

        <BirdImage filename={task.birdImage} widthPx={100} />

        <FlockRowText task={task}>
          <EditableTaskContent
            task={task}
            variant="inline"
            refetchQueries={taskEditRefetchQueries()}
          />
        </FlockRowText>

        <div className="flock-row__actions">
          <DragReorderButton
            label={`Reorder ${task.title}`}
            listeners={listeners}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction(() => deleteTask({ variables: { id: task.id } }))}
            className="flock-action-btn text-ink/60 hover:text-red-700 dark:hover:text-red-400"
            aria-label={`Delete ${task.title}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
