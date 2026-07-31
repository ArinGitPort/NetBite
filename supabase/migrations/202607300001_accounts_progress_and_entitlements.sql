create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  completed_lesson_ids text[] not null default '{}',
  completed_lab_ids text[] not null default '{}',
  quiz_scores jsonb not null default '{}'::jsonb,
  quiz_content_versions jsonb not null default '{}'::jsonb,
  reviewed_flashcard_chapter_ids text[] not null default '{}',
  flashcard_content_versions jsonb not null default '{}'::jsonb,
  flashcard_positions jsonb not null default '{}'::jsonb,
  cli_guide_seen boolean not null default false,
  haptics_enabled boolean not null default true,
  motion_preference text not null default 'system' check (motion_preference in ('system', 'reduced')),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  status text not null check (status in ('active', 'revoked')),
  source text not null check (source in ('stripe_test', 'manual_test')),
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.purchases (
  provider_payment_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  amount integer not null check (amount >= 0),
  currency text not null,
  status text not null check (status in ('pending', 'succeeded', 'failed', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists learning_progress_set_updated_at on public.learning_progress;
create trigger learning_progress_set_updated_at before update on public.learning_progress
for each row execute function public.set_updated_at();

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at before update on public.entitlements
for each row execute function public.set_updated_at();

drop trigger if exists purchases_set_updated_at on public.purchases;
create trigger purchases_set_updated_at before update on public.purchases
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.learning_progress enable row level security;
alter table public.entitlements enable row level security;
alter table public.purchases enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select
using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert
with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "progress_select_own" on public.learning_progress;
create policy "progress_select_own" on public.learning_progress for select
using ((select auth.uid()) = user_id);
drop policy if exists "progress_insert_own" on public.learning_progress;
create policy "progress_insert_own" on public.learning_progress for insert
with check ((select auth.uid()) = user_id);
drop policy if exists "progress_update_own" on public.learning_progress;
create policy "progress_update_own" on public.learning_progress for update
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own" on public.entitlements for select
using ((select auth.uid()) = user_id);

drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own" on public.purchases for select
using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.entitlements from authenticated, anon;
revoke insert, update, delete on public.purchases from authenticated, anon;
