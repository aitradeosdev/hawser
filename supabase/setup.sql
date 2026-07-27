-- Hawser: Supabase setup.
-- Realtime channels need no schema at all; this table exists only so the
-- daily keepalive cron produces database activity and the free-tier
-- project never pauses.

create table if not exists public.heartbeat (
  id integer primary key,
  beat_at timestamptz not null default now()
);

insert into public.heartbeat (id)
values (1)
on conflict (id) do nothing;

-- No public policies: only the service role (which bypasses RLS) touches
-- this table, from /api/heartbeat.
alter table public.heartbeat enable row level security;

-- ── Optional hardening ──────────────────────────────────────────────────
-- The anon key ships to the browser by design, which means anyone can open
-- Realtime channels on the project. For a personal tool that is fine. To
-- restrict the surface to Hawser's own channels, enable Realtime
-- Authorization ("private channels") in the dashboard and add a policy on
-- realtime.messages like:
--
-- create policy "hawser channels only"
-- on realtime.messages for all to anon
-- using (realtime.topic() like 'hawser:%')
-- with check (realtime.topic() like 'hawser:%');
