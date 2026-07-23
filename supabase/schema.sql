-- SelectFood: 입장 코드 기반 실시간 방 (로그인 없음)
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting'
    check (status in ('waiting', 'answering', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  nickname text not null,
  client_key text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, client_key),
  unique (room_id, nickname)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (participant_id)
);

create index if not exists rooms_code_idx on public.rooms (code);
create index if not exists participants_room_id_idx on public.participants (room_id);
create index if not exists answers_room_id_idx on public.answers (room_id);

alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.answers enable row level security;

-- 로그인 없이 anon 키로 동작. 입장 코드가 사실상 접근 키입니다.
drop policy if exists "rooms_select" on public.rooms;
drop policy if exists "rooms_insert" on public.rooms;
drop policy if exists "rooms_update" on public.rooms;
create policy "rooms_select" on public.rooms for select to anon, authenticated using (true);
create policy "rooms_insert" on public.rooms for insert to anon, authenticated with check (true);
create policy "rooms_update" on public.rooms for update to anon, authenticated using (true) with check (true);

drop policy if exists "participants_select" on public.participants;
drop policy if exists "participants_insert" on public.participants;
drop policy if exists "participants_update" on public.participants;
create policy "participants_select" on public.participants for select to anon, authenticated using (true);
create policy "participants_insert" on public.participants for insert to anon, authenticated with check (true);
create policy "participants_update" on public.participants for update to anon, authenticated using (true) with check (true);

drop policy if exists "answers_select" on public.answers;
drop policy if exists "answers_insert" on public.answers;
drop policy if exists "answers_update" on public.answers;
create policy "answers_select" on public.answers for select to anon, authenticated using (true);
create policy "answers_insert" on public.answers for insert to anon, authenticated with check (true);
create policy "answers_update" on public.answers for update to anon, authenticated using (true) with check (true);

-- Realtime 구독 대상 등록
do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.participants;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.answers;
  exception when duplicate_object then null;
  end;
end $$;
