import Link from "next/link";
import { REQUEST_CARD_SELECT, RequestCard, type RequestCardData } from "@/components/request-card";
import { requireUser } from "@/lib/auth";
import { confirmVisit } from "@/app/visits/actions";
import { categoryName, timeSlotName } from "@/lib/constants";
import { shortDate, timeAgo, todayKst, won } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SellerProfile, Visit } from "@/lib/types";

type MyProposal = {
  id: number;
  is_look: boolean;
  product_name: string;
  price: number;
  created_at: string;
  request: { id: number; title: string } | null;
};

type StoreVisit = Visit & {
  consumer: { nickname: string } | null;
  proposal: { product_name: string; request_id: number } | null;
};

type ReceivedOrder = {
  id: number;
  amount: number;
  fee: number;
  created_at: string;
  proposal: { product_name: string } | null;
};

// 12번 화면: 판매자 대시보드 (M-2)
const KIND_FILTERS = [
  { id: "", name: "전체 요청" },
  { id: "styling", name: "코디 요청" },
  { id: "item", name: "일반 요청" },
] as const;

export default async function SellerDashboardPage({ searchParams }: PageProps<"/seller/dashboard">) {
  const { kind: kindParam } = await searchParams;
  const kind = kindParam === "styling" || kindParam === "item" ? kindParam : "";
  const user = await requireUser("seller", "/seller/dashboard");
  const supabase = await createClient();

  const { data: profile } = await supabase.from("seller_profiles").select("*").eq("user_id", user.id).single<SellerProfile>();
  const interests = profile?.interest_categories ?? [];

  const isOffline = profile?.seller_type === "offline";

  let requestQuery = supabase
    .from("requests")
    .select(REQUEST_CARD_SELECT)
    .in("category_id", interests)
    .order("created_at", { ascending: false })
    .limit(9);
  if (kind) requestQuery = requestQuery.eq("kind", kind);

  const [{ data: requests }, { data: proposals }, { data: orders }, { data: visits }] = await Promise.all([
    interests.length ? requestQuery.returns<RequestCardData[]>() : Promise.resolve({ data: [] as RequestCardData[] }),
    supabase
      .from("proposals")
      .select("id, is_look, product_name, price, created_at, request:requests(id, title)")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<MyProposal[]>(),
    // RLS: 내 제안으로 들어온 주문만 보임
    supabase
      .from("orders")
      .select("id, amount, fee, created_at, proposal:proposals!inner(product_name, seller_id)")
      .eq("proposal.seller_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ReceivedOrder[]>(),
    // 오늘 이후 방문 예정 (취소 제외), 가까운 날짜순
    isOffline
      ? supabase
          .from("visits")
          .select("id, proposal_id, visit_date, time_slot, note, status, consumer:profiles!consumer_id(nickname), proposal:proposals(product_name, request_id)")
          .eq("seller_id", user.id)
          .neq("status", "cancelled")
          .gte("visit_date", todayKst())
          .order("visit_date")
          .order("time_slot")
          .returns<StoreVisit[]>()
      : Promise.resolve({ data: [] as StoreVisit[] }),
  ]);

  const sales = (orders ?? []).reduce((sum, o) => sum + o.amount, 0);
  const fees = (orders ?? []).reduce((sum, o) => sum + o.fee, 0);

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">FOR SELLER / DASHBOARD</div>
          <h1>{profile?.shop_name ?? user.nickname}</h1>
          <p>
            {profile?.is_subscribed ? "구독 중 · 내 제안이 댓글 맨 위에 보여요" : "구독하면 내 제안이 댓글 맨 위에 보여요"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/sellers/${user.id}`} className="btn btn-light btn-sm">
            내 프로필 보기
          </Link>
          <Link href="/seller/settings" className="btn btn-sm">
            설정
          </Link>
        </div>
      </div>

      {isOffline && (
        <section id="visits" className="pt-9">
          <div className="section-head !mb-4">
            <div>
              <div className="section-kicker">STORE VISITS</div>
              <h2 className="section-title">
                방문 예정 손님 <small>온라인에서 내 제안을 보고 매장에 오는 손님이에요</small>
              </h2>
            </div>
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {visits?.length === 0 && <li className="empty-state">아직 방문 예정 손님이 없어요.</li>}
            {visits?.map((v) => (
              <li key={v.id} className={`panel flex items-center gap-4 !py-4 ${v.status === "planned" ? "!border-ink" : ""}`}>
                <div className="w-16 flex-none text-center">
                  <p className="text-base font-bold">{shortDate(v.visit_date).split("(")[0]}</p>
                  <p className="text-[10px] text-muted">
                    ({shortDate(v.visit_date).split("(")[1]} {timeSlotName(v.time_slot)}
                  </p>
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-bold">{v.consumer?.nickname ?? "손님"}</p>
                  <Link href={`/requests/${v.proposal?.request_id}`} className="mt-1 block truncate text-[11px] text-muted hover:underline">
                    {v.proposal?.product_name}
                  </Link>
                  {v.note && <p className="mt-1 truncate text-[11px]">“{v.note}”</p>}
                </div>
                {v.status === "planned" ? (
                  <form action={confirmVisit.bind(null, v.id)}>
                    <button className="btn btn-sm">확인했어요</button>
                  </form>
                ) : (
                  <span className="tag tag-dark flex-none">확인 완료</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pt-9">
        <div className="section-head">
          <div>
            <div className="section-kicker">NEW IN YOUR CATEGORIES</div>
            <h2 className="section-title">
              관심 카테고리 새 요청
              <small>{interests.length ? interests.map(categoryName).join(", ") : "관심 카테고리를 설정해주세요"}</small>
            </h2>
          </div>
        </div>
        <div className="filter-bar">
          {KIND_FILTERS.map((f) => (
            <Link key={f.id} href={f.id ? `/seller/dashboard?kind=${f.id}` : "/seller/dashboard"} scroll={false} className={`filter-chip ${kind === f.id ? "active" : ""}`}>
              {f.name}
            </Link>
          ))}
          <Link href="/styling" className="ml-auto text-[10px] text-muted underline underline-offset-4">
            코디 모드에서 보기 →
          </Link>
        </div>
        <div className="request-grid">
          {requests?.length === 0 && (
            <div className="empty-state">
              {interests.length ? "아직 요청이 없어요." : <Link href="/seller/settings" className="underline">관심 카테고리 설정하기</Link>}
            </div>
          )}
          {requests?.map((r) => <RequestCard key={r.id} request={r} />)}
        </div>
      </section>

      <div className="two-col !pt-12">
        <section>
          <div className="section-head !mb-4">
            <div>
              <div className="section-kicker">MY PROPOSALS</div>
              <h2 className="section-title">
                내가 단 제안 <small>{proposals?.length ?? 0}개</small>
              </h2>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {proposals?.length === 0 && <li className="empty-state">아직 제안이 없어요.</li>}
            {proposals?.map((p) => (
              <li key={p.id}>
                <Link href={`/requests/${p.request?.id}`} className="panel flex items-center justify-between gap-3 !py-3 text-xs hover:border-[#aaa]">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">
                      {p.is_look && <span className="tag tag-dark mr-1.5 !py-0.5">코디</span>}
                      {p.product_name}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-muted">“{p.request?.title}”</span>
                  </span>
                  <span className="flex-none text-right">
                    <span className="block font-bold">{won(p.price)}</span>
                    <span className="text-[10px] text-muted">{timeAgo(p.created_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <aside className="side-panel">
          <div className="how-card">
            <div className="section-kicker">SITE ORDERS</div>
            <h3>사이트 내 결제 {orders?.length ?? 0}건</h3>
            <div className="how-step">
              <b>매출</b>
              <span>{won(sales)}</span>
            </div>
            <div className="how-step">
              <b>수수료</b>
              <span>
                −{won(fees)} <small className="text-[#a7a8a3]">(5%, 표시용)</small>
              </span>
            </div>
            <div className="how-step">
              <b>정산</b>
              <span className="font-bold">{won(sales - fees)}</span>
            </div>
          </div>
          {(orders ?? []).map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="panel flex justify-between gap-2 !py-3 text-xs">
              <span className="truncate">{o.proposal?.product_name}</span>
              <span className="flex-none font-bold">{won(o.amount)}</span>
            </Link>
          ))}
        </aside>
      </div>
    </>
  );
}
