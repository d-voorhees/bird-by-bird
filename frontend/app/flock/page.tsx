"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragOverEvent,
  type DragStartEvent,
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
import {
  AddTaskModal,
  openAddTaskModal,
  type AddTaskModalHandle,
} from "@/components/AddTaskModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BirdImage } from "@/components/BirdImage";
import { EditableTaskContent, taskEditRefetchQueries } from "@/components/EditableTaskContent";
import { EditTaskModal } from "@/components/EditTaskModal";
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
import { friendlyErrorMessage } from "@/lib/errors";
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
  const addTaskModalRef = useRef<AddTaskModalHandle>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFlyingLater, setShowFlyingLater] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

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
  const dragStartContainerRef = useRef<string | null>(null);
  const awaitingTasksRef = useRef<Task[]>([]);
  const flyingLaterTasksRef = useRef<Task[]>([]);

  const dedupeTaskLists = useCallback((nextAwaiting: Task[], nextFlyingLater: Task[]) => {
    const seen = new Set<string>();
    const awaiting = nextAwaiting.filter((task) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
    const flyingLater = nextFlyingLater.filter((task) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
    return {
      awaiting: awaiting.map((task) => ({ ...task, status: "ACTIVE" as const })),
      flyingLater: flyingLater.map((task) => ({ ...task, status: "FLYING_LATER" as const })),
    };
  }, []);

  const applyTaskLists = useCallback(
    (nextAwaiting: Task[], nextFlyingLater: Task[]) => {
      const deduped = dedupeTaskLists(nextAwaiting, nextFlyingLater);
      setAwaitingTasks(deduped.awaiting);
      setFlyingLaterTasks(deduped.flyingLater);
      awaitingTasksRef.current = deduped.awaiting;
      flyingLaterTasksRef.current = deduped.flyingLater;
    },
    [dedupeTaskLists],
  );

  useEffect(() => {
    applyTaskLists(flockFromServer, flyingLaterFromServer);
  }, [applyTaskLists, flockFromServer, flyingLaterFromServer]);

  useEffect(() => {
    awaitingTasksRef.current = awaitingTasks;
  }, [awaitingTasks]);

  useEffect(() => {
    flyingLaterTasksRef.current = flyingLaterTasks;
  }, [flyingLaterTasks]);

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
  const FLYING_LATER_COLLAPSED_DROP = "flying-later-collapsed-drop";

  const getContainerId = useCallback(
    (id: string) => {
      if (id === FLYING_LATER_COLLAPSED_DROP) return FLYING_LATER_CONTAINER;
      if (id === AWAITING_CONTAINER || id === FLYING_LATER_CONTAINER) return id;
      if (awaitingTasks.some((task) => task.id === id)) return AWAITING_CONTAINER;
      if (flyingLaterTasks.some((task) => task.id === id)) return FLYING_LATER_CONTAINER;
      return null;
    },
    [awaitingTasks, flyingLaterTasks],
  );

  const moveTaskAcrossLists = useCallback(
    (
      activeId: string,
      overId: string,
      targetContainer: string,
      currentAwaiting: Task[],
      currentFlyingLater: Task[],
    ) => {
      const sourceContainer = currentAwaiting.some((task) => task.id === activeId)
        ? AWAITING_CONTAINER
        : currentFlyingLater.some((task) => task.id === activeId)
          ? FLYING_LATER_CONTAINER
          : null;
      if (!sourceContainer || sourceContainer === targetContainer) return null;

      const sourceList =
        sourceContainer === AWAITING_CONTAINER ? currentAwaiting : currentFlyingLater;
      const sourceIndex = sourceList.findIndex((task) => task.id === activeId);
      if (sourceIndex < 0) return null;
      const movedTask = sourceList[sourceIndex];

      const cleanedAwaiting = currentAwaiting.filter((task) => task.id !== activeId);
      const cleanedFlyingLater = currentFlyingLater.filter((task) => task.id !== activeId);
      const targetBaseList =
        targetContainer === AWAITING_CONTAINER ? cleanedAwaiting : cleanedFlyingLater;

      const destinationIndex =
        overId === targetContainer ? targetBaseList.length : targetBaseList.findIndex((task) => task.id === overId);
      const insertIndex = destinationIndex < 0 ? targetBaseList.length : destinationIndex;
      const updatedTarget = [...targetBaseList];
      updatedTarget.splice(insertIndex, 0, {
        ...movedTask,
        status: targetContainer === AWAITING_CONTAINER ? "ACTIVE" : "FLYING_LATER",
      });

      return targetContainer === AWAITING_CONTAINER
        ? { awaiting: updatedTarget, flyingLater: cleanedFlyingLater }
        : { awaiting: cleanedAwaiting, flyingLater: updatedTarget };
    },
    [AWAITING_CONTAINER, FLYING_LATER_CONTAINER],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = String(active.id);
      const sourceContainer = dragStartContainerRef.current ?? getContainerId(activeId);
      dragStartContainerRef.current = null;

      if (!over) {
        applyTaskLists(flockFromServer, flyingLaterFromServer);
        return;
      }

      const overId = String(over.id);
      const targetContainer = getContainerId(overId);
      const finalContainer = getContainerId(activeId);
      if (!sourceContainer || !targetContainer || !finalContainer) return;

      const sourceList =
        sourceContainer === AWAITING_CONTAINER ? awaitingTasks : flyingLaterTasks;

      if (sourceContainer === finalContainer && targetContainer === finalContainer) {
        const sourceIndex = sourceList.findIndex((task) => task.id === activeId);
        if (sourceIndex < 0) return;
        const oldIndex = sourceIndex;
        const newIndex =
          overId === targetContainer
            ? sourceList.length - 1
            : sourceList.findIndex((t) => t.id === overId);
        if (newIndex < 0 || oldIndex === newIndex) return;

        const reordered = arrayMove(sourceList, oldIndex, newIndex);
        const orderedIds = reordered.map((task) => task.id);

        if (sourceContainer === AWAITING_CONTAINER) {
          applyTaskLists(reordered, flyingLaterTasksRef.current);
        } else {
          applyTaskLists(awaitingTasksRef.current, reordered);
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
          applyTaskLists(flockFromServer, flyingLaterFromServer);
          notify(friendlyErrorMessage(error, "Could not reorder tasks"));
        }
        return;
      }

      const nextAwaiting = awaitingTasksRef.current;
      const nextFlyingLater = flyingLaterTasksRef.current;
      const movedTask =
        finalContainer === AWAITING_CONTAINER
          ? nextAwaiting.find((task) => task.id === activeId)
          : nextFlyingLater.find((task) => task.id === activeId);
      if (!movedTask) return;

      const destinationStatus = finalContainer === AWAITING_CONTAINER ? "ACTIVE" : "FLYING_LATER";

      try {
        await setTaskStatus({
          variables: {
            id: activeId,
            status: destinationStatus,
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

        await reorderTasks({
          variables: { orderedIds: nextAwaiting.map((task) => task.id) },
          update(cache) {
            cache.writeQuery({ query: FLOCK_QUERY, data: { flock: nextAwaiting } });
            cache.writeQuery({
              query: CURRENT_BIRD_QUERY,
              data: { currentBird: nextAwaiting[0] ?? null },
            });
          },
        });

        await reorderFlyingLaterTasks({
          variables: { orderedIds: nextFlyingLater.map((task) => task.id) },
          update(cache) {
            cache.writeQuery({ query: FLYING_LATER_QUERY, data: { flyingLater: nextFlyingLater } });
          },
        });
      } catch (error) {
        applyTaskLists(flockFromServer, flyingLaterFromServer);
        notify(friendlyErrorMessage(error, "Could not move task"));
      }
    },
    [
      awaitingTasks,
      flyingLaterTasks,
      flockFromServer,
      flyingLaterFromServer,
      getContainerId,
      applyTaskLists,
      reorderFlyingLaterTasks,
      reorderTasks,
      setTaskStatus,
    ],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      dragStartContainerRef.current = getContainerId(String(event.active.id));
    },
    [getContainerId],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      const targetContainer = getContainerId(overId);
      if (!targetContainer) return;
      if (targetContainer === FLYING_LATER_CONTAINER && !showFlyingLater) {
        setShowFlyingLater(true);
      }

      const next = moveTaskAcrossLists(
        activeId,
        overId,
        targetContainer,
        awaitingTasksRef.current,
        flyingLaterTasksRef.current,
      );
      if (!next) return;

      applyTaskLists(next.awaiting, next.flyingLater);
    },
    [getContainerId, moveTaskAcrossLists, showFlyingLater, applyTaskLists],
  );

  const handleDragCancel = useCallback(
    () => {
      dragStartContainerRef.current = null;
      applyTaskLists(flockFromServer, flyingLaterFromServer);
    },
    [flockFromServer, flyingLaterFromServer, applyTaskLists],
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
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={handleDragCancel}
          onDragEnd={(event) => void handleDragEnd(event)}
        >
          <div className="space-y-12">
          <section aria-labelledby="awaiting-flight-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="awaiting-flight-heading" className="font-display text-lg text-ink">
                Awaiting flight
              </h2>
              <SectionCountToggle count={awaitingTasks.length} label="Awaiting flight count" />
            </div>
            {flockLoading && !flockData ? (
              <p className="text-sm text-ink/40">Loading…</p>
            ) : flockError ? (
              <p className="text-sm text-red-800">Could not load awaiting tasks.</p>
            ) : awaitingTasks.length === 0 ? (
              <FlockListFooter
                list={
                  <div className="flock-list">
                    <TaskListDropZone id={AWAITING_CONTAINER}>
                      <p className="text-sm text-ink/40">No birds waiting.</p>
                    </TaskListDropZone>
                  </div>
                }
                action={
                  <FlockSecondaryButton
                    onClick={() => openAddTaskModal(setAddOpen, addTaskModalRef)}
                  >
                    add new task
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
                          <TaskRow key={task.id} task={task} onEdit={setEditingTask} />
                        ))}
                      </SortableContext>
                    </TaskListDropZone>
                  </div>
                }
                action={
                  <FlockSecondaryButton
                    onClick={() => openAddTaskModal(setAddOpen, addTaskModalRef)}
                  >
                    add another
                  </FlockSecondaryButton>
                }
              />
            )}
          </section>

          <section aria-labelledby="flying-later-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="flying-later-heading" className="font-display text-lg text-ink">
                Flying later
              </h2>
              <SectionCountToggle count={flyingLaterTasks.length} label="Flying later count" />
            </div>

            {flyingLaterLoading && !flyingLaterData ? (
              <p className="text-sm text-ink/40">Loading…</p>
            ) : flyingLaterError ? (
              <p className="text-sm text-red-800">Could not load flying later tasks.</p>
            ) : flyingLaterTasks.length === 0 ? (
              <div className="flock-list">
                <TaskListDropZone id={FLYING_LATER_CONTAINER}>
                  <p className="px-0 py-1 text-left text-sm text-ink/40">
                    No birds in holding.
                  </p>
                </TaskListDropZone>
              </div>
            ) : !showFlyingLater ? null : (
              <FlockListFooter
                list={
                  <div className="flock-list space-y-2">
                    <TaskListDropZone id={FLYING_LATER_CONTAINER}>
                      <SortableContext
                        items={flyingLaterTasks.map((task) => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {flyingLaterTasks.map((task) => (
                          <TaskRow key={task.id} task={task} showFlyingLaterLabel onEdit={setEditingTask} />
                        ))}
                      </SortableContext>
                    </TaskListDropZone>
                  </div>
                }
                action={
                  <FlockSecondaryButton onClick={() => setShowFlyingLater(false)}>
                    hide tasks
                  </FlockSecondaryButton>
                }
              />
            )}
            {flyingLaterTasks.length > 0 && !showFlyingLater ? (
              <TaskListDropZone id={FLYING_LATER_COLLAPSED_DROP}>
                <button
                  type="button"
                  onClick={() => setShowFlyingLater(true)}
                  className="text-xs text-ink/55 underline-offset-2 hover:text-ink hover:underline"
                >
                  show tasks
                </button>
              </TaskListDropZone>
            ) : null}
          </section>

          <section aria-labelledby="flown-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="flown-heading" className="font-display text-lg text-ink">
                {tasksFlownToday.length === 1 ? "This bird has flown" : "These birds have flown"}
              </h2>
              <span className="text-xs text-ink/45" aria-label="Flown today count">
                {tasksFlownToday.length}
              </span>
            </div>
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
                    <div className="flex justify-end">
                      <FlockSecondaryLink href="/history">older history</FlockSecondaryLink>
                    </div>
                  ) : undefined
                }
              />
            ) : !showCompleted ? null : (
              <FlockListFooter
                list={
                  <div className="flock-list space-y-2">
                    {tasksFlownToday.map((task) => (
                      <CompletedTaskRow key={task.id} task={task} showBird />
                    ))}
                  </div>
                }
                action={
                  <div className="flex items-center justify-between">
                    <FlockSecondaryButton onClick={() => setShowCompleted(false)}>
                      hide completed
                    </FlockSecondaryButton>
                    {hasOlderHistory ? (
                      <FlockSecondaryLink href="/history">older history</FlockSecondaryLink>
                    ) : null}
                  </div>
                }
              />
            )}
            {tasksFlownToday.length > 0 && !showCompleted ? (
              <button
                type="button"
                onClick={() => setShowCompleted(true)}
                className="text-xs text-ink/55 underline-offset-2 hover:text-ink hover:underline"
              >
                show completed
              </button>
            ) : null}
          </section>
          </div>
        </DndContext>
      </section>

      <CreditsLink />

      <AddTaskModal
        ref={addTaskModalRef}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />

      <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />
    </main>
  );
}

function SectionCountToggle({ count, label }: { count: number; label: string }) {
  const [show, setShow] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setShow((prev) => !prev)}
      aria-label={label}
      className="text-xs text-ink/45 underline-offset-2 hover:text-ink/70 hover:underline"
    >
      {show ? count : "show count"}
    </button>
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
  onEdit,
}: {
  task: Task;
  showFlyingLaterLabel?: boolean;
  onEdit: (task: Task) => void;
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
      notify(friendlyErrorMessage(error, "Action failed"));
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
      onDoubleClick={() => onEdit(task)}
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
            <div
              className={`flex min-w-0 flex-1 flex-col${
                showFlyingLaterLabel ? " flock-row__text--has-label" : ""
              }`}
            >
              {showFlyingLaterLabel ? (
                <p className="mb-0 text-[10px] uppercase tracking-wide text-ink/45">flying later</p>
              ) : null}
              <EditableTaskContent
                task={task}
                variant="inline"
                refetchQueries={taskEditRefetchQueries()}
              />
            </div>
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
