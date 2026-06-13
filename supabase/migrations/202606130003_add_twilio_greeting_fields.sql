alter table public.users
  add column if not exists assistant_number text,
  add column if not exists greeting_recording_url text,
  add column if not exists greeting_recording_sid text;
