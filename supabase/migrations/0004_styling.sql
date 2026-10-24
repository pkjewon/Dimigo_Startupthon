-- =====================================================================
-- 0004_styling: 코디 모드
--  · 소비자가 체형·상황·취향을 남기면 (requests.kind = 'styling')
--  · 판매자가 자기 상품 2~4개로 한 벌을 묶어 제안 (proposals.is_look + look_items)
-- 체형 정보(styling_profiles)는 요청자 본인과 판매자에게만 보인다.
-- =====================================================================

alter table public.requests
  add column kind text not null default 'item' check (kind in ('item', 'styling'));

alter table public.proposals
  add column is_look boolean not null default false;

-- 코디 요청 조건 (요청글 1:1)
create table public.styling_profiles (
  request_id   bigint primary key references public.requests (id) on delete cascade,
  occasion     text   not null check (occasion in ('daily', 'school', 'date', 'travel', 'special')),
  height_cm    int    not null check (height_cm between 120 and 220),
  top_size     text   not null check (top_size in ('XS', 'S', 'M', 'L', 'XL', '2XL')),
  bottom_size  text   not null check (char_length(bottom_size) between 1 and 30),
  fit          text   not null check (fit in ('over', 'regular', 'slim', 'relaxed')),
  styles       text[] not null default '{}',
  pieces       text[] not null check (cardinality(pieces) between 2 and 7)
);

-- 코디 제안에 들어간 상품들
create table public.look_items (
  id            bigint generated always as identity primary key,
  proposal_id   bigint not null references public.proposals (id) on delete cascade,
  position      int    not null check (position between 1 and 4),
  category_id   text   not null references public.categories (id),
  product_name  text   not null check (char_length(product_name) between 1 and 80),
  price         int    not null check (price > 0),
  condition     text   check (condition in ('new', 'unused', 'used_a', 'used_b')),
  size_info     text,
  product_url   text,
  unique (proposal_id, position)
);

-- ---------------------------------------------------------------------
-- 일반 요청에는 일반 제안만, 코디 요청에는 코디 제안만
-- ---------------------------------------------------------------------
create or replace function public.proposals_kind_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_kind text;
begin
  select r.kind into v_kind from public.requests r where r.id = new.request_id;
  if v_kind = 'styling' and not new.is_look then
    raise exception '코디 요청에는 코디로만 제안할 수 있어요';
  end if;
  if v_kind = 'item' and new.is_look then
    raise exception '일반 요청에는 코디 제안을 할 수 없어요';
  end if;
  return new;
end;
$$;

create trigger proposals_kind_guard
  before insert on public.proposals
  for each row execute function public.proposals_kind_guard();

-- ---------------------------------------------------------------------
-- 코디 요청 등록 (요청글 + 체형 정보를 한 트랜잭션으로)
-- security invoker 라서 requests / styling_profiles 의 RLS 가 그대로 적용된다
-- ---------------------------------------------------------------------
create or replace function public.create_styling_request(
  p_category_id text,
  p_title       text,
  p_body        text,
  p_budget_max  int,
  p_image_urls  text[],
  p_occasion    text,
  p_height_cm   int,
  p_top_size    text,
  p_bottom_size text,
  p_fit         text,
  p_styles      text[],
  p_pieces      text[]
)
returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into public.requests (consumer_id, kind, category_id, title, body, budget_max, image_urls)
  values (auth.uid(), 'styling', p_category_id, p_title, coalesce(p_body, ''), p_budget_max, coalesce(p_image_urls, '{}'))
  returning id into v_id;

  insert into public.styling_profiles (request_id, occasion, height_cm, top_size, bottom_size, fit, styles, pieces)
  values (v_id, p_occasion, p_height_cm, p_top_size, p_bottom_size, p_fit, coalesce(p_styles, '{}'), p_pieces);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 코디 제안 (제안 + 상품 2~4개, 총액은 상품 가격 합계, 요청 예산 이내)
-- p_items: [{ category_id, product_name, price, condition, size_info, product_url }]
-- ---------------------------------------------------------------------
create or replace function public.create_look(
  p_request_id  bigint,
  p_title       text,
  p_description text,
  p_image_url   text,
  p_items       jsonb
)
returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare
  v_count  int := jsonb_array_length(p_items);
  v_total  int;
  v_budget int;
  v_id     bigint;
begin
  if v_count < 2 or v_count > 4 then
    raise exception '코디는 상품 2~4개로 구성해주세요';
  end if;

  select coalesce(sum((item ->> 'price')::int), 0) into v_total
  from jsonb_array_elements(p_items) item;

  select r.budget_max into v_budget from public.requests r where r.id = p_request_id;
  if v_total > v_budget then
    raise exception '코디 총액이 요청 예산을 넘었어요';
  end if;

  insert into public.proposals (request_id, seller_id, product_name, price, description, image_url, is_look)
  values (p_request_id, auth.uid(), p_title, v_total, coalesce(p_description, ''), nullif(p_image_url, ''), true)
  returning id into v_id;

  insert into public.look_items (proposal_id, position, category_id, product_name, price, condition, size_info, product_url)
  select v_id, ord::int, item ->> 'category_id', item ->> 'product_name', (item ->> 'price')::int,
         nullif(item ->> 'condition', ''), nullif(item ->> 'size_info', ''), nullif(item ->> 'product_url', '')
  from jsonb_array_elements(p_items) with ordinality as t(item, ord);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.styling_profiles enable row level security;
alter table public.look_items       enable row level security;

-- 체형 정보: 요청자 본인 + 판매자만 조회 (다른 소비자에게는 숨김)
create policy "styling_profiles: 본인·판매자 조회"
  on public.styling_profiles for select
  to authenticated
  using (
    (select public.my_role()) = 'seller'
    or exists (select 1 from public.requests r where r.id = request_id and r.consumer_id = (select auth.uid()))
  );

create policy "styling_profiles: 본인 코디 요청에만 작성"
  on public.styling_profiles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.requests r
      where r.id = request_id and r.consumer_id = (select auth.uid()) and r.kind = 'styling'
    )
  );

create policy "styling_profiles: 본인 수정"
  on public.styling_profiles for update
  to authenticated
  using (exists (select 1 from public.requests r where r.id = request_id and r.consumer_id = (select auth.uid())))
  with check (exists (select 1 from public.requests r where r.id = request_id and r.consumer_id = (select auth.uid())));

-- 코디 상품: 제안처럼 공개, 그 코디를 만든 판매자만 작성·삭제
create policy "look_items: 누구나 조회"
  on public.look_items for select
  to anon, authenticated
  using (true);

create policy "look_items: 내 코디에만 작성"
  on public.look_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and p.seller_id = (select auth.uid()) and p.is_look
    )
  );

create policy "look_items: 내 코디 상품 삭제"
  on public.look_items for delete
  to authenticated
  using (exists (select 1 from public.proposals p where p.id = proposal_id and p.seller_id = (select auth.uid())));

create index look_items_proposal_idx on public.look_items (proposal_id, position);
create index requests_kind_idx on public.requests (kind, created_at desc);
