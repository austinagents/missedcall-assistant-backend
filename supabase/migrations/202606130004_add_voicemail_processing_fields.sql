alter table public.voicemails
  add column if not exists transcript text,
  add column if not exists summary text,
  add column if not exists caller_name text,
  add column if not exists callback_number text,
  add column if not exists urgency text,
  add column if not exists action_items text,
  add column if not exists processing_status text default 'pending',
  add column if not exists processed_at timestamptz,
  add column if not exists recording_sid text,
  add column if not exists call_sid text;
