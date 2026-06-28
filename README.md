# Task Tracker

An internal task tracker and lightweight project management tool for teams. Built with Next.js, Supabase, and a calendar feed that plugs into Outlook, Google Calendar, or Apple Calendar.

## What it does

- **Tasks** with priority, status, due date, description, and project grouping
- **Assignees** — internal team members (Google sign-in) and external collaborators by email
- **Kanban board + list view** for tasks
- **Projects** with progress tracking
- **Team management** with admin/member roles and email invitations
- **Personal calendar feed** — each user gets a unique URL to subscribe to in Outlook/Google/Apple Calendar. Tasks with due dates auto-appear with native reminders at 1 day, 1 hour, and 15 minutes before.
- **Multi-tenant data isolation** via Postgres Row-Level Security

## Tech stack

- **Frontend**: Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Radix UI
- **Backend**: Next.js API routes · Supabase (Postgres + Auth)
- **Auth**: Google OAuth via Supabase
- **Calendar**: iCalendar (.ics) feed generation
- **Deploy**: Vercel

## Project structure

```
app/
  (app)/               protected routes with sidebar layout
    dashboard/         stats and upcoming deadlines
    tasks/             list and kanban views with detail modal
    projects/          project cards with progress
    calendar/          month grid of deadlines
    team/              members and invitations
    settings/          profile and calendar feed URL
  api/
    tasks/             CRUD and comments
    projects/          CRUD
    team/invite/       create invitations
    feed/[token]/      .ics calendar feed per user
    auth/signout/
  auth/                login and OAuth callback
components/
  ui/                  Button, Card, Dialog, Avatar, etc.
  Sidebar.tsx
lib/
  supabase/            server, browser, admin clients
  ics.ts               iCalendar generator
  types.ts             shared types
  utils.ts             date formatting and class names
supabase/
  migrations/          schema and RLS policies
middleware.ts          auth guard for protected routes
```

## Local development

```bash
# 1. Install Node.js 18+ from https://nodejs.org
# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL and keys

# 4. Apply database schema in Supabase SQL editor
# Run supabase/migrations/0001_init.sql, then 0002_calendar_token.sql

# 5. Run the dev server
npm run dev
```

See [SETUP.md](./SETUP.md) for the detailed first-time setup walkthrough.

## How team access works

The first person to sign in becomes the admin of a new organization. After that, only invited members can join. Admins invite from the Team page; invited users sign in with Google using the same email.

## How the calendar feed works

Each user has a `calendar_token` stored on their profile. The endpoint `/api/feed/[token]` returns an iCalendar feed of all tasks assigned to that user with due dates in the next year. The user subscribes to the URL in Outlook, Google Calendar, or Apple Calendar once — events appear automatically with native reminders, and update when tasks change.

## License

MIT
