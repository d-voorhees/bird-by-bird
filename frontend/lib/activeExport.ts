import { formatCsvDate, formatCsvTime } from "@/lib/format";
import { downloadTextFile, escapeCsvField } from "@/lib/historyExport";
import type { Task } from "@/lib/types";

type ActiveLabel = "current" | "later";

type ActiveSection = {
  heading: string;
  label: ActiveLabel;
  tasks: Task[];
};

function activeSections(awaitingTasks: Task[], flyingLaterTasks: Task[]): ActiveSection[] {
  return [
    { heading: "Current", label: "current", tasks: awaitingTasks },
    { heading: "Flying later", label: "later", tasks: flyingLaterTasks },
  ];
}

function oneLineNote(task: Task): string {
  return task.notes?.trim().replace(/\s+/g, " ") ?? "";
}

export function buildActiveMarkdown(awaitingTasks: Task[], flyingLaterTasks: Task[]): string {
  const lines: string[] = ["# Unfinished birds / tasks", ""];

  for (const section of activeSections(awaitingTasks, flyingLaterTasks)) {
    for (const task of section.tasks) {
      const note = oneLineNote(task);
      lines.push(`- ${task.title}${note ? ` — ${note}` : ""} (${section.label})`);
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function buildActiveCsv(awaitingTasks: Task[], flyingLaterTasks: Task[]): string {
  const rows = [["status", "task", "notes", "date", "time"]];
  for (const section of activeSections(awaitingTasks, flyingLaterTasks)) {
    for (const task of section.tasks) {
      rows.push([
        section.label,
        task.title,
        task.notes?.trim() ?? "",
        formatCsvDate(task.createdAt),
        formatCsvTime(task.createdAt),
      ]);
    }
  }
  return `${rows.map((row) => row.map(escapeCsvField).join(",")).join("\n")}\n`;
}

function activeTasksFilename(extension: "md" | "csv"): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = now.getFullYear();
  const time = now
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s/g, "")
    .replace(":", "")
    .toLowerCase();

  return `active-birds-${month}${day}${year}-${time}.${extension}`;
}

export function downloadActiveMarkdown(awaitingTasks: Task[], flyingLaterTasks: Task[]): void {
  downloadTextFile(
    buildActiveMarkdown(awaitingTasks, flyingLaterTasks),
    activeTasksFilename("md"),
    "text/markdown;charset=utf-8",
  );
}

export function downloadActiveCsv(awaitingTasks: Task[], flyingLaterTasks: Task[]): void {
  downloadTextFile(
    buildActiveCsv(awaitingTasks, flyingLaterTasks),
    activeTasksFilename("csv"),
    "text/csv;charset=utf-8",
  );
}
