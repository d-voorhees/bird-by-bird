"use client";

import { useMutation } from "@apollo/client/react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { BirdImage } from "@/components/BirdImage";
import { EditableTaskContent, taskEditRefetchQueries } from "@/components/EditableTaskContent";
import { FlockRowText } from "@/components/FlockRowText";
import { notify } from "@/components/ToastHost";
import { DragReorderButton, SquareCheckbox } from "@/components/SquareCheckbox";
import { friendlyErrorMessage } from "@/lib/errors";
import {
  COMPLETE_TASK_MUTATION,
  CURRENT_BIRD_QUERY,
  CUSTOM_SECTION_QUERY,
  DELETE_TASK_MUTATION,
  FLOCK_QUERY,
  FLYING_LATER_QUERY,
  HISTORY_QUERY,
} from "@/lib/graphql/operations";
import { markTaskDoneInCache } from "@/lib/taskCache";
import type { Task } from "@/lib/types";

export function TaskListDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="relative -m-3 p-3">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-2xl bg-accent/25 blur-lg transition-opacity duration-200 ${
          isOver ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="relative rounded-lg">{children}</div>
    </div>
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

export function TaskRow({
  task,
  captionLabel,
  onEdit,
}: {
  task: Task;
  captionLabel?: string;
  onEdit: (task: Task) => void;
}) {
  const refetch = [
    { query: FLOCK_QUERY },
    { query: FLYING_LATER_QUERY },
    { query: CUSTOM_SECTION_QUERY },
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
                captionLabel ? " flock-row__text--has-label" : ""
              }`}
            >
              {captionLabel ? (
                <p className="mb-0 text-[10px] uppercase tracking-wide text-ink/45">{captionLabel}</p>
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
