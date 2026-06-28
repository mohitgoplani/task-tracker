# Setup guide

Step-by-step first-time setup for CPE Tracker. Plan ~30–45 minutes end to end. All accounts used are free.

---

## 1. Install Node.js

The app needs Node 18+. On macOS:

```bash
# Option A — install Homebrew first, then Node
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node

# Option B — download the .pkg installer
# https://nodejs.org/en/download/
```

Verify:

```bash
node -v   # should print v18+ or v20+
npm -v
```

---

## 2. Supabase project (database + auth)

1. Go to https://supabase.com → **New project** (free tier is fine).
2. Pick a name, a database password (save it), and the closest region.
3. Wait ~2 minutes for provisioning.
4. **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose to browser)
5. **SQL Editor → New query**, paste the contents of [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql), run.

### Enable auth providers

**Authentication → Providers**:

- **Google**:
  1. Open https://console.cloud.google.com → New project → **APIs & Services → Credentials** → Create OAuth client → Web application.
  2. Authorized redirect URI: `<NEXT_PUBLIC_SUPABASE_URL>/auth/v1/callback` (Supabase shows this exact URL on the Google provider page).
  3. Paste the resulting **Client ID** and **Client Secret** into Supabase Google provider settings. Enable.

- **Azure (Microsoft)**:
  1. Open https://portal.azure.com → **Microsoft Entra ID → App registrations → New registration**.
  2. Name: `CPE Tracker`. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
  3. Redirect URI: **Web**, value `<NEXT_PUBLIC_SUPABASE_URL>/auth/v1/callback`.
  4. After creation, go to **API permissions → Add permission → Microsoft Graph → Delegated**:
     - `User.Read`
     - `Calendars.ReadWrite`
     - `Mail.Send`
     - `offline_access`
     - `openid`, `email`, `profile`
  5. **Certificates & secrets → New client secret**, save the **Value** (visible only once).
  6. **Overview**, copy the **Application (client) ID**.
  7. Paste both into Supabase Azure provider settings. Set "Azure Tenant URL" to `https://login.microsoftonline.com/common` for multi-tenant + personal accounts (or your tenant ID for org-only).

---

## 3. Resend (reminder emails)

1. https://resend.com → sign up → **API Keys → Create**.
2. Copy the key → `RESEND_API_KEY`.
3. Verify a sending domain (Resend has a free 100 emails/day from `onboarding@resend.dev` to *your verified email only* — to send to your whole team, add and verify your domain under **Domains**).
4. Set `REMINDER_FROM_EMAIL` to an address on the verified domain (e.g. `reminders@yourdomain.com`).

---

## 4. Local development

```bash
cd "/Users/mohit/To tracker - CPE"
cp .env.example .env.local
# Open .env.local and fill in every value
npm install
npm run dev
```

Visit http://localhost:3000. The first time you sign in (Google or Microsoft), you become the **admin** of a new organization named `DEFAULT_ORG_NAME` (set in `.env.local`).

Anyone else trying to sign in will be blocked until you invite them from the **Team** page.

---

## 5. Deploy to Vercel

1. Push the project to a GitHub repo:

   ```bash
   cd "/Users/mohit/To tracker - CPE"
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create cpe-tracker --private --source=. --push
   # or create manually on github.com and push
   ```

2. https://vercel.com → **Add New → Project** → import the repo.
3. **Environment Variables**: paste every variable from your `.env.local` (Supabase URL/keys, Microsoft, Resend, `CRON_SECRET`, etc.). Set `NEXT_PUBLIC_APP_URL` to your final Vercel URL (e.g. `https://cpe-tracker.vercel.app`).
4. Deploy.
5. After the first deploy, go back to **Supabase Auth Providers** and add the production redirect URL: `<your-vercel-url>/auth/callback` to the allowed list, plus update Google/Microsoft consoles with the same redirect on `<supabase-url>/auth/v1/callback`. (Supabase handles the OAuth flow, so the Google/Microsoft redirect stays pointed at Supabase.)
6. The cron in `vercel.json` will run automatically (`/api/cron/reminders` hourly). Verify in **Vercel → Logs → Crons**.

### Generate a CRON_SECRET

```bash
openssl rand -hex 32
```

Put the result in `CRON_SECRET` env in Vercel. Vercel signs cron requests with `Authorization: Bearer <CRON_SECRET>` automatically when you set this var.

---

## 6. Verify everything works

- [ ] You can sign in with Google and with Microsoft
- [ ] Creating a task with a due date stores the reminder rows (check `reminders` table in Supabase)
- [ ] Assigning a task to a team member shows in their "Assigned to me" list
- [ ] Adding an external assignee email saves it on the task
- [ ] Signing in with Microsoft → creating a task with a due date → the Outlook event appears on your calendar (check `/api/calendar/sync` runs without `no_microsoft_token`)
- [ ] Setting `send_at` to a past time on a reminder row and triggering `GET /api/cron/reminders` (with the bearer token) sends an email
- [ ] Inviting a teammate sends them an email with the accept link

---

## Troubleshooting

- **"not_invited" on sign-in**: an admin needs to invite that email first via the Team page.
- **Cron not firing**: confirm `vercel.json` is committed; Vercel Cron is on by default for Pro and free tiers.
- **Outlook sync says `no_microsoft_token`**: the user signed in with Google. They need to sign in (or re-link) with Microsoft for Graph access.
- **Resend returns 403**: your domain isn't verified, or you're sending to a non-allowlisted address from the sandbox domain.
- **Google sign-in 400 error**: redirect URI in Google Cloud Console doesn't exactly match `<supabase-url>/auth/v1/callback`.
