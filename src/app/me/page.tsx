import Link from "next/link";
import { RequestCard, type RequestCardData } from "@/components/request-card";
import { requireUser } from "@/lib/auth";
import { timeSlotName } from "@/lib/constants";
import { shortDate, todayKst, won } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Visit } from "@/lib/types";

type MyOrder = {
  id: number;
  amount: number;
  created_at: string;
  proposal: { product_name: string; seller: { nickname: string; seller_profile: { shop_name: string } | null } | null } | null;
};

type MyVisit = Visit & {
  proposal: {
    product_name: string;
    request_id: number;
    seller: { nickname: string; seller_profile: { shop_name: string; location_url: string | null } | null } | null;
  } | null;
};

const REQUEST_SELECT = "*, consumer:profiles!consumer_id(nickname), proposals(count)";

// 13번 화면: 소비자 마이페이지 (내 요청글, 주문 내역, 알림 켠 글)
export default async function MyPage() {
  const user = await requireUser("consumer", "/me");
  const supabase = await createClient();

  const [{ data: myRequests }, { data: orders }, { data: watches }, { data: visits }] = await Promise.all([
    supabase.from("requests").select(REQUEST_SELECT).eq("consumer_id", user.id).order("created_at", { ascending: false }).returns<RequestCardData[]>(),
    supabase
      .from("orders")
      .select("id, amount, created_at, proposal:proposals(product_name, seller:profiles!seller_id(nickname, seller_profile:seller_profiles(shop_name)))")
      .eq("consumer_id", user.id)
      .order("created_at", { ascending: false })
      .returns<MyOrder[]>(),
    supabase.from("watches").select("request_id").eq("user_id", user.id).eq("notify", true),
    supabase
      .from("visits")
      .select(
        "id, proposal_id, visit_date, time_slot, note, status, proposal:proposals(product_name, request_id, seller:profiles!seller_id(nickname, seller_profile:seller_profiles(shop_name, location_url)))",
      )
      .eq("consumer_id", user.id)
      .neq("status", "cancelled")
      .gte("visit_date", todayKst())
      .order("visit_date")
      .returns<MyVisit[]>(),
  ]);

  const myIds = new Set((myRequests ?? []).map((r) => r.id));
  const watchedIds = (watches ?? []).map((w) => w.request_id).filter((id) => !myIds.has(id));
  const { data: watched } = watchedIds.length
    ? await supabase.from("requests").select(REQUEST_SELECT).in("id", watchedIds).order("created_at", { ascending: false }).returns<RequestCardData[]>()
    : { data: [] as RequestCardData[] };

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">MY PAGE</div>
          <h1>{user.nickname}</h1>
          <p>
            요청 {myRequests?.length ?? 0}개 · 주문 {orders?.length ?? 0}건 · 따라가는 글 {watched?.length ?? 0}개
          </p>
        </div>
        <Link href="/requests/new" className="btn btn-sm">
          새 요청하기
        </Link>
      </div>

      <section className="pt-9">
        <div className="section-head">
          <div>
            <div className="section-kicker">MY REQUESTS</div>
            <h2 className="section-title">내 요청글</h2>
          </div>
        </div>
        <div className="request-grid">
          {myRequests?.length === 0 && <div className="empty-state">아직 요청글이 없어요.</div>}
          {myRequests?.map((r) => <RequestCard key={r.id} request={r} />)}
        </div>
      </section>

      <div className="two-col !pt-12">
        <section>
          <div className="section-head !mb-4">
            <div>
              <div className="section-kicker">FOLLOWING</div>
              <h2 className="section-title">알림 켠 다른 사람 글</h2>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {watched?.length === 0 && <div className="empty-state">요청글 상세에서 알림을 켜면 여기에 모여요.</div>}
            {watched?.map((r) => <RequestCard key={r.id} request={r} />)}
          </div>
        </section>
        <aside className="side-panel">
          <div id="visits" className="how-card">
            <div className="section-kicker">STORE VISITS</div>
            <h3>매장 방문 예정 {visits?.length ?? 0}곳</h3>
            {visits?.length === 0 && (
              <p className="text-[11px] leading-relaxed text-[#c9c9c5]">오프라인 매장 제안에서 “방문 예정”을 누르면 여기에 모여요.</p>
            )}
            {visits?.map((v) => {
              const shop = v.proposal?.seller?.seller_profile;
              return (
                <div key={v.id} className="how-step !grid-cols-[64px_1fr]">
                  <b>
                    {shortDate(v.visit_date)}
                    <br />
                    {timeSlotName(v.time_slot)}
                  </b>
                  <span>
                    <strong className="block text-white">{shop?.shop_name ?? v.proposal?.seller?.nickname}</strong>
                    <Link href={`/requests/${v.proposal?.request_id}`} className="block truncate text-[#a7a8a3] hover:underline">
                      {v.proposal?.product_name}
                    </Link>
                    <span className="mt-1 flex gap-3 text-[10px]">
                      <span>{v.status === "confirmed" ? "✓ 매장 확인" : "확인 대기"}</span>
                      {shop?.location_url && (
                        <a href={shop.location_url} target="_blank" rel="noreferrer" className="underline">
                          📍 길찾기
                        </a>
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="panel">
            <div className="panel-title">
              <h2>주문 내역</h2>
              <span>{orders?.length ?? 0}건</span>
            </div>
            <ul className="flex flex-col divide-y divide-line">
              {orders?.length === 0 && <li className="py-3 text-xs text-muted">아직 주문이 없어요.</li>}
              {orders?.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex justify-between gap-2 py-3 text-xs hover:underline">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{o.proposal?.product_name}</span>
                      <span className="text-[10px] text-muted">
                        {o.proposal?.seller?.seller_profile?.shop_name ?? o.proposal?.seller?.nickname} ·{" "}
                        {new Date(o.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </span>
                    <span className="flex-none font-bold">{won(o.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
