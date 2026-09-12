"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";

import { FlockListFooter, FlockSecondaryButton } from "@/components/FlockSecondaryAction";
import { TaskListDropZone, TaskRow } from "@/components/FlockTaskRow";
import type { Task } from "@/lib/types";

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

type HoldingSectionProps = {
  headingId: string;
  heading: string;
  tasks: Task[];
  loading: boolean;
  hasData: boolean;
  error: unknown;
  errorMessage: string;
  emptyMessage: string;
  containerId: string;
  collapsedContainerId: string;
  countLabel: string;
  rowCaption: string;
  show: boolean;
  onShowChange: (show: boolean) => void;
  onEdit: (task: Task) => void;
};

export function HoldingSection({
  headingId,
  heading,
  tasks,
  loading,
  hasData,
  error,
  errorMessage,
  emptyMessage,
  containerId,
  collapsedContainerId,
  countLabel,
  rowCaption,
  show,
  onShowChange,
  onEdit,
}: HoldingSectionProps) {
  const header = (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 id={headingId} className="font-display text-lg text-ink">
        {heading}
      </h2>
      <SectionCountToggle count={tasks.length} label={countLabel} />
    </div>
  );

  return (
    <section aria-labelledby={headingId}>
      {tasks.length > 0 && !show ? (
        <TaskListDropZone id={collapsedContainerId}>
          {header}
          <button
            type="button"
            onClick={() => onShowChange(true)}
            className="text-xs text-ink/55 underline-offset-2 hover:text-ink hover:underline"
          >
            show tasks
          </button>
        </TaskListDropZone>
      ) : (
        header
      )}

      {loading && !hasData ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-800">{errorMessage}</p>
      ) : tasks.length === 0 ? (
        <div className="flock-list">
          <TaskListDropZone id={containerId}>
            <p className="px-0 py-1 text-left text-sm text-ink/40">{emptyMessage}</p>
          </TaskListDropZone>
        </div>
      ) : !show ? null : (
        <FlockListFooter
          list={
            <div className="flock-list space-y-2">
              <TaskListDropZone id={containerId}>
                <SortableContext
                  items={tasks.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} captionLabel={rowCaption} onEdit={onEdit} />
                  ))}
                </SortableContext>
              </TaskListDropZone>
            </div>
          }
          action={
            <FlockSecondaryButton onClick={() => onShowChange(false)}>
              hide tasks
            </FlockSecondaryButton>
          }
        />
      )}
    </section>
  );
}
