"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback, useEffect, useState } from "react";

import { notify } from "@/components/ToastHost";
import { taskEditRefetchQueries } from "@/components/EditableTaskContent";
import { friendlyErrorMessage } from "@/lib/errors";
import { COMPLETE_TASK_MUTATION, UPDATE_TASK_MUTATION } from "@/lib/graphql/operations";
import { markTaskDoneInCache } from "@/lib/taskCache";
import type { Task } from "@/lib/types";

type EditTaskModalProps = {
  task: Task | null;
  onClose: () => void;
};

export function EditTaskModal({ task, onClose }: EditTaskModalProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [updateTask, { loading }] = useMutation(UPDATE_TASK_MUTATION, {
    refetchQueries: taskEditRefetchQueries(),
  });
  const [completeTask, { loading: completing }] = useMutation<
    {
      completeTask:
        | (Pick<Task, "id" | "status" | "completedAt"> & { __typename?: string })
        | null;
    },
    { id: string }
  >(COMPLETE_TASK_MUTATION);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? "");
      setShowNotes(Boolean(task.notes?.trim()));
    }
  }, [task]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!task) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [task, handleClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      await updateTask({
        variables: {
          id: task.id,
          title: trimmed,
          notes: notes.trim() || null,
        },
      });
      handleClose();
    } catch (error) {
      notify(friendlyErrorMessage(error, "Could not update task"));
    }
  };

  const handleMarkFinished = async () => {
    if (!task) return;
    const optimisticCompletedAt = new Date().toISOString();

    try {
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
      handleClose();
    } catch (error) {
      notify(friendlyErrorMessage(error, "Could not mark task finished"));
    }
  };

  if (!task) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/20 p-4 sm:items-center"
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-paper p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
      >
        <h2 id="edit-task-title" className="sr-only">
          Edit task
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs doing?"
            maxLength={280}
            enterKeyHint="done"
            autoFocus
            className="w-full border-b border-stone/30 bg-transparent py-2 text-lg text-ink outline-none placeholder:text-ink/35 focus:border-accent"
            aria-label="Task title"
          />

          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-sm text-ink/50 transition hover:text-ink"
            >
              + Notes
            </button>
          ) : (
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes"
              rows={3}
              className="w-full resize-none rounded-md border border-stone/30 bg-surface/50 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              aria-label="Task notes"
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md px-4 py-2 text-sm text-ink/60 transition hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save"}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={completing}
              onClick={() => void handleMarkFinished()}
              className="text-xs leading-none text-ink/50 underline-offset-2 transition hover:text-ink hover:underline disabled:opacity-50"
            >
              {completing ? "Marking finished…" : "mark task finished"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
