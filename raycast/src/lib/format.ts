import { Color, Icon } from "@raycast/api";

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function taskDate(due: string): string {
  return due.slice(0, 10);
}

export function isOverdue(due: string | null): boolean {
  return !!due && taskDate(due) < today();
}

export function isDueToday(due: string | null): boolean {
  return !!due && taskDate(due) === today();
}

export function formatDue(due: string | null): string | null {
  if (!due) return null;
  const d = taskDate(due);
  const t = today();
  if (d < t) {
    const days = Math.round((Date.parse(t) - Date.parse(d)) / 86400000);
    return days === 1 ? "Yesterday" : `${days}d overdue`;
  }
  if (d === t) return "Today";
  if (d === daysFromNow(1)) return "Tomorrow";
  const diff = Math.round((Date.parse(d) - Date.parse(t)) / 86400000);
  if (diff <= 7) return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function dueDateColor(due: string | null): Color {
  if (isOverdue(due)) return Color.Red;
  if (isDueToday(due)) return Color.Orange;
  return Color.SecondaryText;
}

// ─── Priority ────────────────────────────────────────────────────────────────

export function priorityIcon(p: number): { source: Icon; tintColor: Color } {
  if (p >= 5) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (p >= 4) return { source: Icon.ArrowUp, tintColor: Color.Red };
  if (p >= 3) return { source: Icon.ArrowUp, tintColor: Color.Orange };
  if (p >= 2) return { source: Icon.Minus, tintColor: Color.Yellow };
  if (p >= 1) return { source: Icon.ArrowDown, tintColor: Color.Blue };
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

export function priorityLabel(p: number): string {
  return (["No priority", "Low", "Medium", "High", "Very high", "Urgent"] as const)[Math.min(p, 5)] ?? "No priority";
}

export function priorityColor(p: number): Color {
  if (p >= 4) return Color.Red;
  if (p === 3) return Color.Orange;
  if (p === 2) return Color.Yellow;
  if (p === 1) return Color.Blue;
  return Color.SecondaryText;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

export type DueBucket = "overdue" | "today" | "tomorrow" | "this-week" | "later" | "no-date";

export function dueBucket(due: string | null): DueBucket {
  if (!due) return "no-date";
  const d = taskDate(due);
  const t = today();
  if (d < t) return "overdue";
  if (d === t) return "today";
  if (d === daysFromNow(1)) return "tomorrow";
  if (d <= daysFromNow(7)) return "this-week";
  return "later";
}

export const BUCKET_TITLE: Record<DueBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  "this-week": "This Week",
  later: "Later",
  "no-date": "No Date",
};

export const BUCKET_ORDER: DueBucket[] = ["overdue", "today", "tomorrow", "this-week", "later", "no-date"];
