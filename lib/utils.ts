import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDueDate(iso: string | null): { label: string; tone: "overdue" | "today" | "soon" | "future" | "none" } {
  if (!iso) return { label: "No due date", tone: "none" };
  const d = parseISO(iso);
  if (isPast(d) && !isToday(d)) return { label: `Overdue · ${format(d, "MMM d")}`, tone: "overdue" };
  if (isToday(d)) return { label: "Due today", tone: "today" };
  if (isTomorrow(d)) return { label: "Due tomorrow", tone: "soon" };
  return { label: `Due ${format(d, "MMM d")}`, tone: "future" };
}

export function relativeTime(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
}

export function initials(name?: string | null, email?: string | null): string {
  const base = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
