"use client";

import { useMutation } from "@apollo/client/react";
import type { DocumentNode } from "graphql";
import { useEffect, useRef, useState } from "react";

import { notify } from "@/components/ToastHost";
import {
  CURRENT_BIRD_QUERY,
  FLOCK_QUERY,
  HISTORY_QUERY,
  UPDATE_TASK_MUTATION,
} from "@/lib/graphql/operations";
import type { Task } from "@/lib/types";

type RefetchQuery = {
  query: DocumentNode;
  variables?: Record<string, unknown>;
};

type EditableTaskContentProps = {
  task: Task;
  variant: "hero" | "inline";
  completed?: boolean;
  align?: "left" | "center";
  refetchQueries?: RefetchQuery[];
  className?: string;
};

export function taskEditRefetchQueries(historyLimit = 50): RefetchQuery[] {
  return [
    { query: CURRENT_BIRD_QUERY },
    { query: FLOCK_QUERY },
    { query: HISTORY_QUERY, variables: { limit: historyLimit, offset: 0 } },
  ];
}

export function EditableTaskContent({
  task,
  variant,
  completed = false,
  align = variant === "hero" ? "center" : "left",
  refetchQueries = taskEditRefetchQueries(),
  className = "",
}: EditableTaskContentProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes ?? "");
  }, [task.id, task.title, task.notes]);

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (editingNotes) {
      notesInputRef.current?.focus();
    }
  }, [editingNotes]);

  const [updateTask] = useMutation(UPDATE_TASK_MUTATION, { refetchQueries });

  const persistTitle = async () => {
    setEditingTitle(false);
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      return;
    }
    if (trimmed === task.title) {
      setTitle(task.title);
      return;
    }
    try {
      await updateTask({ variables: { id: task.id, title: trimmed } });
    } catch (error) {
      setTitle(task.title);
      notify(error instanceof Error ? error.message : "Could not update title");
    }
  };

  const persistNotes = async () => {
    setEditingNotes(false);
    const trimmed = notes.trim();
    const current = task.notes?.trim() ?? "";
    if (trimmed === current) {
      setNotes(task.notes ?? "");
      return;
    }
    try {
      await updateTask({ variables: { id: task.id, notes: trimmed } });
    } catch (error) {
      setNotes(task.notes ?? "");
      notify(error instanceof Error ? error.message : "Could not update notes");
    }
  };

  const hasNotes = Boolean(task.notes?.trim());
  const titleOnly = variant === "inline" && !hasNotes && !editingNotes;

  const titleClass =
    variant === "hero"
      ? "font-display text-3xl leading-tight sm:text-4xl md:text-5xl"
      : completed
        ? "font-medium text-ink/75 line-through decoration-ink/25"
        : "font-medium text-ink";

  const titleEditClass =
    variant === "hero"
      ? "font-display text-3xl sm:text-4xl md:text-5xl"
      : titleClass;

  const notesClass =
    variant === "hero"
      ? "mt-2 text-sm leading-relaxed text-ink/55 sm:text-base"
      : "task-notes-field";

  const notesEditClass =
    variant === "hero" ? "mt-2 text-sm text-ink/55 sm:text-base" : "task-notes-field";

  const textAlign = align === "center" ? "text-center" : "text-left";

  const titleElement = editingTitle ? (
    <input
      ref={titleInputRef}
      type="text"
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={() => void persistTitle()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void persistTitle();
        }
        if (event.key === "Escape") {
          setTitle(task.title);
          setEditingTitle(false);
        }
      }}
      className={`task-edit-field ${titleEditClass} ${textAlign}`}
      aria-label="Task title"
    />
  ) : (
    <button
      type="button"
      onClick={() => setEditingTitle(true)}
      className={`w-full border-b border-transparent hover:border-stone/30 ${titleClass} ${align === "center" ? "text-center" : "text-left"}`}
    >
      {task.title}
    </button>
  );

  if (titleOnly) {
    return (
      <div
        className={`editable-task-content--title-only min-w-0 ${textAlign} ${className}`}
      >
        <button
          type="button"
          onClick={() => setEditingNotes(true)}
          className={`task-notes-trigger--empty task-notes-trigger--overlay border-b border-transparent hover:border-stone/20 ${align === "center" ? "text-center" : "text-left"}`}
          aria-label="Task notes"
        />
        <div className="editable-task-content__title">{titleElement}</div>
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${textAlign} ${className}`}>
      {titleElement}

      {editingNotes ? (
        <textarea
          ref={notesInputRef}
          value={notes}
          rows={1}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => void persistNotes()}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void persistNotes();
            }
            if (event.key === "Escape") {
              setNotes(task.notes ?? "");
              setEditingNotes(false);
            }
          }}
          placeholder=""
          className={`task-edit-field ${notesEditClass} ${textAlign}`}
          aria-label="Task notes"
        />
      ) : hasNotes ? (
        <div className="task-notes-group">
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className={`w-full border-b border-transparent hover:border-stone/20 ${notesClass} ${align === "center" ? "text-center" : "text-left"}`}
            aria-label="Edit task notes"
          >
            {task.notes}
          </button>
        </div>
      ) : (
        <div className="task-notes-group">
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className={`task-notes-trigger--empty w-full border-b border-transparent hover:border-stone/20 ${notesClass} ${align === "center" ? "text-center" : "text-left"}`}
            aria-label="Task notes"
          />
        </div>
      )}
    </div>
  );
}
