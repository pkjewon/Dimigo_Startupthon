-- =====================================================================
-- 0001_init: 전체 스키마 + RLS + 알림 트리거 + 스토리지
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 테이블
-- ---------------------------------------------------------------------

create table public.categories (
  id          text primary key,
  name        text not null,
  sort_order  int  not null
);

insert into public.categories (id, name, sort_order) values
  ('top',    '상의',          1),
  ('bottom', '하의',          2),
  ('outer',  '아우터',        3),
  ('dress',  '원피스·스커트', 4),
  ('shoes',  '신발',          5),
  ('bag',    '가방',          6),
  ('acc',    '액세서리',      7);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('consumer', 'seller')),
  nickname    text not null,
  created_at  timestamptz not null default now()
);

create table public.seller_profiles (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  shop_name           text not null,
  seller_type         text not null default 'online' check (seller_type in ('online', 'offline', 'individual')),
  shop_url            text,
  location_url        text,
  is_subscribed       boolean not null default false,
  interest_categories text[]  not null default '{}'
);

create table public.requests (
  id           bigint generated always as identity primary key,
  consumer_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id  text not null references public.categories (id),
  title        text not null check (char_length(title) between 1 and 100),
  body         text not null default '',
  brand        text,
  size         text,
  budget_max   int  not null check (budget_max >= 0),
  conditions   text[] not null default '{}',   -- new | used | vintage | sealed
  image_urls   text[] not null default '{}' check (cardinality(image_urls) <= 5),
  created_at   timestamptz not null default now()
);
create index requests_created_idx  on public.requests (created_at desc);
create index requests_category_idx on public.requests (category_id, created_at desc);

create table public.proposals (
  id            bigint generated always as identity primary key,
  request_id    bigint not null references public.requests (id) on delete cascade,
  seller_id     uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  product_name  text   not null,
  price         int    not null check (price >= 0),
  condition     text   check (condition in ('new', 'unused', 'used_a', 'used_b')),
  size_info     text,
  description   text   not null default '',
  image_url     text,
  product_url   text,
  location_url  text,
  created_at    timestamptz not null default now()
);
create index proposals_request_idx on public.proposals (request_id);
create index proposals_seller_idx  on public.proposals (seller_id, created_at desc);

create table public.watches (
  user_id     uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  request_id  bigint not null references public.requests (id) on delete cascade,
  notify      boolean not null default true,
  primary key (user_id, request_id)
);

create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid   not null references public.profiles (id) on delete cascade,
  type        text   not null check (type in ('new_request', 'new_proposal', 'new_dm')),
  target_id   bigint not null,   -- new_request/new_proposal: request id, new_dm: thread id
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.dm_threads (
  id           bigint generated always as identity primary key,
  consumer_id  uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  seller_id    uuid   not null references public.profiles (id) on delete cascade,
  proposal_id  bigint references public.proposals (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (consumer_id, seller_id)
);

create table public.dm_messages (
  id          bigint generated always as identity primary key,
  thread_id   bigint not null references public.dm_threads (id) on delete cascade,
  sender_id   uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text   not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index dm_messages_thread_idx on public.dm_messages (thread_id, created_at);

create table public.orders (
  id              bigint generated always as identity primary key,
  consumer_id     uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  proposal_id     bigint not null references public.proposals (id) on delete restrict,
  amount          int    not null default 0,   -- 트리거가 제안 가격으로 덮어씀
  fee             int    not null default 0,   -- 트리거가 amount * 5% 로 계산
  status          text   not null default 'paid' check (status in ('paid', 'cancelled')),
  recipient_name  text,
  address         text,
  created_at      timestamptz not null default now()
);

create table public.ratings (
  id           bigint generated always as identity primary key,
  consumer_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  seller_id    uuid not null references public.profiles (id) on delete cascade,
  score        int  not null check (score between 1 and 5),
  created_at   timestamptz not null default now(),
  unique (consumer_id, seller_id)
);

-- 판매자 평균 평점
create view public.seller_ratings
with (security_invoker = true) as
  select seller_id, round(avg(score)::numeric, 1) as avg_score, count(*)::int as rating_count
  from public.ratings
  group by seller_id;

-- ---------------------------------------------------------------------
-- 2. 헬퍼 함수
-- ---------------------------------------------------------------------

-- 로그인한 사용자의 역할 (RLS 안에서 profiles 재귀 조회를 피하려고 security definer)
create or replace function public.my_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- 3. 트리거
-- ---------------------------------------------------------------------

-- 회원가입 시 profiles (+ 판매자면 seller_profiles) 생성
-- signUp 의 options.data 로 { role, nickname } 을 넘긴다
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role     text := coalesce(new.raw_user_meta_data ->> 'role', 'consumer');
  v_nickname text := coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''), split_part(new.email, '@', 1));
begin
  if v_role not in ('consumer', 'seller') then
    v_role := 'consumer';
  end if;

  insert into public.profiles (id, role, nickname) values (new.id, v_role, v_nickname);

  if v_role = 'seller' then
    insert into public.seller_profiles (user_id, shop_name) values (new.id, v_nickname);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 역할은 가입 후 바꿀 수 없음
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role then
    raise exception 'role cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_role_locked
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- 새 요청글: 작성자 Watch 자동 생성 + 관심 카테고리 판매자에게 알림 (N-1)
create or replace function public.on_request_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.watches (user_id, request_id, notify)
  values (new.consumer_id, new.id, true)
  on conflict do nothing;

  insert into public.notifications (user_id, type, target_id)
  select sp.user_id, 'new_request', new.id
  from public.seller_profiles sp
  where new.category_id = any (sp.interest_categories);
  return new;
end;
$$;

create trigger requests_after_insert
  after insert on public.requests
  for each row execute function public.on_request_created();

-- 새 제안 전: 오프라인 매장이면 프로필의 매장 위치 자동 첨부 (C-2)
create or replace function public.fill_proposal_location()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.location_url is null or new.location_url = '' then
    select sp.location_url into new.location_url
    from public.seller_profiles sp
    where sp.user_id = new.seller_id and sp.seller_type = 'offline';
  end if;
  return new;
end;
$$;

create trigger proposals_before_insert
  before insert on public.proposals
  for each row execute function public.fill_proposal_location();

-- 새 제안 후: 그 글을 알림 켜고 Watch 한 사용자에게 알림 (N-2, N-3)
create or replace function public.on_proposal_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, target_id)
  select w.user_id, 'new_proposal', new.request_id
  from public.watches w
  where w.request_id = new.request_id
    and w.notify
    and w.user_id <> new.seller_id;
  return new;
end;
$$;

create trigger proposals_after_insert
  after insert on public.proposals
  for each row execute function public.on_proposal_created();

-- 새 DM: 상대방에게 알림 (D-4)
create or replace function public.on_dm_message_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_recipient uuid;
begin
  select case when t.consumer_id = new.sender_id then t.seller_id else t.consumer_id end
    into v_recipient
  from public.dm_threads t
  where t.id = new.thread_id;

  insert into public.notifications (user_id, type, target_id)
  values (v_recipient, 'new_dm', new.thread_id);
  return new;
end;
$$;

create trigger dm_messages_after_insert
  after insert on public.dm_messages
  for each row execute function public.on_dm_message_created();

-- 주문: 금액은 제안 가격, 수수료 5% 를 서버에서 계산 (B-3)
create or replace function public.fill_order_amount()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  select p.price into new.amount from public.proposals p where p.id = new.proposal_id;
  if new.amount is null then
    raise exception 'proposal not found';
  end if;
  new.fee := round(new.amount * 0.05);
  new.status := 'paid';
  return new;
end;
$$;

create trigger orders_before_insert
  before insert on public.orders
  for each row execute function public.fill_order_amount();

-- ---------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------

alter table public.categories      enable row level security;
alter table public.profiles        enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.requests        enable row level security;
alter table public.proposals       enable row level security;
alter table public.watches         enable row level security;
alter table public.notifications   enable row level security;
alter table public.dm_threads      enable row level security;
alter table public.dm_messages     enable row level security;
alter table public.orders          enable row level security;
alter table public.ratings         enable row level security;

-- categories: 누구나 읽기만
create policy "categories: 누구나 조회"
  on public.categories for select
  to anon, authenticated
  using (true);

-- profiles: 닉네임·역할은 공개, 본인만 수정 (역할 변경은 트리거가 막음)
create policy "profiles: 누구나 조회"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles: 본인 수정"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- seller_profiles: 공개, 판매자 본인만 수정 (생성은 가입 트리거)
create policy "seller_profiles: 누구나 조회"
  on public.seller_profiles for select
  to anon, authenticated
  using (true);

create policy "seller_profiles: 본인 수정"
  on public.seller_profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- requests: 전체공개 (P-6), 소비자만 작성, 본인만 수정·삭제
create policy "requests: 누구나 조회"
  on public.requests for select
  to anon, authenticated
  using (true);

create policy "requests: 소비자만 작성"
  on public.requests for insert
  to authenticated
  with check (consumer_id = (select auth.uid()) and (select public.my_role()) = 'consumer');

create policy "requests: 본인 수정"
  on public.requests for update
  to authenticated
  using (consumer_id = (select auth.uid()))
  with check (consumer_id = (select auth.uid()));

create policy "requests: 본인 삭제"
  on public.requests for delete
  to authenticated
  using (consumer_id = (select auth.uid()));

-- proposals: 공개, 판매자만 작성 (C-1), 본인만 수정·삭제
create policy "proposals: 누구나 조회"
  on public.proposals for select
  to anon, authenticated
  using (true);

create policy "proposals: 판매자만 작성"
  on public.proposals for insert
  to authenticated
  with check (seller_id = (select auth.uid()) and (select public.my_role()) = 'seller');

create policy "proposals: 본인 수정"
  on public.proposals for update
  to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

create policy "proposals: 본인 삭제"
  on public.proposals for delete
  to authenticated
  using (seller_id = (select auth.uid()));

-- watches: 소비자 본인 것만 (N-2, N-3)
create policy "watches: 본인 조회"
  on public.watches for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "watches: 소비자 본인 추가"
  on public.watches for insert
  to authenticated
  with check (user_id = (select auth.uid()) and (select public.my_role()) = 'consumer');

create policy "watches: 본인 수정"
  on public.watches for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "watches: 본인 삭제"
  on public.watches for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- notifications: 본인 것만 조회·읽음처리·삭제 (생성은 트리거만)
create policy "notifications: 본인 조회"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: 본인 읽음 처리"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications: 본인 삭제"
  on public.notifications for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- dm_threads: 참여자만 조회, 소비자만 판매자에게 시작 (D-2)
create policy "dm_threads: 참여자 조회"
  on public.dm_threads for select
  to authenticated
  using ((select auth.uid()) in (consumer_id, seller_id));

create policy "dm_threads: 소비자만 시작"
  on public.dm_threads for insert
  to authenticated
  with check (
    consumer_id = (select auth.uid())
    and (select public.my_role()) = 'consumer'
    and exists (select 1 from public.profiles p where p.id = seller_id and p.role = 'seller')
  );

-- dm_messages: 스레드 참여자만 조회·전송
create policy "dm_messages: 참여자 조회"
  on public.dm_messages for select
  to authenticated
  using (exists (
    select 1 from public.dm_threads t
    where t.id = thread_id and (select auth.uid()) in (t.consumer_id, t.seller_id)
  ));

create policy "dm_messages: 참여자 전송"
  on public.dm_messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.dm_threads t
      where t.id = thread_id and (select auth.uid()) in (t.consumer_id, t.seller_id)
    )
  );

-- orders: 구매자 본인 + 해당 제안의 판매자 조회, 소비자만 생성
create policy "orders: 구매자·판매자 조회"
  on public.orders for select
  to authenticated
  using (
    consumer_id = (select auth.uid())
    or exists (select 1 from public.proposals p where p.id = proposal_id and p.seller_id = (select auth.uid()))
  );

create policy "orders: 소비자만 생성"
  on public.orders for insert
  to authenticated
  with check (consumer_id = (select auth.uid()) and (select public.my_role()) = 'consumer');

-- ratings: 공개, 소비자가 판매자에게 1회 (R-1, unique 제약), 본인 것만 수정
create policy "ratings: 누구나 조회"
  on public.ratings for select
  to anon, authenticated
  using (true);

create policy "ratings: 소비자만 작성"
  on public.ratings for insert
  to authenticated
  with check (
    consumer_id = (select auth.uid())
    and (select public.my_role()) = 'consumer'
    and exists (select 1 from public.profiles p where p.id = seller_id and p.role = 'seller')
  );

create policy "ratings: 본인 수정"
  on public.ratings for update
  to authenticated
  using (consumer_id = (select auth.uid()))
  with check (consumer_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 5. 스토리지 (요청 참고 사진, 제안 상품 사진)
--    경로 규칙: images/<user id>/<파일명>
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "images: 누구나 조회"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'images');

create policy "images: 본인 폴더에 업로드"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "images: 본인 파일 삭제"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
