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
alter table public.shop_items add column if not exists slot text;

insert into public.shop_items (id, item_type, name, description, price, asset_path)
values
  ('attic', 'room_skin', '밤의 다락방', '처음 지급되는 기본 방', 0, '/assets/flat/room-attic.svg'),
  ('cloud', 'room_skin', '새벽 구름방', '구름 위로 아침이 오는 방', 250, '/assets/flat/room-cloud.svg'),
  ('game', 'room_skin', '주말 게임방', '잔액보다 세이브 파일이 중요한 방', 400, '/assets/flat/room-game.svg')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  asset_path = excluded.asset_path;

insert into public.shop_items (id, item_type, category, name, description, price, asset_path, sprite_column, sprite_row, placement)
values
  ('tv', 'decoration', 'appliance', '작은 TV', '주말을 순식간에 없애는 화면', 180, '/assets/flat/items/tv.svg', 0, 0, '{"left":6,"top":51,"width":25}'),
  ('console', 'decoration', 'appliance', '게임기', '할 게임은 많은데 시간은 없음', 220, '/assets/flat/items/console.svg', 1, 0, '{"left":20,"top":69,"width":16}'),
  ('air-conditioner', 'decoration', 'appliance', '에어컨', '강아지 털도 여름은 덥습니다', 260, '/assets/flat/items/air-conditioner.svg', 2, 0, '{"left":37,"top":7,"width":22}'),
  ('air-purifier', 'decoration', 'appliance', '공기청정기', '털은 못 잡아도 기분은 상쾌', 160, '/assets/flat/items/air-purifier.svg', 3, 0, '{"left":86,"top":54,"width":10}'),
  ('air-fryer', 'decoration', 'appliance', '에어프라이어', '냉동 감자의 최종 목적지', 140, '/assets/flat/items/air-fryer.svg', 0, 1, '{"left":74,"top":62,"width":11}'),
  ('christmas-tree', 'decoration', 'christmas', '미니 트리', '방 한쪽만 갑자기 연말', 200, '/assets/flat/items/christmas-tree.svg', 1, 1, '{"left":79,"top":34,"width":18}'),
  ('string-lights', 'decoration', 'christmas', '전구 가랜드', '전기세보다 분위기가 먼저', 110, '/assets/flat/items/string-lights.svg', 2, 1, '{"left":32,"top":7,"width":35}'),
  ('gift-boxes', 'decoration', 'christmas', '선물상자', '내용물은 아직 비밀', 90, '/assets/flat/items/gift-boxes.svg', 3, 1, '{"left":66,"top":70,"width":15}'),
  ('picnic-basket', 'decoration', 'picnic', '피크닉 바구니', '날씨 좋은 날 들고 나가기', 130, '/assets/flat/items/picnic-basket.svg', 0, 2, '{"left":6,"top":67,"width":17}'),
  ('picnic-mat', 'decoration', 'picnic', '체크 돗자리', '펴면 어디든 한강 느낌', 100, '/assets/flat/items/picnic-mat.svg', 1, 2, '{"left":34,"top":75,"width":26}'),
  ('camp-lantern', 'decoration', 'picnic', '캠핑 랜턴', '방 안인데 괜히 캠핑 기분', 120, '/assets/flat/items/camp-lantern.svg', 2, 2, '{"left":68,"top":55,"width":10}'),
  ('floor-lamp', 'decoration', 'lighting', '플로어 조명', '천장등 끄면 감성 두 배', 150, '/assets/flat/items/floor-lamp.svg', 3, 2, '{"left":88,"top":36,"width":9}'),
  ('mood-light', 'decoration', 'lighting', '버섯 무드등', '쓸모보다 귀여움이 중요', 100, '/assets/flat/items/mood-light.svg', 0, 3, '{"left":58,"top":69,"width":8}'),
  ('wall-clock', 'decoration', 'retro', '레트로 벽시계', '시간은 가고 월급날은 안 옴', 120, '/assets/flat/items/wall-clock.svg', 1, 3, '{"left":69,"top":13,"width":9}'),
  ('retro-radio', 'decoration', 'retro', '빈티지 라디오', '주파수보다 분위기 수신 중', 140, '/assets/flat/items/retro-radio.svg', 2, 3, '{"left":75,"top":57,"width":12}'),
  ('turntable', 'decoration', 'retro', '턴테이블', '한 면 듣고 뒤집는 부지런함', 190, '/assets/flat/items/turntable.svg', 3, 3, '{"left":39,"top":62,"width":15}')
on conflict (id) do update set
  category = excluded.category, name = excluded.name, description = excluded.description,
  price = excluded.price, asset_path = excluded.asset_path, sprite_column = excluded.sprite_column,
  sprite_row = excluded.sprite_row, placement = excluded.placement;

-- 소품은 자유 좌표가 아니라 방의 고정 슬롯에 배치됩니다.
update public.shop_items set slot = case id
  when 'tv' then 'media-screen' when 'console' then 'media-console'
  when 'air-conditioner' then 'upper-wall' when 'string-lights' then 'upper-wall'
  when 'air-purifier' then 'right-appliance' when 'air-fryer' then 'right-appliance'
  when 'christmas-tree' then 'right-corner' when 'floor-lamp' then 'right-corner'
  when 'gift-boxes' then 'floor-left' when 'picnic-basket' then 'floor-left'
  when 'picnic-mat' then 'floor-center' when 'wall-clock' then 'wall-accent'
  when 'camp-lantern' then 'tabletop' when 'mood-light' then 'tabletop'
  when 'retro-radio' then 'tabletop' when 'turntable' then 'tabletop'
  else slot end
where item_type = 'decoration';

-- 암호화 개인 백업: 내용은 클라이언트에서 AES-GCM으로 암호화한 뒤 저장합니다.
create table if not exists public.encrypted_backups (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{22}$'),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '365 days')
);

alter table public.encrypted_backups enable row level security;
revoke all on public.encrypted_backups from anon, authenticated;
grant insert, select, delete on public.encrypted_backups to authenticated;

drop policy if exists "encrypted_backups_insert_own" on public.encrypted_backups;
create policy "encrypted_backups_insert_own" on public.encrypted_backups
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "encrypted_backups_select_own" on public.encrypted_backups;
create policy "encrypted_backups_select_own" on public.encrypted_backups
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "encrypted_backups_delete_own" on public.encrypted_backups;
create policy "encrypted_backups_delete_own" on public.encrypted_backups
  for delete to authenticated using (owner_id = (select auth.uid()));

-- 새 익명 계정에서도 복구 코드의 무작위 id를 아는 경우 암호문만 읽습니다.
-- 복호화 키는 DB에 저장하지 않고 복구 코드 뒤쪽에만 존재합니다.
create or replace function public.read_encrypted_backup(p_id text)
returns table (ciphertext text, iv text)
language sql security definer set search_path = ''
as $$
  select b.ciphertext, b.iv
  from public.encrypted_backups b
  where b.id = p_id and b.expires_at > now();
$$;

revoke all on function public.read_encrypted_backup(text) from public, anon;
grant execute on function public.read_encrypted_backup(text) to authenticated;

-- v2.1 둘만의 공동룸
-- 실제 결제 원문은 공유하지 않고, 사용자가 공개한 합계·카테고리·메모만 별도 저장합니다.
create table if not exists public.mate_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '같이 아끼는 방' check (char_length(name) between 1 and 30),
  daily_limit bigint not null default 15000 check (daily_limit between 1000 and 1000000),
  shared_points bigint not null default 0 check (shared_points >= 0),
  created_at timestamptz not null default now()
);
alter table public.mate_rooms
  add column if not exists theme text not null default 'christmas'
  check (theme in ('christmas', 'camping'));
alter table public.mate_rooms add column if not exists success_days integer not null default 0 check (success_days >= 0);
alter table public.mate_rooms add column if not exists room_level smallint not null default 1 check (room_level between 1 and 4);

create table if not exists public.mate_room_members (
  room_id uuid not null references public.mate_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  share_details boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table public.mate_room_members
  add column if not exists display_name text not null default '눈찌'
  check (char_length(display_name) between 1 and 20);
alter table public.mate_room_members
  add column if not exists companion_id text not null default 'nunchi'
  check (companion_id in ('nunchi', 'foodie', 'shopper', 'subscriber'));
alter table public.mate_room_members
  add column if not exists outfit_id text not null default 'none';
alter table public.mate_room_members
  add column if not exists visual_state text not null default 'neutral'
  check (visual_state in ('neutral', 'chubby', 'very-chubby', 'receipt', 'eating'));
alter table public.mate_room_members
  add column if not exists food_pile_count smallint not null default 0
  check (food_pile_count between 0 and 4);
alter table public.mate_room_members
  add column if not exists parcel_pile_count smallint not null default 0
  check (parcel_pile_count between 0 and 4);

create table if not exists public.mate_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mate_rooms (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.mate_daily_summaries (
  room_id uuid not null references public.mate_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  summary_date date not null default current_date,
  total_spent bigint not null default 0 check (total_spent >= 0),
  category_totals jsonb not null default '{}'::jsonb check (jsonb_typeof(category_totals) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id, summary_date),
  foreign key (room_id, user_id) references public.mate_room_members (room_id, user_id) on delete cascade
);

create table if not exists public.mate_shared_expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mate_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('coffee','delivery','dining','transport','shopping','game','subscription','living','other')),
  amount bigint not null check (amount > 0),
  memo text check (memo is null or char_length(memo) <= 40),
  spent_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (room_id, user_id) references public.mate_room_members (room_id, user_id) on delete cascade
);

create table if not exists public.mate_reactions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mate_rooms (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null check (reaction in ('잘 참는 중', '눈찌가 보고 있다', '오늘도 같이 가자')),
  created_at timestamptz not null default now(),
  foreign key (room_id, sender_id) references public.mate_room_members (room_id, user_id) on delete cascade
);

create table if not exists public.mate_daily_successes (
  room_id uuid not null references public.mate_rooms (id) on delete cascade,
  success_date date not null default current_date,
  combined_spent bigint not null check (combined_spent >= 0),
  created_at timestamptz not null default now(),
  primary key (room_id, success_date)
);
alter table public.mate_daily_successes add column if not exists mission_type text;
alter table public.mate_daily_successes add column if not exists goal bigint;
alter table public.mate_daily_successes add column if not exists theme text not null default 'christmas'
  check (theme in ('christmas', 'camping'));
alter table public.mate_daily_successes drop constraint if exists mate_daily_successes_pkey;
alter table public.mate_daily_successes add primary key (room_id, success_date, theme);

create table if not exists public.mate_theme_progress (
  room_id uuid not null references public.mate_rooms (id) on delete cascade,
  theme text not null check (theme in ('christmas', 'camping')),
  success_days integer not null default 0 check (success_days >= 0),
  room_level smallint not null default 1 check (room_level between 1 and 4),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, theme)
);
alter table public.mate_theme_progress add column if not exists started_at timestamptz not null default now();
insert into public.mate_theme_progress (room_id, theme, success_days, room_level)
select id, theme, success_days, room_level from public.mate_rooms
on conflict (room_id, theme) do nothing;

create or replace function private.is_mate_room_member(p_room_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.mate_room_members
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

alter table public.mate_rooms enable row level security;
alter table public.mate_room_members enable row level security;
alter table public.mate_invites enable row level security;
alter table public.mate_daily_summaries enable row level security;
alter table public.mate_shared_expenses enable row level security;
alter table public.mate_reactions enable row level security;
alter table public.mate_daily_successes enable row level security;
alter table public.mate_theme_progress enable row level security;

revoke all on public.mate_rooms, public.mate_room_members, public.mate_invites from anon, authenticated;
grant select on public.mate_rooms to authenticated;
grant select on public.mate_room_members to authenticated;
grant select, insert, update, delete on public.mate_daily_summaries to authenticated;
grant select, insert, update, delete on public.mate_shared_expenses to authenticated;
grant select, insert, delete on public.mate_reactions to authenticated;
grant select on public.mate_daily_successes to authenticated;
grant select on public.mate_theme_progress to authenticated;

drop policy if exists "mate_rooms_members_only" on public.mate_rooms;
drop policy if exists "mate_rooms_create_own" on public.mate_rooms;
drop policy if exists "mate_members_members_only" on public.mate_room_members;
drop policy if exists "mate_members_join_self" on public.mate_room_members;
drop policy if exists "mate_members_leave_self" on public.mate_room_members;
drop policy if exists "mate_invites_owner_manage" on public.mate_invites;
drop policy if exists "mate_summaries_members_read" on public.mate_daily_summaries;
drop policy if exists "mate_summaries_write_own" on public.mate_daily_summaries;
drop policy if exists "mate_expenses_members_read" on public.mate_shared_expenses;
drop policy if exists "mate_expenses_write_own" on public.mate_shared_expenses;
drop policy if exists "mate_reactions_members_read" on public.mate_reactions;
drop policy if exists "mate_reactions_send_own" on public.mate_reactions;
drop policy if exists "mate_successes_members_read" on public.mate_daily_successes;
drop policy if exists "mate_theme_progress_members_read" on public.mate_theme_progress;

create policy "mate_rooms_members_only" on public.mate_rooms for select to authenticated
  using (private.is_mate_room_member(id));
create policy "mate_rooms_create_own" on public.mate_rooms for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "mate_members_members_only" on public.mate_room_members for select to authenticated
  using (private.is_mate_room_member(room_id));
create policy "mate_members_join_self" on public.mate_room_members for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "mate_members_leave_self" on public.mate_room_members for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "mate_invites_owner_manage" on public.mate_invites for all to authenticated
  using (inviter_id = (select auth.uid())) with check (inviter_id = (select auth.uid()));
create policy "mate_summaries_members_read" on public.mate_daily_summaries for select to authenticated
  using (private.is_mate_room_member(room_id));
create policy "mate_summaries_write_own" on public.mate_daily_summaries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mate_expenses_members_read" on public.mate_shared_expenses for select to authenticated
  using (private.is_mate_room_member(room_id));
create policy "mate_expenses_write_own" on public.mate_shared_expenses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mate_reactions_members_read" on public.mate_reactions for select to authenticated
  using (private.is_mate_room_member(room_id));
create policy "mate_reactions_send_own" on public.mate_reactions for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.is_mate_room_member(room_id));
create policy "mate_successes_members_read" on public.mate_daily_successes for select to authenticated
  using (private.is_mate_room_member(room_id));
create policy "mate_theme_progress_members_read" on public.mate_theme_progress for select to authenticated
  using (private.is_mate_room_member(room_id));

revoke all on function private.is_mate_room_member(uuid) from public, anon;
grant execute on function private.is_mate_room_member(uuid) to authenticated;

create or replace function public.create_mate_room(p_display_name text default '눈찌')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.mate_rooms;
  v_code text;
begin
  if auth.uid() is null then raise exception '인증이 필요합니다.'; end if;
  if exists (select 1 from public.mate_room_members where user_id = auth.uid()) then
    raise exception '이미 다른 친구와 연결되어 있습니다.';
  end if;
  insert into public.mate_rooms (owner_id) values (auth.uid()) returning * into v_room;
  insert into public.mate_theme_progress (room_id, theme) values (v_room.id, v_room.theme);
  insert into public.mate_room_members (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), left(coalesce(nullif(trim(p_display_name), ''), '눈찌'), 20));
  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.mate_invites where code = v_code and status = 'pending');
  end loop;
  insert into public.mate_invites (room_id, inviter_id, code)
  values (v_room.id, auth.uid(), v_code);
  return jsonb_build_object('roomId', v_room.id, 'code', v_code);
end;
$$;

create or replace function public.accept_mate_invite(p_code text, p_display_name text default '눈찌')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.mate_invites;
  v_count integer;
begin
  if auth.uid() is null then raise exception '인증이 필요합니다.'; end if;
  select * into v_invite from public.mate_invites
  where code = upper(trim(p_code)) and status = 'pending' and expires_at > now()
  for update;
  if not found then raise exception '유효하지 않거나 만료된 코드입니다.'; end if;
  if v_invite.inviter_id = auth.uid() then raise exception '내 초대 코드에는 참여할 수 없습니다.'; end if;
  if exists (select 1 from public.mate_room_members where user_id = auth.uid()) then
    raise exception '이미 다른 친구와 연결되어 있습니다.';
  end if;
  select count(*) into v_count from public.mate_room_members where room_id = v_invite.room_id;
  if v_count >= 2 then raise exception '이미 두 명이 연결되어 있습니다.'; end if;
  insert into public.mate_room_members (room_id, user_id, display_name)
  values (v_invite.room_id, auth.uid(), left(coalesce(nullif(trim(p_display_name), ''), '눈찌'), 20));
  update public.mate_invites set status = 'accepted', accepted_by = auth.uid() where id = v_invite.id;
  return jsonb_build_object('roomId', v_invite.room_id, 'joined', true);
end;
$$;

revoke all on function public.create_mate_room(text) from public, anon;
revoke all on function public.accept_mate_invite(text, text) from public, anon;
grant execute on function public.create_mate_room(text) to authenticated;
grant execute on function public.accept_mate_invite(text, text) to authenticated;

create or replace function public.set_mate_room_theme(p_room_id uuid, p_theme text)
returns text language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception '인증이 필요합니다.'; end if;
  if p_theme not in ('christmas', 'camping') then raise exception '지원하지 않는 테마입니다.'; end if;
  if not private.is_mate_room_member(p_room_id) then raise exception '연결된 사용자만 바꿀 수 있습니다.'; end if;
  insert into public.mate_theme_progress (room_id, theme) values (p_room_id, p_theme)
  on conflict (room_id, theme) do nothing;
  update public.mate_rooms set theme = p_theme where id = p_room_id;
  return p_theme;
end;
$$;

revoke all on function public.set_mate_room_theme(uuid, text) from public, anon;
grant execute on function public.set_mate_room_theme(uuid, text) to authenticated;

drop function if exists public.sync_mate_avatar(uuid, text, text, text, text);
create or replace function public.sync_mate_avatar(
  p_room_id uuid,
  p_display_name text,
  p_companion_id text,
  p_outfit_id text,
  p_visual_state text,
  p_food_pile_count integer,
  p_parcel_pile_count integer
)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception '인증이 필요합니다.'; end if;
  if not private.is_mate_room_member(p_room_id) then raise exception '연결된 사용자만 변경할 수 있습니다.'; end if;
  if p_companion_id not in ('nunchi', 'foodie', 'shopper', 'subscriber') then raise exception '지원하지 않는 눈찌입니다.'; end if;
  if p_visual_state not in ('neutral', 'chubby', 'very-chubby', 'receipt', 'eating') then raise exception '지원하지 않는 상태입니다.'; end if;
  update public.mate_room_members
  set display_name = left(coalesce(nullif(trim(p_display_name), ''), '눈찌'), 20),
      companion_id = p_companion_id,
      outfit_id = left(coalesce(nullif(trim(p_outfit_id), ''), 'none'), 60),
      visual_state = p_visual_state,
      food_pile_count = least(4, greatest(0, p_food_pile_count)),
      parcel_pile_count = least(4, greatest(0, p_parcel_pile_count))
  where room_id = p_room_id and user_id = auth.uid();
  return found;
end;
$$;

revoke all on function public.sync_mate_avatar(uuid, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.sync_mate_avatar(uuid, text, text, text, text, integer, integer) to authenticated;

create or replace function public.get_mate_daily_mission(p_room_id uuid, p_date date default current_date)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_pick integer;
  v_theme text;
begin
  if auth.uid() is null then raise exception '인증이 필요합니다.'; end if;
  if not private.is_mate_room_member(p_room_id) then raise exception '연결된 사용자만 확인할 수 있습니다.'; end if;
  select theme into v_theme from public.mate_rooms where id = p_room_id;
  v_pick := abs(pg_catalog.hashtextextended(p_room_id::text || v_theme || p_date::text, 0) % 4);
  return case v_pick
    when 0 then jsonb_build_object('type','each_limit','title','둘 다 15,000원 이하로 쓰기','goal',15000)
    when 1 then jsonb_build_object('type','combined_limit','title','둘이 합쳐 25,000원 이하로 쓰기','goal',25000)
    when 2 then jsonb_build_object('type','food_limit','title','둘의 식비 합계 16,000원 이하로 쓰기','goal',16000)
    else jsonb_build_object('type','shopping_limit','title','둘의 쇼핑 합계 20,000원 이하로 쓰기','goal',20000)
  end;
end;
$$;

create or replace function public.complete_mate_daily_mission(p_room_id uuid, p_date date default (current_date - 1))
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_limit bigint;
  v_member_count integer;
  v_summary_count integer;
  v_combined bigint;
  v_category_spent bigint;
  v_pick integer;
  v_mission_type text;
  v_goal bigint;
  v_success boolean := false;
  v_success_days integer;
  v_level smallint;
  v_inserted integer;
  v_theme text;
  v_theme_started_at timestamptz;
begin
  if auth.uid() is null then raise exception '인증이 필요합니다.'; end if;
  if not private.is_mate_room_member(p_room_id) then raise exception '연결된 사용자만 완료할 수 있습니다.'; end if;
  select daily_limit, theme into v_limit, v_theme from public.mate_rooms where id = p_room_id for update;
  insert into public.mate_theme_progress (room_id, theme) values (p_room_id, v_theme)
  on conflict (room_id, theme) do nothing;
  select started_at into v_theme_started_at from public.mate_theme_progress where room_id = p_room_id and theme = v_theme;
  if p_date < v_theme_started_at::date then
    return jsonb_build_object('completed', false, 'reason', '이 테마를 시작한 날부터 미션이 쌓여요.');
  end if;
  select count(*) into v_member_count from public.mate_room_members where room_id = p_room_id;
  if v_member_count <> 2 then
    return jsonb_build_object('completed', false, 'reason', '친구가 참여하면 시작돼요.');
  end if;
  select count(*), coalesce(sum(total_spent), 0)
  into v_summary_count, v_combined
  from public.mate_daily_summaries
  where room_id = p_room_id and summary_date = p_date;
  if v_summary_count <> 2 then return jsonb_build_object('completed', false, 'reason', '두 사람의 기록이 모두 필요해요.'); end if;
  v_pick := abs(pg_catalog.hashtextextended(p_room_id::text || v_theme || p_date::text, 0) % 4);
  if v_pick = 0 then
    v_mission_type := 'each_limit'; v_goal := 15000;
    select bool_and(total_spent <= v_goal) into v_success from public.mate_daily_summaries where room_id = p_room_id and summary_date = p_date;
  elsif v_pick = 1 then
    v_mission_type := 'combined_limit'; v_goal := 25000; v_success := v_combined <= v_goal;
  elsif v_pick = 2 then
    v_mission_type := 'food_limit'; v_goal := 16000;
    select coalesce(sum(coalesce((category_totals->>'coffee')::bigint,0) + coalesce((category_totals->>'delivery')::bigint,0) + coalesce((category_totals->>'dining')::bigint,0)),0)
    into v_category_spent from public.mate_daily_summaries where room_id = p_room_id and summary_date = p_date;
    v_success := v_category_spent <= v_goal;
  else
    v_mission_type := 'shopping_limit'; v_goal := 20000;
    select coalesce(sum(coalesce((category_totals->>'shopping')::bigint,0)),0)
    into v_category_spent from public.mate_daily_summaries where room_id = p_room_id and summary_date = p_date;
    v_success := v_category_spent <= v_goal;
  end if;
  if not v_success then return jsonb_build_object('completed', false, 'reason', '어제 공동 미션 한도를 넘었어요.'); end if;
  insert into public.mate_daily_successes (room_id, success_date, combined_spent, mission_type, goal, theme)
  values (p_room_id, p_date, v_combined, v_mission_type, v_goal, v_theme)
  on conflict (room_id, success_date, theme) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    insert into public.mate_theme_progress (room_id, theme, success_days, room_level)
    values (p_room_id, v_theme, 1, 1)
    on conflict (room_id, theme) do update
      set success_days = public.mate_theme_progress.success_days + 1, updated_at = now();
  end if;
  insert into public.mate_theme_progress (room_id, theme) values (p_room_id, v_theme)
  on conflict (room_id, theme) do nothing;
  select success_days into v_success_days from public.mate_theme_progress where room_id = p_room_id and theme = v_theme;
  v_level := case when v_success_days >= 14 then 4 when v_success_days >= 7 then 3 when v_success_days >= 3 then 2 else 1 end;
  update public.mate_theme_progress set room_level = v_level, updated_at = now() where room_id = p_room_id and theme = v_theme;
  update public.mate_rooms set success_days = v_success_days, room_level = v_level where id = p_room_id;
  return jsonb_build_object('completed', true, 'new', v_inserted > 0, 'successDays', v_success_days, 'roomLevel', v_level);
end;
$$;

revoke all on function public.get_mate_daily_mission(uuid, date) from public, anon;
grant execute on function public.get_mate_daily_mission(uuid, date) to authenticated;
revoke all on function public.complete_mate_daily_mission(uuid, date) from public, anon;
grant execute on function public.complete_mate_daily_mission(uuid, date) to authenticated;

create or replace function public.leave_mate_room(p_room_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception '인증이 필요합니다.'; end if;
  if not private.is_mate_room_member(p_room_id) then raise exception '연결된 친구가 없습니다.'; end if;
  -- 2인 전용 팀룸이므로 한 명이 나가면 방과 공유 데이터 전체를 종료합니다.
  delete from public.mate_rooms where id = p_room_id;
  return true;
end;
$$;

revoke all on function public.leave_mate_room(uuid) from public, anon;
grant execute on function public.leave_mate_room(uuid) to authenticated;

insert into public.shop_items (id, item_type, category, name, description, price, asset_path, sprite_column, sprite_row, placement, slot)
values
  ('furniture-bed', 'decoration', 'retro', '포근한 침대', '방의 절반을 차지하는 행복', 0, '/assets/flat/items/furniture-bed.svg', 0, 0, '{}', 'seating'),
  ('furniture-bookcase', 'decoration', 'retro', '원목 책장', '읽은 책보다 장식이 더 많음', 0, '/assets/flat/items/furniture-bookcase.svg', 1, 0, '{}', 'storage'),
  ('furniture-rug', 'decoration', 'retro', '타원 러그', '강아지가 제일 먼저 차지함', 0, '/assets/flat/items/furniture-rug.svg', 2, 0, '{}', 'main-rug'),
  ('furniture-sofa', 'decoration', 'retro', '남색 소파', '게임 켜고 그대로 잠드는 자리', 0, '/assets/flat/items/furniture-sofa.svg', 3, 0, '{}', 'seating'),
  ('furniture-tv-unit', 'decoration', 'retro', '원목 TV장', '게임기들이 모이는 본진', 0, '/assets/flat/items/furniture-tv-unit.svg', 0, 1, '{}', 'storage'),
  ('furniture-side-table', 'decoration', 'retro', '둥근 협탁', '컵 하나 올리면 꽉 참', 0, '/assets/flat/items/furniture-side-table.svg', 1, 1, '{}', 'side-table'),
  ('furniture-wall-shelf', 'decoration', 'retro', '벽 선반', '작은 소품을 위한 무대', 0, '/assets/flat/items/furniture-wall-shelf.svg', 2, 1, '{}', 'wall-shelf'),
  ('furniture-plant', 'decoration', 'retro', '큰 화분', '물 주는 날은 늘 내일', 0, '/assets/flat/items/furniture-plant.svg', 3, 1, '{}', 'plant')
on conflict (id) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  asset_path = excluded.asset_path, sprite_column = excluded.sprite_column,
  sprite_row = excluded.sprite_row, slot = excluded.slot;

update public.shop_items set placement = case id
  when 'tv' then '{"left":5,"top":48,"width":23}'::jsonb
  when 'console' then '{"left":10,"top":72,"width":10}'::jsonb
  when 'air-conditioner' then '{"left":38,"top":7,"width":20}'::jsonb
  when 'air-purifier' then '{"left":85,"top":64,"width":8}'::jsonb
  when 'air-fryer' then '{"left":84,"top":63,"width":9}'::jsonb
  when 'christmas-tree' then '{"left":83,"top":36,"width":12}'::jsonb
  when 'string-lights' then '{"left":32,"top":7,"width":35}'::jsonb
  when 'gift-boxes' then '{"left":4,"top":74,"width":12}'::jsonb
  when 'picnic-basket' then '{"left":4,"top":72,"width":13}'::jsonb
  when 'picnic-mat' then '{"left":38,"top":78,"width":20}'::jsonb
  when 'camp-lantern' then '{"left":69,"top":58,"width":8}'::jsonb
  when 'floor-lamp' then '{"left":86,"top":38,"width":7}'::jsonb
  when 'mood-light' then '{"left":70,"top":59,"width":6}'::jsonb
  when 'wall-clock' then '{"left":69,"top":14,"width":8}'::jsonb
  when 'retro-radio' then '{"left":68,"top":58,"width":9}'::jsonb
  when 'turntable' then '{"left":68,"top":57,"width":10}'::jsonb
  else placement end
where item_type = 'decoration';

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


-- Flat room v2: assets are standalone SVGs, slots share the 1000x650 scene coordinates.
alter table public.companion_states add column if not exists room_layouts jsonb not null default '{}'::jsonb;
update public.shop_items set sprite_column = null, sprite_row = null, placement = '{}'::jsonb,
 slot = case id
 when 'furniture-bed' then 'seat'
 when 'furniture-sofa' then 'seat'
 when 'furniture-bookcase' then 'cabinet'
 when 'furniture-tv-unit' then 'cabinet'
 when 'furniture-rug' then 'rug'
 when 'picnic-mat' then 'rug'
 when 'furniture-side-table' then 'table'
 when 'furniture-wall-shelf' then 'shelf'
 when 'furniture-plant' then 'plant'
 when 'tv' then 'screen'
 when 'console' then 'console'
 when 'air-conditioner' then 'wall'
 when 'string-lights' then 'wall'
 when 'air-purifier' then 'appliance'
 when 'air-fryer' then 'appliance'
 when 'christmas-tree' then 'lamp'
 when 'floor-lamp' then 'lamp'
 when 'gift-boxes' then 'basket'
 when 'picnic-basket' then 'basket'
 when 'camp-lantern' then 'tabletop'
 when 'mood-light' then 'tabletop'
 when 'wall-clock' then 'clock'
 when 'retro-radio' then 'tabletop'
 when 'turntable' then 'tabletop'
 else slot end
where item_type = 'decoration';
