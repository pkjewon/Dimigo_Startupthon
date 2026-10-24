-- =====================================================================
-- 0003_visits: 매장 방문 예정 (온라인에서 찾은 손님을 오프라인 매장으로)
-- 소비자가 오프라인 매장의 제안에 "방문 예정"을 남기면 매장에 알림,
-- 매장이 "확인했어요"를 누르면 소비자에게 알림
-- =====================================================================

create table public.visits (
  id           bigint generated always as identity primary key,
  consumer_id  uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  seller_id    uuid   not null references public.profiles (id) on delete cascade,  -- 트리거가 제안에서 채움
  proposal_id  bigint not null references public.proposals (id) on delete cascade,
  visit_date   date   not null,
  time_slot    text   not null default 'afternoon' check (time_slot in ('morning', 'afternoon', 'evening')),
  note         text   not null default '' check (char_length(note) <= 200),
  status       text   not null default 'planned' check (status in ('planned', 'confirmed', 'cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (consumer_id, proposal_id)   -- 같은 상품은 방문 예정 하나 (다시 잡으면 갱신)
);
create index visits_seller_idx on public.visits (seller_id, visit_date);

-- 알림 종류 추가: 매장에 방문 예정 / 소비자에게 방문 확인
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_request', 'new_proposal', 'new_dm', 'new_visit', 'visit_confirmed'));

-- 한국 시간 기준 오늘
create or replace function public.today_kst()
returns date
language sql stable
as $$
  select (now() at time zone 'Asia/Seoul')::date
$$;

-- 저장 전 검사: 판매자는 제안에서 채우고, 오프라인 매장만 허용, 누가 무엇을 바꿀 수 있는지 제한
create or replace function public.visits_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_seller uuid;
  v_type   text;
begin
  if tg_op = 'INSERT' then
    select p.seller_id, sp.seller_type into v_seller, v_type
    from public.proposals p
    join public.seller_profiles sp on sp.user_id = p.seller_id
    where p.id = new.proposal_id;

    if v_seller is null then
      raise exception 'proposal not found';
    end if;
    if v_type <> 'offline' then
      raise exception 'only offline stores accept visits';
    end if;
    new.seller_id := v_seller;
    new.status := 'planned';
  else
    if new.consumer_id <> old.consumer_id or new.seller_id <> old.seller_id or new.proposal_id <> old.proposal_id then
      raise exception 'visit owner cannot be changed';
    end if;

    if auth.uid() = old.seller_id then
      -- 매장은 확인만 할 수 있음
      if new.status <> 'confirmed' or new.visit_date <> old.visit_date or new.time_slot <> old.time_slot or new.note <> old.note then
        raise exception 'seller can only confirm a visit';
      end if;
    elsif auth.uid() = old.consumer_id then
      -- 소비자는 날짜·시간·메모 변경(다시 예정으로) 또는 취소
      if new.status not in ('planned', 'cancelled') then
        raise exception 'consumer can only plan or cancel';
      end if;
    end if;
    new.updated_at := now();
  end if;

  if new.status = 'planned' and new.visit_date < public.today_kst() then
    raise exception 'visit date is in the past';
  end if;
  return new;
end;
$$;

create trigger visits_before_write
  before insert or update on public.visits
  for each row execute function public.visits_guard();

-- 저장 후 알림
create or replace function public.visits_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'planned'
     and (tg_op = 'INSERT' or old.status <> 'planned' or old.visit_date <> new.visit_date or old.time_slot <> new.time_slot) then
    insert into public.notifications (user_id, type, target_id) values (new.seller_id, 'new_visit', new.id);
  elsif tg_op = 'UPDATE' and new.status = 'confirmed' and old.status <> 'confirmed' then
    insert into public.notifications (user_id, type, target_id) values (new.consumer_id, 'visit_confirmed', new.id);
  end if;
  return new;
end;
$$;

create trigger visits_after_write
  after insert or update on public.visits
  for each row execute function public.visits_notify();

-- RLS: 당사자(소비자·매장)만 조회, 소비자만 생성, 당사자만 수정 (무엇을 바꿀지는 트리거가 제한)
alter table public.visits enable row level security;

create policy "visits: 당사자 조회"
  on public.visits for select
  to authenticated
  using ((select auth.uid()) in (consumer_id, seller_id));

create policy "visits: 소비자만 생성"
  on public.visits for insert
  to authenticated
  with check (consumer_id = (select auth.uid()) and (select public.my_role()) = 'consumer');

create policy "visits: 당사자 수정"
  on public.visits for update
  to authenticated
  using ((select auth.uid()) in (consumer_id, seller_id))
  with check ((select auth.uid()) in (consumer_id, seller_id));
