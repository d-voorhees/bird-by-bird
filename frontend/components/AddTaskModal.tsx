"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { notify } from "@/components/ToastHost";
import {
  ADD_TASK_MUTATION,
} from "@/lib/graphql/operations";
import { addTaskInCache } from "@/lib/taskCache";
import type { Task } from "@/lib/types";

type AddTaskModalProps = {
  open: boolean;
  onClose: () => void;
  focusNewTask?: boolean;
  onAdded?: (task: Task) => void;
};

export function AddTaskModal({
  open,
  onClose,
  focusNewTask = false,
  onAdded,
}: AddTaskModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [doNext, setDoNext] = useState(false);

  const [addTask, { loading }] = useMutation<{ addTask: Task }>(ADD_TASK_MUTATION);

  const reset = useCallback(() => {
    setTitle("");
    setNotes("");
    setShowNotes(false);
    setDoNext(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (open) {
      reset();
      window.setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const shouldDoNext = focusNewTask || doNext;

    try {
      const result = await addTask({
        variables: {
          title: trimmed,
          notes: notes.trim() || null,
          doNext: shouldDoNext,
        },
        update(cache, mutationResult) {
          const newTask = mutationResult.data?.addTask;
          if (!newTask) return;
          addTaskInCache(cache, newTask, shouldDoNext);
        },
      });
      const newTask = result.data?.addTask;
      if (newTask) {
        onAdded?.(newTask);
      }
      handleClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not add task");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/20 p-4 sm:items-center"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-paper p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-title"
      >
        <h2 id="add-task-title" className="sr-only">
          Add task
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs doing?"
            maxLength={280}
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

          {!focusNewTask ? (
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={doNext}
                onChange={(event) => setDoNext(event.target.checked)}
                className="rounded border-stone/40 text-accent focus:ring-accent"
              />
              Do this next
            </label>
          ) : null}

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
              {loading ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
