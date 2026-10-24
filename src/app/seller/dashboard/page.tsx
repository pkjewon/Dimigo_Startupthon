import Link from "next/link";
import { RequestCard, type RequestCardData } from "@/components/request-card";
import { requireUser } from "@/lib/auth";
import { categoryName } from "@/lib/constants";
import { timeAgo, won } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SellerProfile } from "@/lib/types";

type MyProposal = {
  id: number;
  product_name: string;
  price: number;
  created_at: string;
  request: { id: number; title: string } | null;
};

type ReceivedOrder = {
  id: number;
  amount: number;
  fee: number;
  created_at: string;
  proposal: { product_name: string } | null;
};

// 12번 화면: 판매자 대시보드 (M-2)
export default async function SellerDashboardPage() {
  const user = await requireUser("seller", "/seller/dashboard");
  const supabase = await createClient();

  const { data: profile } = await supabase.from("seller_profiles").select("*").eq("user_id", user.id).single<SellerProfile>();
  const interests = profile?.interest_categories ?? [];

  const [{ data: requests }, { data: proposals }, { data: orders }] = await Promise.all([
    interests.length
      ? supabase
          .from("requests")
          .select("*, consumer:profiles!consumer_id(nickname), proposals(count)")
          .in("category_id", interests)
          .order("created_at", { ascending: false })
          .limit(9)
          .returns<RequestCardData[]>()
      : Promise.resolve({ data: [] as RequestCardData[] }),
    supabase
      .from("proposals")
      .select("id, product_name, price, created_at, request:requests(id, title)")
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
                    <span className="block truncate font-bold">{p.product_name}</span>
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
