export function formatCompletedAt(iso: string): string {
  const date = new Date(iso);
  const monthDay = date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  const time = date
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s/g, "")
    .toLowerCase();

  return `${monthDay} ${time}`;
}

export function formatCsvDate(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function formatCsvTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s/g, "")
    .toLowerCase();
}
