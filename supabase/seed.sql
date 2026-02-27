-- seed.sql
-- Default admin account: admin@example.com / password
-- bcrypt hash of "password" with 10 rounds

insert into admins (email, password, name, role)
values (
  'admin@example.com',
  '$2b$10$wVA9NK/29yfBvwgtouz8T.4GFlaiAD4mgHo0goTkl4znfwlNpZJ3y',
  'Admin',
  'admin'
)
on conflict (email) do nothing;
