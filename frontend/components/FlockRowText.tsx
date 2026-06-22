import type { Task } from "@/lib/types";

type FlockRowTextProps = {
  task: Pick<Task, "notes">;
  children: React.ReactNode;
};

export function FlockRowText({ task, children }: FlockRowTextProps) {
  const titleOnly = !task.notes?.trim();

  return (
    <div
      className={`flock-row__text${titleOnly ? " flock-row__text--title-only" : ""}`}
    >
      {children}
    </div>
  );
}
