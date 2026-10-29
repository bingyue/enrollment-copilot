-- Single-organization MVP. All access goes through the password-protected server.
-- Never expose a service-role key to the browser.
create table if not exists public.enrollment_workspaces (
  id text primary key,
  data jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.enrollment_workspaces enable row level security;
revoke all on public.enrollment_workspaces from anon, authenticated;
grant all on public.enrollment_workspaces to service_role;
-- Intentionally no public policies. Server service_role performs validated mutations
-- using optimistic version checks. Add Supabase Auth and organization membership
-- policies before expanding to multiple organizations.
