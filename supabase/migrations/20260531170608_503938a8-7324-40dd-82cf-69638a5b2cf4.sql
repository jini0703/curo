
-- Enums
create type public.curo_mode as enum ('interview', 'companion');
create type public.curo_robot as enum ('aria', 'leo');
create type public.curo_msg_role as enum ('user', 'assistant', 'system');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

-- conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.curo_mode not null,
  robot public.curo_robot not null default 'aria',
  category text,
  subcategory text,
  tone text,
  title text,
  summary text,
  score int,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_s int
);
grant select, insert, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "own conv all" on public.conversations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index on public.conversations(user_id, started_at desc);

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.curo_msg_role not null,
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "own msg all" on public.messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index on public.messages(conversation_id, created_at);

-- login history
create table public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  signed_in_at timestamptz not null default now(),
  user_agent text
);
grant select, insert, delete on public.login_history to authenticated;
grant all on public.login_history to service_role;
alter table public.login_history enable row level security;
create policy "own login read" on public.login_history for select to authenticated using (user_id = auth.uid());
create policy "own login insert" on public.login_history for insert to authenticated with check (user_id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
