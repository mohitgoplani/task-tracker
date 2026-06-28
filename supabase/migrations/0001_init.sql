-- ============================================================
-- CPE Tracker — initial schema
-- Single-organization workspace with project/task management,
-- internal + external assignees, comments, reminders, calendar links.
-- ============================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- Organization (single row for the whole team install)
-- ----------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Profiles — one row per Supabase auth user, joined to org
-- ----------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  microsoft_account_email text,
  microsoft_refresh_token_encrypted text,
  microsoft_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_org_idx on profiles(org_id);
create index if not exists profiles_email_idx on profiles(email);

-- ----------------------------------------------------------------
-- Projects
-- ----------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#6366f1',
  status text not null default 'active' check (status in ('active', 'archived', 'completed')),
  created_by uuid references profiles(id) on delete set null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_org_idx on projects(org_id);

-- ----------------------------------------------------------------
-- Tasks
-- ----------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  due_date timestamptz,
  completed_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_org_idx on tasks(org_id);
create index if not exists tasks_project_idx on tasks(project_id);
create index if not exists tasks_due_idx on tasks(due_date) where due_date is not null;
create index if not exists tasks_status_idx on tasks(status);

-- ----------------------------------------------------------------
-- Assignees — internal (profile_id) or external (email only)
-- ----------------------------------------------------------------
create table if not exists task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  external_email text,
  external_name text,
  created_at timestamptz not null default now(),
  check (
    (profile_id is not null and external_email is null)
    or (profile_id is null and external_email is not null)
  )
);

create unique index if not exists task_assignees_unique_internal
  on task_assignees(task_id, profile_id) where profile_id is not null;
create unique index if not exists task_assignees_unique_external
  on task_assignees(task_id, external_email) where external_email is not null;

-- ----------------------------------------------------------------
-- Comments / activity
-- ----------------------------------------------------------------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_task_idx on comments(task_id);

-- ----------------------------------------------------------------
-- Reminders — schedule of reminders for each task
-- ----------------------------------------------------------------
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  send_at timestamptz not null,
  lead_label text not null, -- e.g. "3 days before", "1 day before", "due today"
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reminders_pending_idx on reminders(send_at) where sent_at is null;

-- ----------------------------------------------------------------
-- Calendar event links — track Outlook event id per task/assignee
-- ----------------------------------------------------------------
create table if not exists calendar_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  provider text not null default 'microsoft' check (provider in ('microsoft', 'google')),
  external_event_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(task_id, profile_id, provider)
);

-- ----------------------------------------------------------------
-- Invitations — pending team invites
-- ----------------------------------------------------------------
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  invited_by uuid references profiles(id) on delete set null,
  accepted_at timestamptz,
  token text not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  unique(org_id, email)
);

-- ----------------------------------------------------------------
-- Helper: current user's org_id
-- ----------------------------------------------------------------
create or replace function auth_org_id() returns uuid as $$
  select org_id from profiles where id = auth.uid()
$$ language sql stable security definer;

-- ----------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger projects_updated before update on projects
  for each row execute function set_updated_at();
create trigger tasks_updated before update on tasks
  for each row execute function set_updated_at();
create trigger calendar_links_updated before update on calendar_links
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------
-- Row-Level Security
-- ----------------------------------------------------------------
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table task_assignees enable row level security;
alter table comments enable row level security;
alter table reminders enable row level security;
alter table calendar_links enable row level security;
alter table invitations enable row level security;

-- Organizations: read only your org
create policy "org_read_own" on organizations for select using (id = auth_org_id());

-- Profiles: read all in your org, update only yourself
create policy "profiles_read_org" on profiles for select using (org_id = auth_org_id());
create policy "profiles_update_self" on profiles for update using (id = auth.uid());

-- Projects: read/write within your org
create policy "projects_read_org" on projects for select using (org_id = auth_org_id());
create policy "projects_insert_org" on projects for insert with check (org_id = auth_org_id());
create policy "projects_update_org" on projects for update using (org_id = auth_org_id());
create policy "projects_delete_org" on projects for delete using (org_id = auth_org_id());

-- Tasks: read/write within your org
create policy "tasks_read_org" on tasks for select using (org_id = auth_org_id());
create policy "tasks_insert_org" on tasks for insert with check (org_id = auth_org_id());
create policy "tasks_update_org" on tasks for update using (org_id = auth_org_id());
create policy "tasks_delete_org" on tasks for delete using (org_id = auth_org_id());

-- Assignees: through task
create policy "assignees_read_org" on task_assignees for select
  using (exists (select 1 from tasks t where t.id = task_id and t.org_id = auth_org_id()));
create policy "assignees_write_org" on task_assignees for all
  using (exists (select 1 from tasks t where t.id = task_id and t.org_id = auth_org_id()))
  with check (exists (select 1 from tasks t where t.id = task_id and t.org_id = auth_org_id()));

-- Comments: through task
create policy "comments_read_org" on comments for select
  using (exists (select 1 from tasks t where t.id = task_id and t.org_id = auth_org_id()));
create policy "comments_insert_org" on comments for insert
  with check (exists (select 1 from tasks t where t.id = task_id and t.org_id = auth_org_id()));

-- Reminders: read-only via task (writes happen via service role from cron)
create policy "reminders_read_org" on reminders for select
  using (exists (select 1 from tasks t where t.id = task_id and t.org_id = auth_org_id()));

-- Calendar links: own row only
create policy "cal_links_self" on calendar_links for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Invitations: admins only
create policy "invitations_admin" on invitations for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.org_id = org_id and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.org_id = org_id and p.role = 'admin'));

-- ----------------------------------------------------------------
-- Bootstrap: when a new auth.user signs up, create profile + (optional) org
-- Org assignment logic happens in app code (accept-invite / first-user-becomes-admin).
-- ----------------------------------------------------------------
