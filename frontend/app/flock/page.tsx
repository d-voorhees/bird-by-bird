"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
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
  FLYING_LATER_QUERY,
  HISTORY_QUERY,
  REORDER_FLYING_LATER_TASKS_MUTATION,
  REORDER_TASKS_MUTATION,
  SET_TASK_STATUS_MUTATION,
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
  const [showFlyingLater, setShowFlyingLater] = useState(true);

  const {
    data: flockData,
    loading: flockLoading,
    error: flockError,
  } = useQuery<{ flock: Task[] }>(FLOCK_QUERY);
  const {
    data: flyingLaterData,
    loading: flyingLaterLoading,
    error: flyingLaterError,
  } = useQuery<{ flyingLater: Task[] }>(FLYING_LATER_QUERY);
  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
  } = useQuery<{ history: Task[] }>(HISTORY_QUERY, {
    variables: { limit: 50, offset: 0 },
  });

  const flockFromServer = useMemo(() => flockData?.flock ?? [], [flockData?.flock]);
  const flyingLaterFromServer = useMemo(
    () => flyingLaterData?.flyingLater ?? [],
    [flyingLaterData?.flyingLater],
  );
  const [awaitingTasks, setAwaitingTasks] = useState<Task[]>([]);
  const [flyingLaterTasks, setFlyingLaterTasks] = useState<Task[]>([]);
  const initializedToggleRef = useRef(false);

  useEffect(() => {
    setAwaitingTasks(flockFromServer);
  }, [flockFromServer]);

  useEffect(() => {
    setFlyingLaterTasks(flyingLaterFromServer);
  }, [flyingLaterFromServer]);

  useEffect(() => {
    if (initializedToggleRef.current) return;
    initializedToggleRef.current = true;
    const saved = window.localStorage.getItem("flock-flying-later-visible");
    if (saved !== null) {
      setShowFlyingLater(saved === "true");
    }
  }, []);

  useEffect(() => {
    if (!initializedToggleRef.current) return;
    window.localStorage.setItem("flock-flying-later-visible", String(showFlyingLater));
  }, [showFlyingLater]);

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
  const [reorderFlyingLaterTasks] = useMutation(REORDER_FLYING_LATER_TASKS_MUTATION);
  const [setTaskStatus] = useMutation(SET_TASK_STATUS_MUTATION);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const AWAITING_CONTAINER = "awaiting-flight-list";
  const FLYING_LATER_CONTAINER = "flying-later-list";

  const getContainerId = useCallback(
    (id: string) => {
      if (id === AWAITING_CONTAINER || id === FLYING_LATER_CONTAINER) return id;
      if (awaitingTasks.some((task) => task.id === id)) return AWAITING_CONTAINER;
      if (flyingLaterTasks.some((task) => task.id === id)) return FLYING_LATER_CONTAINER;
      return null;
    },
    [awaitingTasks, flyingLaterTasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      const sourceContainer = getContainerId(activeId);
      const targetContainer = getContainerId(overId);
      if (!sourceContainer || !targetContainer) return;

      const sourceList =
        sourceContainer === AWAITING_CONTAINER ? awaitingTasks : flyingLaterTasks;
      const targetList =
        targetContainer === AWAITING_CONTAINER ? awaitingTasks : flyingLaterTasks;

      const sourceIndex = sourceList.findIndex((task) => task.id === activeId);
      if (sourceIndex < 0) return;

      if (sourceContainer === targetContainer) {
        const oldIndex = sourceIndex;
        const newIndex =
          overId === targetContainer ? sourceList.length - 1 : sourceList.findIndex((t) => t.id === overId);
        if (newIndex < 0 || oldIndex === newIndex) return;

        const reordered = arrayMove(sourceList, oldIndex, newIndex);
        const orderedIds = reordered.map((task) => task.id);

        if (sourceContainer === AWAITING_CONTAINER) {
          setAwaitingTasks(reordered);
        } else {
          setFlyingLaterTasks(reordered);
        }

        try {
          if (sourceContainer === AWAITING_CONTAINER) {
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
          } else {
            await reorderFlyingLaterTasks({
              variables: { orderedIds },
              update(cache) {
                cache.writeQuery({ query: FLYING_LATER_QUERY, data: { flyingLater: reordered } });
              },
            });
          }
        } catch (error) {
          setAwaitingTasks(flockFromServer);
          setFlyingLaterTasks(flyingLaterFromServer);
          notify(error instanceof Error ? error.message : "Could not reorder tasks");
        }
        return;
      }

      const movedTask = sourceList[sourceIndex];
      const destinationIndex =
        overId === targetContainer ? targetList.length : targetList.findIndex((task) => task.id === overId);
      const insertIndex = destinationIndex < 0 ? targetList.length : destinationIndex;

      const nextSource = sourceList.filter((task) => task.id !== movedTask.id);
      const nextTarget = [...targetList];
      nextTarget.splice(insertIndex, 0, {
        ...movedTask,
        status: targetContainer === AWAITING_CONTAINER ? "ACTIVE" : "FLYING_LATER",
      });

      const nextAwaiting =
        sourceContainer === AWAITING_CONTAINER
          ? nextSource
          : targetContainer === AWAITING_CONTAINER
            ? nextTarget
            : awaitingTasks;
      const nextFlyingLater =
        sourceContainer === FLYING_LATER_CONTAINER
          ? nextSource
          : targetContainer === FLYING_LATER_CONTAINER
            ? nextTarget
            : flyingLaterTasks;

      setAwaitingTasks(nextAwaiting);
      setFlyingLaterTasks(nextFlyingLater);

      try {
        await setTaskStatus({
          variables: {
            id: movedTask.id,
            status: targetContainer === AWAITING_CONTAINER ? "ACTIVE" : "FLYING_LATER",
          },
          update(cache) {
            cache.writeQuery({ query: FLOCK_QUERY, data: { flock: nextAwaiting } });
            cache.writeQuery({ query: FLYING_LATER_QUERY, data: { flyingLater: nextFlyingLater } });
            cache.writeQuery({
              query: CURRENT_BIRD_QUERY,
              data: { currentBird: nextAwaiting[0] ?? null },
            });
          },
        });
      } catch (error) {
        setAwaitingTasks(flockFromServer);
        setFlyingLaterTasks(flyingLaterFromServer);
        notify(error instanceof Error ? error.message : "Could not move task");
      }
    },
    [
      awaitingTasks,
      flyingLaterTasks,
      flockFromServer,
      flyingLaterFromServer,
      getContainerId,
      reorderFlyingLaterTasks,
      reorderTasks,
      setTaskStatus,
    ],
  );

  return (
    <main className="page-flock flex min-h-screen flex-col bg-paper text-ink">
      <header className="border-b border-stone/20 px-4 py-3 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <Link href="/focus" className="shrink-0 font-display text-base sm:text-lg">
            ← Focus
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <p className="truncate text-xs text-ink/55 sm:text-sm">
              {completedToday} done today ·{" "}
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => void handleDragEnd(event)}
        >
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
            ) : awaitingTasks.length === 0 ? (
              <FlockListFooter
                list={
                  <div className="flock-list">
                    <TaskListDropZone id={AWAITING_CONTAINER}>
                      <p className="rounded-lg border border-dashed border-stone/25 px-3 py-3 text-sm text-ink/40">
                        No birds waiting.
                      </p>
                    </TaskListDropZone>
                  </div>
                }
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
                    <TaskListDropZone id={AWAITING_CONTAINER}>
                      <SortableContext
                        items={awaitingTasks.map((task) => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {awaitingTasks.map((task) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </SortableContext>
                    </TaskListDropZone>
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

          <section aria-labelledby="flying-later-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="flying-later-heading" className="font-display text-lg text-ink">
                Flying later ({flyingLaterTasks.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowFlyingLater((current) => !current)}
                className="text-xs text-ink/55 underline-offset-2 hover:text-ink hover:underline"
              >
                {showFlyingLater ? "hide" : "show"}
              </button>
            </div>

            {!showFlyingLater ? null : flyingLaterLoading && !flyingLaterData ? (
              <p className="text-sm text-ink/40">Loading…</p>
            ) : flyingLaterError ? (
              <p className="text-sm text-red-800">Could not load flying later tasks.</p>
            ) : flyingLaterTasks.length === 0 ? (
              <div className="flock-list">
                <TaskListDropZone id={FLYING_LATER_CONTAINER}>
                  <p className="rounded-lg border border-dashed border-stone/25 px-3 py-3 text-sm text-ink/40">
                    No birds in holding.
                  </p>
                </TaskListDropZone>
              </div>
            ) : (
              <div className="flock-list space-y-2">
                <TaskListDropZone id={FLYING_LATER_CONTAINER}>
                  <SortableContext
                    items={flyingLaterTasks.map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {flyingLaterTasks.map((task) => (
                      <TaskRow key={task.id} task={task} showFlyingLaterLabel />
                    ))}
                  </SortableContext>
                </TaskListDropZone>
              </div>
            )}
          </section>

          <section aria-labelledby="flown-heading">
            <h2 id="flown-heading" className="mb-4 font-display text-lg text-ink">
              {tasksFlownToday.length === 1 ? "This bird has flown" : "These birds have flown"}
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
        </DndContext>
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

function TaskListDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={isOver ? "rounded-lg ring-1 ring-accent/40" : undefined}>
      {children}
    </div>
  );
}

function TaskRow({
  task,
  showFlyingLaterLabel = false,
}: {
  task: Task;
  showFlyingLaterLabel?: boolean;
}) {
  const refetch = [
    { query: FLOCK_QUERY },
    { query: FLYING_LATER_QUERY },
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

        <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center">
          <FlockRowText task={task}>
            {showFlyingLaterLabel ? (
              <p className="mb-1 text-[10px] uppercase tracking-wide text-ink/45">flying later</p>
            ) : null}
            <EditableTaskContent
              task={task}
              variant="inline"
              refetchQueries={taskEditRefetchQueries()}
            />
          </FlockRowText>
          <div className="flock-row__actions pb-1.5 sm:pb-0">
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
    </div>
  );
}
