create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  auth_provider text,
  email text unique,
  phone_number text,
  carrier text,
  forwarding_number text,
  forwarding_enabled boolean default false,
  greeting_status text default 'none',
  push_notifications_enabled boolean default true,
  email_notifications_enabled boolean default true
);

create index if not exists users_email_idx
  on public.users (email);

create index if not exists users_phone_number_idx
  on public.users (phone_number);

create table if not exists public.voicemails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid not null references public.users(id) on delete cascade,
  caller_number text,
  recording_url text,
  duration_seconds integer,
  transcript text,
  email_sent boolean default false,
  push_sent boolean default false
);

create index if not exists voicemails_user_id_idx
  on public.voicemails (user_id);

create index if not exists voicemails_created_at_idx
  on public.voicemails (created_at);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_type text,
  event_title text,
  event_description text
);

create index if not exists activity_events_user_id_idx
  on public.activity_events (user_id);

create index if not exists activity_events_created_at_idx
  on public.activity_events (created_at);
