create table if not exists public.analytics_event_rejections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reason text not null,
  event_name text,
  lead_id text,
  client_ip text,
  user_agent text,
  origin text,
  referer text,
  metadata jsonb
);
alter table public.analytics_event_rejections enable row level security;
drop policy if exists "admin read rejections" on public.analytics_event_rejections;
create policy "admin read rejections" on public.analytics_event_rejections
  for select using (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));
create index if not exists idx_aer_created on public.analytics_event_rejections(created_at desc);
create index if not exists idx_aer_event on public.analytics_event_rejections(event_name);