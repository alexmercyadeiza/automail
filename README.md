# Campaigns

Open-source email marketing platform built with TanStack Start, Supabase, and React.

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd campaigns
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Migrations

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL files manually in the Supabase SQL Editor:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_automation_cron.sql  (requires pg_cron extension)
# 3. supabase/seed.sql
```

### 4. Upload Social Icons

Upload the icons from `public/social-icons/` to your Supabase Storage bucket `public-assets` under the path `social-icons/`:

```
public-assets/social-icons/facebook.png
public-assets/social-icons/twitter.png
public-assets/social-icons/instagram.png
public-assets/social-icons/linkedin.png
public-assets/social-icons/medium.png
```

Replace the placeholder PNGs with your own branded social icons (20x20px recommended).

### 5. Configure Email

Set your email provider in `.env`:

- **Test mode** (default): Uses [Ethereal](https://ethereal.email) for fake SMTP
- **Production**: Uses AWS SES — set `MAIL_MODE=production` and configure SES credentials

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

**Default login:** `admin@example.com` / `password` (from seed data), or use the `AUTH_USERNAME`/`AUTH_PASSWORD` env vars as a bootstrap fallback.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | — |
| `MAIL_MODE` | `test` or `production` | `test` |
| `MAIL_HOST` | SMTP host (test mode) | `smtp.ethereal.email` |
| `MAIL_FROM_ADDRESS` | Sender email address | `hello@mulla.africa` |
| `MAIL_FROM_NAME` | Sender display name | `Mulla Marketing` |
| `MAIL_USERNAME` | SMTP username (test mode) | — |
| `MAIL_PASSWORD` | SMTP password (test mode) | — |
| `SES_CONFIGURATION_SET` | AWS SES config set (production) | — |
| `AUTH_USERNAME` | Bootstrap login username | `admin` |
| `AUTH_PASSWORD` | Bootstrap login password | `admin` |

## Features

- **Broadcasts** — Send one-off email campaigns to subscriber lists
- **Campaigns** — Create and manage email marketing campaigns with MJML templates
- **Customers** — Manage email subscribers with CSV import
- **Automations** — Visual workflow builder with drag & drop
- **Team** — Manage admin accounts with role-based access
