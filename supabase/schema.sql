-- Trailstamp backend. Run once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- Every table has row-level security, so the public anon key in the app can only
-- reach what the signed-in person is allowed to see.

-- ---------- profiles (display name friends see) ----------
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles: own" on public.profiles;
create policy "profiles: own" on public.profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- a person's trips, lists, quests, badges ----------
create table if not exists public.app_state (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
drop policy if exists "app_state: own" on public.app_state;
create policy "app_state: own" on public.app_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- a person's moments (photos + notes) ----------
create table if not exists public.moments (
  id text primary key check (char_length(id) <= 40),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  at timestamptz,
  data jsonb not null
);
create index if not exists moments_user on public.moments (user_id);
alter table public.moments enable row level security;
drop policy if exists "moments: own" on public.moments;
create policy "moments: own" on public.moments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- leaderboard ----------
create table if not exists public.board (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  pts int not null default 0, rank int not null default 1, challenges int not null default 0,
  parks int not null default 0, places int not null default 0, trips int not null default 0,
  badges int not null default 0, updated_at timestamptz not null default now()
);
create index if not exists board_pts on public.board (pts desc);
alter table public.board enable row level security;
drop policy if exists "board: read" on public.board;
create policy "board: read" on public.board for select to authenticated using (true);
drop policy if exists "board: own" on public.board;
create policy "board: own" on public.board for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- shared trips ----------
create table if not exists public.groups (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  name text not null default '', dest text not null default '',
  start_date text not null default '', end_date text not null default '',
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.groups enable row level security;
drop policy if exists "groups: read" on public.groups;
create policy "groups: read" on public.groups for select to authenticated using (true);
drop policy if exists "groups: create" on public.groups;
create policy "groups: create" on public.groups for insert to authenticated with check (owner = auth.uid());
drop policy if exists "groups: owner" on public.groups;
create policy "groups: owner" on public.groups for delete to authenticated using (owner = auth.uid());

create table if not exists public.group_members (
  group_code text not null references public.groups(code) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_code, user_id)
);
alter table public.group_members enable row level security;

create or replace function public.is_member(g text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.group_members where group_code = g and user_id = auth.uid());
$$;
revoke all on function public.is_member(text) from public;
grant execute on function public.is_member(text) to authenticated;

drop policy if exists "members: read" on public.group_members;
create policy "members: read" on public.group_members for select to authenticated using (public.is_member(group_code));
drop policy if exists "members: join" on public.group_members;
create policy "members: join" on public.group_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "members: leave" on public.group_members;
create policy "members: leave" on public.group_members for delete to authenticated using (user_id = auth.uid());

create table if not exists public.group_moments (
  id text primary key check (char_length(id) <= 40),
  group_code text not null references public.groups(code) on delete cascade,
  by uuid not null default auth.uid() references auth.users on delete cascade,
  at timestamptz,
  data jsonb not null
);
create index if not exists group_moments_code on public.group_moments (group_code, at desc);
alter table public.group_moments enable row level security;
drop policy if exists "gm: read" on public.group_moments;
create policy "gm: read" on public.group_moments for select to authenticated using (public.is_member(group_code));
drop policy if exists "gm: post" on public.group_moments;
create policy "gm: post" on public.group_moments for insert to authenticated with check (by = auth.uid() and public.is_member(group_code));
drop policy if exists "gm: edit own" on public.group_moments;
create policy "gm: edit own" on public.group_moments for update to authenticated using (by = auth.uid()) with check (by = auth.uid());
drop policy if exists "gm: delete own" on public.group_moments;
create policy "gm: delete own" on public.group_moments for delete to authenticated using (by = auth.uid());

-- ---------- safety: blocks, reports ----------
create table if not exists public.blocks (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  blocked uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks: own" on public.blocks;
create policy "blocks: own" on public.blocks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid default auth.uid() references auth.users on delete set null,
  target_user uuid, moment_id text, reason text check (char_length(reason) <= 200),
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports: file" on public.reports;
create policy "reports: file" on public.reports for insert to authenticated with check (reporter = auth.uid());

-- ---------- tester feedback ----------
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users on delete set null,
  message text not null check (char_length(message) <= 4000),
  app_version text, platform text,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "feedback: send" on public.feedback;
create policy "feedback: send" on public.feedback for insert to authenticated with check (user_id = auth.uid());

-- ---------- AI usage cap (used by the "ai" edge function) ----------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create or replace function public.bump_ai_usage() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.ai_usage (user_id, day, calls) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1
  returning calls into n;
  return n;
end $$;
revoke all on function public.bump_ai_usage() from public;
grant execute on function public.bump_ai_usage() to authenticated;

-- ---------- delete my account (Google Play and Apple require this in the app) ----------
-- The app removes the person's photos first, then calls this. Deleting the auth user
-- cascades to every table above.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "photos: upload own" on storage.objects;
create policy "photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos: read own or shared" on storage.objects;
create policy "photos: read own or shared" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.group_moments gm where gm.data -> 'photos' ? name and public.is_member(gm.group_code))
  ));
drop policy if exists "photos: delete own" on storage.objects;
create policy "photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- crash reports from the app ----------
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users on delete set null,
  message text not null check (char_length(message) <= 1000),
  stack text check (char_length(stack) <= 4000),
  app_version text, platform text, user_agent text,
  created_at timestamptz not null default now()
);
alter table public.app_errors enable row level security;
drop policy if exists "errors: send" on public.app_errors;
create policy "errors: send" on public.app_errors for insert to authenticated with check (user_id = auth.uid());
