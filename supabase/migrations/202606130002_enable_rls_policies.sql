alter table public.users enable row level security;
alter table public.voicemails enable row level security;
alter table public.activity_events enable row level security;

create policy "Users can read own user record"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own user record"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own user record"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own user record"
  on public.users
  for delete
  to authenticated
  using (auth.uid() = id);

create policy "Users can read own voicemails"
  on public.voicemails
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own voicemails"
  on public.voicemails
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own voicemails"
  on public.voicemails
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own voicemails"
  on public.voicemails
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can read own activity events"
  on public.activity_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own activity events"
  on public.activity_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own activity events"
  on public.activity_events
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own activity events"
  on public.activity_events
  for delete
  to authenticated
  using (auth.uid() = user_id);
