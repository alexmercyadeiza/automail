-- 001_initial_schema.sql
-- Full schema for the Campaigns application.
-- Run against a fresh Supabase project: supabase db push

-- ==========================================================================
-- Extensions
-- ==========================================================================
create extension if not exists "uuid-ossp" with schema extensions;

-- ==========================================================================
-- Admins (team accounts)
-- ==========================================================================
create table if not exists admins (
  id         uuid primary key default extensions.uuid_generate_v4(),
  email      text not null unique,
  password   text not null,               -- bcrypt hash
  name       text not null default '',
  role       text not null default 'admin' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

-- ==========================================================================
-- Email lists
-- ==========================================================================
create table if not exists marketing_email_lists (
  id          uuid primary key default extensions.uuid_generate_v4(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ==========================================================================
-- Customers (subscribers)
-- ==========================================================================
create table if not exists marketing_customers (
  id         uuid primary key default extensions.uuid_generate_v4(),
  email      text not null unique,
  first_name text,
  last_name  text,
  list_id    uuid references marketing_email_lists(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_email on marketing_customers(email);

-- ==========================================================================
-- Marketing campaigns (broadcasts)
-- ==========================================================================
create table if not exists marketing_campaigns (
  id              uuid primary key default extensions.uuid_generate_v4(),
  name            text,
  subject         text not null,
  content         text not null default '',
  content_blocks  jsonb,
  status          text not null default 'draft' check (status in ('draft', 'sent')),
  from_name       text,
  header_image    text,
  footer_image    text,
  social_facebook text,
  social_x        text,
  social_instagram text,
  social_linkedin text,
  social_medium   text,
  unsubscribe_url text,
  copyright_text  text,
  company_address text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ==========================================================================
-- Email logs (send tracking)
-- ==========================================================================
create table if not exists marketing_email_logs (
  id           uuid primary key default extensions.uuid_generate_v4(),
  campaign_id  uuid not null references marketing_campaigns(id) on delete cascade,
  customer_id  uuid references marketing_customers(id) on delete set null,
  status       text not null default 'queued',
  delivered_at timestamptz,
  opened_at    timestamptz,
  clicked_at   timestamptz,
  bounced_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ==========================================================================
-- Footer settings (singleton)
-- ==========================================================================
create table if not exists marketing_footer_settings (
  id               uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  social_facebook  text,
  social_x         text,
  social_instagram text,
  social_linkedin  text,
  social_medium    text,
  unsubscribe_url  text,
  copyright_text   text,
  company_address  text,
  updated_at       timestamptz not null default now()
);

-- ==========================================================================
-- Automation campaigns (workflow definitions)
-- ==========================================================================
create table if not exists automation_campaigns (
  id         uuid primary key default extensions.uuid_generate_v4(),
  name       text not null,
  status     text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  nodes      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==========================================================================
-- Automation enrollments (contact journey tracking)
-- ==========================================================================
create table if not exists automation_enrollments (
  id              uuid primary key default extensions.uuid_generate_v4(),
  automation_id   uuid not null references automation_campaigns(id) on delete cascade,
  customer_id     uuid not null references marketing_customers(id) on delete cascade,
  current_node_id text not null,
  status          text not null default 'active' check (status in ('active', 'completed', 'exited')),
  enrolled_at     timestamptz not null default now(),
  next_process_at timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_enrollments_poll
  on automation_enrollments(status, next_process_at)
  where status = 'active';

-- ==========================================================================
-- Automation logs (audit trail)
-- ==========================================================================
create table if not exists automation_logs (
  id            uuid primary key default extensions.uuid_generate_v4(),
  enrollment_id uuid not null references automation_enrollments(id) on delete cascade,
  node_id       text not null,
  node_type     text not null,
  action        text not null,
  created_at    timestamptz not null default now()
);

-- ==========================================================================
-- Storage buckets
-- ==========================================================================
insert into storage.buckets (id, name, public)
values
  ('uploads', 'uploads', true),
  ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

-- Allow public read access to both buckets
create policy "Public read uploads" on storage.objects
  for select using (bucket_id = 'uploads');

create policy "Public read public-assets" on storage.objects
  for select using (bucket_id = 'public-assets');

-- Allow authenticated (service role) uploads
create policy "Service upload to uploads" on storage.objects
  for insert with check (bucket_id = 'uploads');

create policy "Service upload to public-assets" on storage.objects
  for insert with check (bucket_id = 'public-assets');

-- ==========================================================================
-- Row-level security (enable but allow all via service role)
-- ==========================================================================
alter table admins enable row level security;
alter table marketing_email_lists enable row level security;
alter table marketing_customers enable row level security;
alter table marketing_campaigns enable row level security;
alter table marketing_email_logs enable row level security;
alter table marketing_footer_settings enable row level security;
alter table automation_campaigns enable row level security;
alter table automation_enrollments enable row level security;
alter table automation_logs enable row level security;

-- Service role bypass policies (service_role key bypasses RLS by default,
-- but we add explicit policies for completeness)
create policy "Service role full access" on admins for all using (true) with check (true);
create policy "Service role full access" on marketing_email_lists for all using (true) with check (true);
create policy "Service role full access" on marketing_customers for all using (true) with check (true);
create policy "Service role full access" on marketing_campaigns for all using (true) with check (true);
create policy "Service role full access" on marketing_email_logs for all using (true) with check (true);
create policy "Service role full access" on marketing_footer_settings for all using (true) with check (true);
create policy "Service role full access" on automation_campaigns for all using (true) with check (true);
create policy "Service role full access" on automation_enrollments for all using (true) with check (true);
create policy "Service role full access" on automation_logs for all using (true) with check (true);
