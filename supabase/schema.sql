-- Pocket Mates 초기 스키마
-- Supabase SQL Editor에서 전체를 한 번에 실행하세요.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 30),
  companion_species text not null default 'dog'
    check (char_length(companion_species) between 1 and 30),
  companion_name text
    check (companion_name is null or char_length(companion_name) between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  monthly_income bigint not null check (monthly_income >= 0),
  fixed_expenses bigint not null default 0 check (fixed_expenses >= 0),
  savings_goal bigint not null default 0 check (savings_goal >= 0),
  payday smallint not null default 25 check (payday between 1 and 31),
  currency text not null default 'KRW' check (char_length(currency) = 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_plans_month_first_day
    check (month = date_trunc('month', month)::date),
  constraint budget_plans_budget_is_possible
    check (fixed_expenses + savings_goal <= monthly_income),
  constraint budget_plans_user_month_key unique (user_id, month),
  constraint budget_plans_id_user_key unique (id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  budget_plan_id uuid not null,
  category text not null check (
    category in (
      'coffee', 'delivery', 'dining', 'transport', 'shopping',
      'game', 'subscription', 'living', 'other'
    )
  ),
  amount bigint not null check (amount > 0),
  spent_at timestamptz not null default now(),
  memo text check (memo is null or char_length(memo) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_plan_owner_fkey
    foreign key (budget_plan_id, user_id)
    references public.budget_plans (id, user_id)
    on delete cascade
);

create table if not exists public.companion_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  budget_plan_id uuid not null,
  species text not null default 'dog' check (char_length(species) between 1 and 30),
  name text check (name is null or char_length(name) between 1 and 30),
  stage text not null default 'relaxed' check (
    stage in ('relaxed', 'watching', 'calculating', 'worried', 'speechless')
  ),
  room_stage smallint not null default 1 check (room_stage between 1 and 5),
  last_reaction text check (last_reaction is null or char_length(last_reaction) <= 200),
  updated_at timestamptz not null default now(),
  constraint companion_states_plan_key unique (budget_plan_id),
  constraint companion_states_plan_owner_fkey
    foreign key (budget_plan_id, user_id)
    references public.budget_plans (id, user_id)
    on delete cascade
);

create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  budget_plan_id uuid not null,
  total_spent bigint not null default 0 check (total_spent >= 0),
  remaining_balance bigint not null default 0,
  top_category text check (
    top_category is null or top_category in (
      'coffee', 'delivery', 'dining', 'transport', 'shopping',
      'game', 'subscription', 'living', 'other'
    )
  ),
  result_title text check (result_title is null or char_length(result_title) <= 80),
  stats jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object'),
  created_at timestamptz not null default now(),
  constraint monthly_summaries_plan_key unique (budget_plan_id),
  constraint monthly_summaries_plan_owner_fkey
    foreign key (budget_plan_id, user_id)
    references public.budget_plans (id, user_id)
    on delete cascade
);

create index if not exists budget_plans_user_id_idx
  on public.budget_plans (user_id);
create index if not exists expenses_user_id_idx
  on public.expenses (user_id);
create index if not exists expenses_plan_spent_at_idx
  on public.expenses (budget_plan_id, spent_at desc);
create index if not exists companion_states_user_id_idx
  on public.companion_states (user_id);
create index if not exists monthly_summaries_user_id_idx
  on public.monthly_summaries (user_id);

create or replace function private.set_updated_at()
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

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 30), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

drop trigger if exists budget_plans_set_updated_at on public.budget_plans;
create trigger budget_plans_set_updated_at
  before update on public.budget_plans
  for each row execute function private.set_updated_at();

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function private.set_updated_at();

drop trigger if exists companion_states_set_updated_at on public.companion_states;
create trigger companion_states_set_updated_at
  before update on public.companion_states
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.budget_plans enable row level security;
alter table public.expenses enable row level security;
alter table public.companion_states enable row level security;
alter table public.monthly_summaries enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.budget_plans from anon, authenticated;
revoke all on table public.expenses from anon, authenticated;
revoke all on table public.companion_states from anon, authenticated;
revoke all on table public.monthly_summaries from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.budget_plans to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.companion_states to authenticated;
grant select, insert, update, delete on table public.monthly_summaries to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "budget_plans_select_own" on public.budget_plans;
create policy "budget_plans_select_own"
  on public.budget_plans for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "budget_plans_insert_own" on public.budget_plans;
create policy "budget_plans_insert_own"
  on public.budget_plans for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "budget_plans_update_own" on public.budget_plans;
create policy "budget_plans_update_own"
  on public.budget_plans for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "budget_plans_delete_own" on public.budget_plans;
create policy "budget_plans_delete_own"
  on public.budget_plans for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own"
  on public.expenses for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own"
  on public.expenses for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own"
  on public.expenses for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own"
  on public.expenses for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "companion_states_select_own" on public.companion_states;
create policy "companion_states_select_own"
  on public.companion_states for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "companion_states_insert_own" on public.companion_states;
create policy "companion_states_insert_own"
  on public.companion_states for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "companion_states_update_own" on public.companion_states;
create policy "companion_states_update_own"
  on public.companion_states for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "companion_states_delete_own" on public.companion_states;
create policy "companion_states_delete_own"
  on public.companion_states for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "monthly_summaries_select_own" on public.monthly_summaries;
create policy "monthly_summaries_select_own"
  on public.monthly_summaries for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "monthly_summaries_insert_own" on public.monthly_summaries;
create policy "monthly_summaries_insert_own"
  on public.monthly_summaries for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "monthly_summaries_update_own" on public.monthly_summaries;
create policy "monthly_summaries_update_own"
  on public.monthly_summaries for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "monthly_summaries_delete_own" on public.monthly_summaries;
create policy "monthly_summaries_delete_own"
  on public.monthly_summaries for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
