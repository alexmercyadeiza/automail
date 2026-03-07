-- Admin password reset tokens
create table if not exists admin_password_resets (
  id          uuid primary key default uuid_generate_v4(),
  admin_id    uuid not null references admins(id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_admin_password_resets_token on admin_password_resets(token);
create index idx_admin_password_resets_admin on admin_password_resets(admin_id);
