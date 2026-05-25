-- Ensure alert state + history tables exist (production-ready)

create table if not exists public.alert_states (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  alert_type text not null,
  severity text not null check (severity in ('critical', 'warning', 'info')),
  condition_started_at timestamptz not null,
  last_checked_at timestamptz not null default now(),
  alert_triggered boolean default false,
  alert_triggered_at timestamptz,
  last_reminder_sent_at timestamptz,
  current_value numeric(10,2),
  threshold_value numeric(10,2),
  additional_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(machine_id, alert_type)
);

create table if not exists public.alert_history (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  alert_type text not null,
  severity text not null check (severity in ('critical', 'warning', 'info', 'recovery')),
  message text not null,
  current_value numeric(10,2),
  threshold_value numeric(10,2),
  duration_minutes integer,
  recipients jsonb,
  email_sent boolean default true,
  email_error text,
  condition_started_at timestamptz,
  alert_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_alert_states_machine_id on public.alert_states(machine_id);
create index if not exists idx_alert_states_severity on public.alert_states(severity);
create index if not exists idx_alert_history_machine_id on public.alert_history(machine_id);
create index if not exists idx_alert_history_severity on public.alert_history(severity);
create index if not exists idx_alert_history_created_at on public.alert_history(created_at desc);

alter table public.alert_states enable row level security;
alter table public.alert_history enable row level security;

-- Access: users can read alerts for machines they receive notifications for.
drop policy if exists "Users can view alert states for their machines" on public.alert_states;
create policy "Users can view alert states for their machines"
on public.alert_states
for select
to authenticated
using (
  exists (
    select 1
    from public.machine_notification_preferences mnp
    where mnp.machine_id = alert_states.machine_id
      and mnp.user_id = auth.uid()
      and mnp.enabled = true
  )
);

drop policy if exists "Service role full access alert states" on public.alert_states;
create policy "Service role full access alert states"
on public.alert_states
for all
to service_role
using (true)
with check (true);

drop policy if exists "Users can view alert history for their machines" on public.alert_history;
create policy "Users can view alert history for their machines"
on public.alert_history
for select
to authenticated
using (
  exists (
    select 1
    from public.machine_notification_preferences mnp
    where mnp.machine_id = alert_history.machine_id
      and mnp.user_id = auth.uid()
      and mnp.enabled = true
  )
);

drop policy if exists "Service role full access alert history" on public.alert_history;
create policy "Service role full access alert history"
on public.alert_history
for all
to service_role
using (true)
with check (true);

grant select on public.alert_states to authenticated;
grant select on public.alert_history to authenticated;
grant all on public.alert_states to service_role;
grant all on public.alert_history to service_role;

