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

-- 방 스킨 상점과 사용자별 소지품
alter table public.profiles
  add column if not exists points bigint not null default 500 check (points >= 0);

create table if not exists public.shop_items (
  id text primary key check (char_length(id) between 1 and 40),
  item_type text not null check (item_type in ('room_skin', 'decoration')),
  name text not null check (char_length(name) between 1 and 40),
  description text check (description is null or char_length(description) <= 160),
  price integer not null check (price >= 0),
  asset_path text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.shop_items add column if not exists category text;
alter table public.shop_items add column if not exists sprite_column smallint;
alter table public.shop_items add column if not exists sprite_row smallint;
alter table public.shop_items add column if not exists placement jsonb not null default '{}'::jsonb;

insert into public.shop_items (id, item_type, name, description, price, asset_path)
values
  ('attic', 'room_skin', '밤의 다락방', '처음 지급되는 기본 방', 0, '/assets/rooms/budget-states/attic-cozy.png'),
  ('cloud', 'room_skin', '새벽 구름방', '구름 위로 아침이 오는 방', 250, '/assets/rooms/skins/cloud-dawn.png'),
  ('game', 'room_skin', '주말 게임방', '잔액보다 세이브 파일이 중요한 방', 400, '/assets/rooms/skins/weekend-game.png')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  asset_path = excluded.asset_path;

insert into public.shop_items (id, item_type, category, name, description, price, asset_path, sprite_column, sprite_row, placement)
values
  ('tv', 'decoration', 'appliance', '작은 TV', '주말을 순식간에 없애는 화면', 180, '/assets/decorations/room-items-sprite.png', 0, 0, '{"left":6,"top":51,"width":25}'),
  ('console', 'decoration', 'appliance', '게임기', '할 게임은 많은데 시간은 없음', 220, '/assets/decorations/room-items-sprite.png', 1, 0, '{"left":20,"top":69,"width":16}'),
  ('air-conditioner', 'decoration', 'appliance', '에어컨', '강아지 털도 여름은 덥습니다', 260, '/assets/decorations/room-items-sprite.png', 2, 0, '{"left":37,"top":7,"width":22}'),
  ('air-purifier', 'decoration', 'appliance', '공기청정기', '털은 못 잡아도 기분은 상쾌', 160, '/assets/decorations/room-items-sprite.png', 3, 0, '{"left":86,"top":54,"width":10}'),
  ('air-fryer', 'decoration', 'appliance', '에어프라이어', '냉동 감자의 최종 목적지', 140, '/assets/decorations/room-items-sprite.png', 0, 1, '{"left":74,"top":62,"width":11}'),
  ('christmas-tree', 'decoration', 'christmas', '미니 트리', '방 한쪽만 갑자기 연말', 200, '/assets/decorations/room-items-sprite.png', 1, 1, '{"left":79,"top":34,"width":18}'),
  ('string-lights', 'decoration', 'christmas', '전구 가랜드', '전기세보다 분위기가 먼저', 110, '/assets/decorations/room-items-sprite.png', 2, 1, '{"left":32,"top":7,"width":35}'),
  ('gift-boxes', 'decoration', 'christmas', '선물상자', '내용물은 아직 비밀', 90, '/assets/decorations/room-items-sprite.png', 3, 1, '{"left":66,"top":70,"width":15}'),
  ('picnic-basket', 'decoration', 'picnic', '피크닉 바구니', '날씨 좋은 날 들고 나가기', 130, '/assets/decorations/room-items-sprite.png', 0, 2, '{"left":6,"top":67,"width":17}'),
  ('picnic-mat', 'decoration', 'picnic', '체크 돗자리', '펴면 어디든 한강 느낌', 100, '/assets/decorations/room-items-sprite.png', 1, 2, '{"left":34,"top":75,"width":26}'),
  ('camp-lantern', 'decoration', 'picnic', '캠핑 랜턴', '방 안인데 괜히 캠핑 기분', 120, '/assets/decorations/room-items-sprite.png', 2, 2, '{"left":68,"top":55,"width":10}'),
  ('floor-lamp', 'decoration', 'lighting', '플로어 조명', '천장등 끄면 감성 두 배', 150, '/assets/decorations/room-items-sprite.png', 3, 2, '{"left":88,"top":36,"width":9}'),
  ('mood-light', 'decoration', 'lighting', '버섯 무드등', '쓸모보다 귀여움이 중요', 100, '/assets/decorations/room-items-sprite.png', 0, 3, '{"left":58,"top":69,"width":8}'),
  ('wall-clock', 'decoration', 'retro', '레트로 벽시계', '시간은 가고 월급날은 안 옴', 120, '/assets/decorations/room-items-sprite.png', 1, 3, '{"left":69,"top":13,"width":9}'),
  ('retro-radio', 'decoration', 'retro', '빈티지 라디오', '주파수보다 분위기 수신 중', 140, '/assets/decorations/room-items-sprite.png', 2, 3, '{"left":75,"top":57,"width":12}'),
  ('turntable', 'decoration', 'retro', '턴테이블', '한 면 듣고 뒤집는 부지런함', 190, '/assets/decorations/room-items-sprite.png', 3, 3, '{"left":39,"top":62,"width":15}')
on conflict (id) do update set
  category = excluded.category, name = excluded.name, description = excluded.description,
  price = excluded.price, asset_path = excluded.asset_path, sprite_column = excluded.sprite_column,
  sprite_row = excluded.sprite_row, placement = excluded.placement;

create table if not exists public.user_inventory (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.shop_items (id) on delete restrict,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.companion_states
  add column if not exists equipped_room_skin text not null default 'attic';
alter table public.companion_states
  add column if not exists equipped_decorations text[] not null default '{}';

create index if not exists user_inventory_user_id_idx
  on public.user_inventory (user_id);

alter table public.shop_items enable row level security;
alter table public.user_inventory enable row level security;

revoke all on table public.shop_items from anon, authenticated;
revoke all on table public.user_inventory from anon, authenticated;
grant select on table public.shop_items to authenticated;
grant select on table public.user_inventory to authenticated;

drop policy if exists "shop_items_select_active" on public.shop_items;
create policy "shop_items_select_active"
  on public.shop_items for select to authenticated
  using (is_active = true);

drop policy if exists "user_inventory_select_own" on public.user_inventory;
create policy "user_inventory_select_own"
  on public.user_inventory for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.purchase_shop_item(p_item_id text)
returns public.user_inventory
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_item public.shop_items;
  purchased_item public.user_inventory;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;

  select * into requested_item
  from public.shop_items
  where id = p_item_id and is_active = true;

  if not found then raise exception '판매 중인 상품이 아닙니다.'; end if;
  if exists (select 1 from public.user_inventory where user_id = auth.uid() and item_id = p_item_id) then
    raise exception '이미 보유한 상품입니다.';
  end if;

  update public.profiles
  set points = points - requested_item.price
  where id = auth.uid() and points >= requested_item.price;

  if not found then raise exception '포인트가 부족합니다.'; end if;

  insert into public.user_inventory (user_id, item_id)
  values (auth.uid(), p_item_id)
  returning * into purchased_item;
  return purchased_item;
end;
$$;

revoke all on function public.purchase_shop_item(text) from public, anon;
grant execute on function public.purchase_shop_item(text) to authenticated;

create table if not exists public.daily_mission_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_date date not null default current_date,
  mission_id text not null check (char_length(mission_id) between 1 and 40),
  progress integer not null default 0 check (progress >= 0),
  goal integer not null check (goal > 0),
  reward integer not null check (reward >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  primary key (user_id, mission_date, mission_id)
);

create index if not exists daily_mission_progress_user_date_idx
  on public.daily_mission_progress (user_id, mission_date desc);

alter table public.daily_mission_progress enable row level security;
revoke all on table public.daily_mission_progress from anon, authenticated;
grant select, insert, update on table public.daily_mission_progress to authenticated;

drop policy if exists "daily_missions_select_own" on public.daily_mission_progress;
create policy "daily_missions_select_own"
  on public.daily_mission_progress for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "daily_missions_insert_own" on public.daily_mission_progress;
create policy "daily_missions_insert_own"
  on public.daily_mission_progress for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "daily_missions_update_own" on public.daily_mission_progress;
create policy "daily_missions_update_own"
  on public.daily_mission_progress for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
