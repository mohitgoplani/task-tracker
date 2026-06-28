"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Copy } from "lucide-react";

export function CalendarFeedSection({ feedUrl }: { feedUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<"outlook" | "google" | "apple" | null>(null);

  async function copyFeed() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Your calendar feed</h2>
          <p className="text-sm text-muted-foreground">
            Add this URL to Outlook, Google Calendar, or Apple Calendar once. Every task with a due date assigned to you will appear automatically, with native reminders at 1 day, 1 hour, and 15 minutes before.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          readOnly
          value={feedUrl}
          className="flex-1 h-10 px-3 rounded-lg border bg-muted/50 text-xs font-mono"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <Button variant="outline" onClick={copyFeed}>
          {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant={open === "outlook" ? "default" : "outline"} size="sm" onClick={() => setOpen(open === "outlook" ? null : "outlook")}>
          Outlook
        </Button>
        <Button variant={open === "google" ? "default" : "outline"} size="sm" onClick={() => setOpen(open === "google" ? null : "google")}>
          Google Calendar
        </Button>
        <Button variant={open === "apple" ? "default" : "outline"} size="sm" onClick={() => setOpen(open === "apple" ? null : "apple")}>
          Apple Calendar
        </Button>
      </div>

      {open === "outlook" && <Instructions title="How to add to Outlook" steps={OUTLOOK_STEPS} />}
      {open === "google" && <Instructions title="How to add to Google Calendar" steps={GOOGLE_STEPS} />}
      {open === "apple" && <Instructions title="How to add to Apple Calendar" steps={APPLE_STEPS} />}
    </Card>
  );
}

function Instructions({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="mt-4 p-4 bg-muted/40 rounded-lg">
      <div className="font-medium text-sm mb-2">{title}</div>
      <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-5">
        {steps.map((s, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: s }} />
        ))}
      </ol>
    </div>
  );
}

const OUTLOOK_STEPS = [
  "Open Outlook on the web (<a href='https://outlook.office.com/calendar' target='_blank' class='text-primary underline'>outlook.office.com/calendar</a>) or the desktop app.",
  "Click <b>Add calendar</b> in the left sidebar.",
  "Choose <b>Subscribe from web</b>.",
  "Paste the URL above and name it &quot;Task Tracker&quot;. Click <b>Import</b>.",
  "Tasks appear within a few minutes. Outlook will check for updates roughly hourly.",
];

const GOOGLE_STEPS = [
  "Open <a href='https://calendar.google.com' target='_blank' class='text-primary underline'>calendar.google.com</a>.",
  "In the left sidebar, click the <b>+</b> next to &quot;Other calendars&quot;.",
  "Choose <b>From URL</b>.",
  "Paste the URL above and click <b>Add calendar</b>.",
  "Tasks appear within a few minutes. Google checks for updates roughly every 6–12 hours.",
];

const APPLE_STEPS = [
  "On Mac: open Calendar → menu <b>File → New Calendar Subscription</b>. On iPhone: Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar.",
  "Paste the URL above.",
  "Set Auto-refresh to <b>Every hour</b>.",
  "Choose to display in any calendar group → Subscribe.",
];
