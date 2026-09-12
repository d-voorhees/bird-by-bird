"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragOverEvent,
  type DragStartEvent,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProtectedShell } from "@/components/AuthShell";
import { ActiveDownloadMenu } from "@/components/ActiveDownloadMenu";
import {
  AddSectionModal,
} from "@/components/AddSectionModal";
import {
  AddTaskModal,
  openAddTaskModal,
  type AddTaskModalHandle,
} from "@/components/AddTaskModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EditTaskModal } from "@/components/EditTaskModal";
import { CompletedTaskRow } from "@/components/CompletedTaskRow";
import { CreditsLink } from "@/components/CreditsLink";
import {
  FlockListFooter,
  FlockSecondaryButton,
  FlockSecondaryLink,
} from "@/components/FlockSecondaryAction";
import { TaskListDropZone, TaskRow } from "@/components/FlockTaskRow";
import { HoldingSection } from "@/components/HoldingSection";
import { historyActionsRowClass } from "@/components/historyActionsStyles";
import { useAuth } from "@/components/Providers";
import { notify } from "@/components/ToastHost";
import { friendlyErrorMessage } from "@/lib/errors";
import {
  CURRENT_BIRD_QUERY,
  CUSTOM_SECTION_QUERY,
  FLOCK_QUERY,
  FLYING_LATER_QUERY,
  HISTORY_QUERY,
  REORDER_CUSTOM_SECTION_TASKS_MUTATION,
  REORDER_FLYING_LATER_TASKS_MUTATION,
  REORDER_TASKS_MUTATION,
  SET_TASK_STATUS_MUTATION,
} from "@/lib/graphql/operations";
import { filterCompletedToday, isCompletedToday, type Task } from "@/lib/types";

export default function FlockPage() {
  return (
    <ProtectedShell>
      <FlockScreen />
    </ProtectedShell>
  );
}

type ContainerKey = "awaiting" | "flyingLater" | "custom";

const CONTAINER_IDS: Record<ContainerKey, string> = {
  awaiting: "awaiting-flight-list",
  flyingLater: "flying-later-list",
  custom: "custom-section-list",
};

const COLLAPSED_CONTAINER_IDS: Record<ContainerKey, string> = {
  awaiting: "awaiting-flight-list",
  flyingLater: "flying-later-collapsed-drop",
  custom: "custom-section-collapsed-drop",
};

const STATUS_BY_KEY: Record<ContainerKey, Task["status"]> = {
  awaiting: "ACTIVE",
  flyingLater: "FLYING_LATER",
  custom: "CUSTOM",
};

const CONTAINER_KEYS = Object.keys(CONTAINER_IDS) as ContainerKey[];

const SECTION_OPEN_HOVER_DELAY_MS = 2000;

type TaskLists = Record<ContainerKey, Task[]>;

function FlockScreen() {
  const { user } = useAuth();
  const customSectionName = user?.customSectionName ?? null;

  const [addOpen, setAddOpen] = useState(false);
  const addTaskModalRef = useRef<AddTaskModalHandle>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFlyingLater, setShowFlyingLater] = useState(true);
  const [showCustomSection, setShowCustomSection] = useState(true);
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
    data: customSectionData,
    loading: customSectionLoading,
    error: customSectionError,
  } = useQuery<{ customSection: Task[] }>(CUSTOM_SECTION_QUERY);
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
  const customSectionFromServer = useMemo(
    () => customSectionData?.customSection ?? [],
    [customSectionData?.customSection],
  );

  const [lists, setLists] = useState<TaskLists>({ awaiting: [], flyingLater: [], custom: [] });
  const initializedToggleRef = useRef(false);
  const dragStartContainerRef = useRef<ContainerKey | null>(null);
  const listsRef = useRef<TaskLists>(lists);
  const hoverOpenRef = useRef<{ overId: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const dedupeLists = useCallback((next: TaskLists): TaskLists => {
    const seen = new Set<string>();
    const result = {} as TaskLists;
    for (const key of CONTAINER_KEYS) {
      result[key] = next[key]
        .filter((task) => {
          if (seen.has(task.id)) return false;
          seen.add(task.id);
          return true;
        })
        .map((task) => ({ ...task, status: STATUS_BY_KEY[key] }));
    }
    return result;
  }, []);

  const applyLists = useCallback(
    (next: TaskLists) => {
      const deduped = dedupeLists(next);
      setLists(deduped);
      listsRef.current = deduped;
    },
    [dedupeLists],
  );

  const serverLists = useMemo<TaskLists>(
    () => ({
      awaiting: flockFromServer,
      flyingLater: flyingLaterFromServer,
      custom: customSectionFromServer,
    }),
    [flockFromServer, flyingLaterFromServer, customSectionFromServer],
  );

  useEffect(() => {
    applyLists(serverLists);
  }, [applyLists, serverLists]);

  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  useEffect(() => {
    if (initializedToggleRef.current) return;
    initializedToggleRef.current = true;
    const savedFlyingLater = window.localStorage.getItem("flock-flying-later-visible");
    if (savedFlyingLater !== null) {
      setShowFlyingLater(savedFlyingLater === "true");
    }
    const savedCustom = window.localStorage.getItem("flock-custom-section-visible");
    if (savedCustom !== null) {
      setShowCustomSection(savedCustom === "true");
    }
  }, []);

  useEffect(() => {
    if (!initializedToggleRef.current) return;
    window.localStorage.setItem("flock-flying-later-visible", String(showFlyingLater));
  }, [showFlyingLater]);

  useEffect(() => {
    if (!initializedToggleRef.current) return;
    window.localStorage.setItem("flock-custom-section-visible", String(showCustomSection));
  }, [showCustomSection]);

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
  const [reorderCustomSectionTasks] = useMutation(REORDER_CUSTOM_SECTION_TASKS_MUTATION);
  const [setTaskStatus] = useMutation(SET_TASK_STATUS_MUTATION);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const getContainerKey = useCallback(
    (id: string): ContainerKey | null => {
      for (const key of CONTAINER_KEYS) {
        if (id === CONTAINER_IDS[key] || id === COLLAPSED_CONTAINER_IDS[key]) return key;
      }
      for (const key of CONTAINER_KEYS) {
        if (lists[key].some((task) => task.id === id)) return key;
      }
      return null;
    },
    [lists],
  );

  const moveTaskAcrossLists = useCallback(
    (
      activeId: string,
      overId: string,
      targetKey: ContainerKey,
      current: TaskLists,
      insertIndexOverride?: number,
    ): TaskLists | null => {
      const sourceKey = CONTAINER_KEYS.find((key) => current[key].some((task) => task.id === activeId));
      if (!sourceKey || sourceKey === targetKey) return null;

      const sourceList = current[sourceKey];
      const sourceIndex = sourceList.findIndex((task) => task.id === activeId);
      if (sourceIndex < 0) return null;
      const movedTask = sourceList[sourceIndex];

      const targetBaseList = current[targetKey];
      const destinationIndex =
        overId === CONTAINER_IDS[targetKey] || overId === COLLAPSED_CONTAINER_IDS[targetKey]
          ? targetBaseList.length
          : targetBaseList.findIndex((task) => task.id === overId);
      const insertIndex =
        insertIndexOverride ?? (destinationIndex < 0 ? targetBaseList.length : destinationIndex);
      const updatedTarget = [...targetBaseList];
      updatedTarget.splice(insertIndex, 0, { ...movedTask, status: STATUS_BY_KEY[targetKey] });

      return {
        ...current,
        [sourceKey]: sourceList.filter((task) => task.id !== activeId),
        [targetKey]: updatedTarget,
      };
    },
    [],
  );

  const clearHoverOpenTimer = useCallback(() => {
    if (hoverOpenRef.current) {
      clearTimeout(hoverOpenRef.current.timer);
      hoverOpenRef.current = null;
    }
  }, []);

  useEffect(() => clearHoverOpenTimer, [clearHoverOpenTimer]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      clearHoverOpenTimer();
      const { active, over } = event;
      const activeId = String(active.id);
      const sourceKey = dragStartContainerRef.current ?? getContainerKey(activeId);
      dragStartContainerRef.current = null;

      if (!over) {
        applyLists(serverLists);
        return;
      }

      const overId = String(over.id);
      const targetKey = getContainerKey(overId);
      const finalKey = getContainerKey(activeId);
      if (!sourceKey || !targetKey || !finalKey) return;

      const sourceList = listsRef.current[sourceKey];

      if (sourceKey === finalKey && targetKey === finalKey) {
        const sourceIndex = sourceList.findIndex((task) => task.id === activeId);
        if (sourceIndex < 0) return;
        const oldIndex = sourceIndex;
        const newIndex =
          overId === CONTAINER_IDS[targetKey]
            ? sourceList.length - 1
            : sourceList.findIndex((t) => t.id === overId);
        if (newIndex < 0 || oldIndex === newIndex) return;

        const reordered = arrayMove(sourceList, oldIndex, newIndex);
        const orderedIds = reordered.map((task) => task.id);

        applyLists({ ...listsRef.current, [sourceKey]: reordered });

        try {
          if (sourceKey === "awaiting") {
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
          } else if (sourceKey === "flyingLater") {
            await reorderFlyingLaterTasks({
              variables: { orderedIds },
              update(cache) {
                cache.writeQuery({ query: FLYING_LATER_QUERY, data: { flyingLater: reordered } });
              },
            });
          } else {
            await reorderCustomSectionTasks({
              variables: { orderedIds },
              update(cache) {
                cache.writeQuery({ query: CUSTOM_SECTION_QUERY, data: { customSection: reordered } });
              },
            });
          }
        } catch (error) {
          applyLists(serverLists);
          notify(friendlyErrorMessage(error, "Could not reorder tasks"));
        }
        return;
      }

      const nextLists = listsRef.current;
      const movedTask = nextLists[finalKey].find((task) => task.id === activeId);
      if (!movedTask) return;

      const destinationStatus = STATUS_BY_KEY[finalKey];

      try {
        await setTaskStatus({
          variables: {
            id: activeId,
            status: destinationStatus,
          },
          update(cache) {
            cache.writeQuery({ query: FLOCK_QUERY, data: { flock: nextLists.awaiting } });
            cache.writeQuery({ query: FLYING_LATER_QUERY, data: { flyingLater: nextLists.flyingLater } });
            cache.writeQuery({ query: CUSTOM_SECTION_QUERY, data: { customSection: nextLists.custom } });
            cache.writeQuery({
              query: CURRENT_BIRD_QUERY,
              data: { currentBird: nextLists.awaiting[0] ?? null },
            });
          },
        });

        await reorderTasks({
          variables: { orderedIds: nextLists.awaiting.map((task) => task.id) },
          update(cache) {
            cache.writeQuery({ query: FLOCK_QUERY, data: { flock: nextLists.awaiting } });
            cache.writeQuery({
              query: CURRENT_BIRD_QUERY,
              data: { currentBird: nextLists.awaiting[0] ?? null },
            });
          },
        });

        await reorderFlyingLaterTasks({
          variables: { orderedIds: nextLists.flyingLater.map((task) => task.id) },
          update(cache) {
            cache.writeQuery({ query: FLYING_LATER_QUERY, data: { flyingLater: nextLists.flyingLater } });
          },
        });

        await reorderCustomSectionTasks({
          variables: { orderedIds: nextLists.custom.map((task) => task.id) },
          update(cache) {
            cache.writeQuery({ query: CUSTOM_SECTION_QUERY, data: { customSection: nextLists.custom } });
          },
        });
      } catch (error) {
        applyLists(serverLists);
        notify(friendlyErrorMessage(error, "Could not move task"));
      }
    },
    [
      getContainerKey,
      serverLists,
      applyLists,
      reorderFlyingLaterTasks,
      reorderCustomSectionTasks,
      reorderTasks,
      setTaskStatus,
      clearHoverOpenTimer,
    ],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      dragStartContainerRef.current = getContainerKey(String(event.active.id));
    },
    [getContainerKey],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) {
        clearHoverOpenTimer();
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);
      const targetKey = getContainerKey(overId);
      if (!targetKey) {
        clearHoverOpenTimer();
        return;
      }

      const isCollapsedTarget =
        (targetKey === "flyingLater" && !showFlyingLater) ||
        (targetKey === "custom" && !showCustomSection);

      if (isCollapsedTarget) {
        // Only open a collapsed section (and drop the task into it) after the
        // dragged task has hovered near its title for a beat, so a task just
        // passing over the header on its way elsewhere doesn't pop it open.
        if (hoverOpenRef.current?.overId !== overId) {
          clearHoverOpenTimer();
          const timer = setTimeout(() => {
            if (targetKey === "flyingLater") setShowFlyingLater(true);
            if (targetKey === "custom") setShowCustomSection(true);
            // Insert at the top, not wherever the generic drop logic would place
            // it, so it's immediately visible right as the section opens.
            const moved = moveTaskAcrossLists(activeId, overId, targetKey, listsRef.current, 0);
            if (moved) applyLists(moved);
            hoverOpenRef.current = null;
          }, SECTION_OPEN_HOVER_DELAY_MS);
          hoverOpenRef.current = { overId, timer };
        }
        return;
      }

      clearHoverOpenTimer();

      const next = moveTaskAcrossLists(activeId, overId, targetKey, listsRef.current);
      if (!next) return;

      applyLists(next);
    },
    [
      getContainerKey,
      moveTaskAcrossLists,
      showFlyingLater,
      showCustomSection,
      applyLists,
      clearHoverOpenTimer,
    ],
  );

  const handleDragCancel = useCallback(() => {
    clearHoverOpenTimer();
    dragStartContainerRef.current = null;
    applyLists(serverLists);
  }, [serverLists, applyLists, clearHoverOpenTimer]);

  const awaitingTasks = lists.awaiting;
  const flyingLaterTasks = lists.flyingLater;
  const customSectionTasks = lists.custom;

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
              <div className={historyActionsRowClass}>
                <ActiveDownloadMenu
                  awaitingTasks={awaitingTasks}
                  flyingLaterTasks={flyingLaterTasks}
                  customSectionName={customSectionName}
                  customSectionTasks={customSectionTasks}
                />
                <span className="text-ink/50" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs text-ink/45" aria-label="Awaiting flight count">
                  {awaitingTasks.length}
                </span>
              </div>
            </div>
            {flockLoading && !flockData ? (
              <p className="text-sm text-ink/40">Loading…</p>
            ) : flockError ? (
              <p className="text-sm text-red-800">Could not load awaiting tasks.</p>
            ) : awaitingTasks.length === 0 ? (
              <FlockListFooter
                list={
                  <div className="flock-list">
                    <TaskListDropZone id={CONTAINER_IDS.awaiting}>
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
                    <TaskListDropZone id={CONTAINER_IDS.awaiting}>
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

          {customSectionName ? (
            <HoldingSection
              headingId="custom-section-heading"
              heading={customSectionName}
              tasks={customSectionTasks}
              loading={customSectionLoading}
              hasData={Boolean(customSectionData)}
              error={customSectionError}
              errorMessage={`Could not load ${customSectionName.toLowerCase()} tasks.`}
              emptyMessage="No birds here."
              containerId={CONTAINER_IDS.custom}
              collapsedContainerId={COLLAPSED_CONTAINER_IDS.custom}
              countLabel={`${customSectionName} count`}
              rowCaption={customSectionName.toLowerCase()}
              show={showCustomSection}
              onShowChange={setShowCustomSection}
              onEdit={setEditingTask}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddSectionOpen(true)}
              className="font-display text-lg text-ink/40 transition hover:text-ink/60"
            >
              + Add additional section
            </button>
          )}

          <HoldingSection
            headingId="flying-later-heading"
            heading="Flying later"
            tasks={flyingLaterTasks}
            loading={flyingLaterLoading}
            hasData={Boolean(flyingLaterData)}
            error={flyingLaterError}
            errorMessage="Could not load flying later tasks."
            emptyMessage="No birds in holding."
            containerId={CONTAINER_IDS.flyingLater}
            collapsedContainerId={COLLAPSED_CONTAINER_IDS.flyingLater}
            countLabel="Flying later count"
            rowCaption="flying later"
            show={showFlyingLater}
            onShowChange={setShowFlyingLater}
            onEdit={setEditingTask}
          />

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

      <AddSectionModal open={addSectionOpen} onClose={() => setAddSectionOpen(false)} />

      <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />
    </main>
  );
}
