"use client";

import { useMutation } from "@apollo/client/react";

import { BirdImage } from "@/components/BirdImage";
import { EditableTaskContent, taskEditRefetchQueries } from "@/components/EditableTaskContent";
import { FlockRowText } from "@/components/FlockRowText";
import { SquareCheckbox } from "@/components/SquareCheckbox";
import { notify } from "@/components/ToastHost";
import {
  UNCOMPLETE_TASK_MUTATION,
} from "@/lib/graphql/operations";
import { formatCompletedAt } from "@/lib/format";
import { uncompleteTaskInCache } from "@/lib/taskCache";
import type { Task } from "@/lib/types";

type CompletedTaskRowProps = {
  task: Task;
  historyLimit?: number;
  showBird?: boolean;
  className?: string;
};

export function CompletedTaskRow({
  task,
  historyLimit = 50,
  showBird = false,
  className = "flock-list-item rounded-lg border border-stone/15 bg-surface/25 px-3 py-2",
}: CompletedTaskRowProps) {
  const [uncompleteTask, { loading }] = useMutation<
    {
      uncompleteTask:
        | (Pick<Task, "id" | "status" | "position" | "completedAt"> & { __typename?: string })
        | null;
    },
    { id: string }
  >(UNCOMPLETE_TASK_MUTATION);

  const completedLabel = task.completedAt
    ? formatCompletedAt(task.completedAt)
    : null;

  const handleUncheck = async () => {
    try {
      const optimisticPosition = Number.MAX_SAFE_INTEGER;
      await uncompleteTask({
        variables: { id: task.id },
        optimisticResponse: {
          uncompleteTask: {
            __typename: "TaskType",
            id: task.id,
            status: "ACTIVE",
            position: optimisticPosition,
            completedAt: null,
          },
        },
        update(cache, result) {
          const position = result.data?.uncompleteTask?.position ?? optimisticPosition;
          uncompleteTaskInCache(cache, task, position, historyLimit);
        },
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not restore task");
    }
  };

  return (
    <div className={className}>
      <div className="flock-row">
        <SquareCheckbox
          checked={true}
          disabled={loading}
          label={`Mark ${task.title} as not done`}
          onToggle={() => void handleUncheck()}
        />
        {showBird ? <BirdImage filename={task.birdImage} widthPx={100} /> : null}
        <FlockRowText task={task}>
          <EditableTaskContent
            task={task}
            variant="inline"
            completed
            refetchQueries={taskEditRefetchQueries(historyLimit)}
          />
        </FlockRowText>
        {completedLabel ? (
          <time
            dateTime={task.completedAt ?? undefined}
            className="shrink-0 text-xs text-ink/40"
          >
            {completedLabel}
          </time>
        ) : null}
      </div>
    </div>
  );
}
