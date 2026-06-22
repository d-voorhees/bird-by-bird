import { formatCompletedAt, formatCsvDate, formatCsvTime } from "@/lib/format";
import { groupTasksByDay, type Task } from "@/lib/types";

function finishedLabel(task: Task): string {
  const source = task.completedAt ?? task.createdAt;
  return formatCompletedAt(source);
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildHistoryMarkdown(tasks: Task[]): string {
  const groups = groupTasksByDay(tasks);
  const lines: string[] = ["# Finished birds / tasks", ""];

  for (const group of groups) {
    lines.push(`## ${group.label}`, "");
    for (const task of group.tasks) {
      lines.push(`### ${task.title}`);
      if (task.notes?.trim()) {
        lines.push(task.notes.trim());
      }
      lines.push(`Finished: ${finishedLabel(task)}`, "");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function buildHistoryCsv(tasks: Task[]): string {
  const rows = [["tasks", "notes", "date", "time"]];
  for (const task of tasks) {
    const source = task.completedAt ?? task.createdAt;
    rows.push([
      task.title,
      task.notes?.trim() ?? "",
      formatCsvDate(source),
      formatCsvTime(source),
    ]);
  }
  return `${rows.map((row) => row.map(escapeCsvField).join(",")).join("\n")}\n`;
}

function finishedBirdsFilename(extension: "md" | "csv"): string {
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

  return `finished-birds-${month}${day}${year}-${time}.${extension}`;
}

export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadHistoryMarkdown(tasks: Task[]): void {
  downloadTextFile(
    buildHistoryMarkdown(tasks),
    finishedBirdsFilename("md"),
    "text/markdown;charset=utf-8",
  );
}

export function downloadHistoryCsv(tasks: Task[]): void {
  downloadTextFile(
    buildHistoryCsv(tasks),
    finishedBirdsFilename("csv"),
    "text/csv;charset=utf-8",
  );
}
