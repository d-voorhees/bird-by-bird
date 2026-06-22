export type Task = {
  id: string;
  title: string;
  notes?: string | null;
  status: "ACTIVE" | "DONE" | "ABANDONED";
  position: number;
  birdImage?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
};

export function groupTasksByDay(tasks: Task[]): { label: string; tasks: Task[] }[] {
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    const dateSource = task.completedAt ?? task.createdAt;
    const date = new Date(dateSource);
    const label = date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const existing = groups.get(label) ?? [];
    existing.push(task);
    groups.set(label, existing);
  }

  return Array.from(groups.entries()).map(([label, groupedTasks]) => ({
    label,
    tasks: groupedTasks,
  }));
}

export function isCompletedToday(task: Task): boolean {
  if (!task.completedAt) return false;
  const today = new Date();
  const completed = new Date(task.completedAt);
  return (
    completed.getFullYear() === today.getFullYear() &&
    completed.getMonth() === today.getMonth() &&
    completed.getDate() === today.getDate()
  );
}

export function filterCompletedToday(tasks: Task[]): Task[] {
  return tasks.filter(isCompletedToday);
}

export function countCompletedToday(tasks: Task[]): number {
  return filterCompletedToday(tasks).length;
}
