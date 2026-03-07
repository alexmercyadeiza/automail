-- 003_admin_totp.sql
-- Add TOTP two-factor authentication columns to admins table.

alter table admins
  add column if not exists totp_secret text,
  add column if not exists totp_enabled boolean not null default false;
