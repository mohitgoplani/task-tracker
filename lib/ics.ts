// Generate an iCalendar (.ics) feed for a user's tasks with reminders baked in.
// Each task with a due_date becomes a VEVENT; each event has VALARM blocks
// so Outlook/Google/Apple Calendar fires native notifications.

interface IcsTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string; // ISO timestamp
  status: string;
  priority: string;
  project_name: string | null;
}

export function buildIcsFeed(opts: {
  userEmail: string;
  fullName: string | null;
  tasks: IcsTask[];
  appUrl: string;
}) {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Task Tracker//Calendar Feed//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(`X-WR-CALNAME:${escapeText("Task Tracker — " + (opts.fullName || opts.userEmail))}`);
  lines.push("X-WR-CALDESC:Deadlines for tasks assigned to you");
  lines.push("X-PUBLISHED-TTL:PT1H");
  lines.push("REFRESH-INTERVAL;VALUE=DURATION:PT1H");

  const now = formatIcsDate(new Date());

  for (const t of opts.tasks) {
    const start = new Date(t.due_date);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const isDone = t.status === "done";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${t.id}@task-tracker`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${formatIcsDate(start)}`);
    lines.push(`DTEND:${formatIcsDate(end)}`);

    const titlePrefix = isDone ? "[Done] " : t.priority === "critical" ? "[!!] " : t.priority === "high" ? "[!] " : "";
    lines.push(`SUMMARY:${escapeText(titlePrefix + t.title)}`);

    const descParts: string[] = [];
    if (t.project_name) descParts.push(`Project: ${t.project_name}`);
    descParts.push(`Priority: ${t.priority}`);
    descParts.push(`Status: ${t.status}`);
    if (t.description) descParts.push("", t.description);
    descParts.push("", `Open: ${opts.appUrl}/tasks?task=${t.id}`);
    lines.push(`DESCRIPTION:${escapeText(descParts.join("\\n"))}`);

    lines.push(`URL:${opts.appUrl}/tasks?task=${t.id}`);
    lines.push(`STATUS:${isDone ? "CONFIRMED" : "TENTATIVE"}`);
    lines.push("TRANSP:OPAQUE");

    // Reminders — only for incomplete tasks
    if (!isDone) {
      for (const minutes of [15, 60, 24 * 60]) {
        lines.push("BEGIN:VALARM");
        lines.push(`TRIGGER:-PT${minutes}M`);
        lines.push("ACTION:DISPLAY");
        lines.push(`DESCRIPTION:${escapeText("Reminder: " + t.title)}`);
        lines.push("END:VALARM");
      }
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function formatIcsDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ in UTC
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
