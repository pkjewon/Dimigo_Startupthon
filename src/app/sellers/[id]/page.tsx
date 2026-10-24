import Link from "next/link";
import { notFound } from "next/navigation";
import { RatingForm } from "@/components/rating-form";
import { startDm } from "@/app/requests/[id]/actions";
import { getCurrentUser } from "@/lib/auth";
import { categoryName, sellerTypeName } from "@/lib/constants";
import { timeAgo, won } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SellerProfile } from "@/lib/types";

type RecentProposal = {
  id: number;
  product_name: string;
  price: number;
  image_url: string | null;
  created_at: string;
  request: { id: number; title: string; category_id: string } | null;
};

// 11번 화면: 판매자 프로필 (M-1)
export default async function SellerPage({ params }: PageProps<"/sellers/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const user = await getCurrentUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: rating }, { data: proposals }, { data: myRating }] = await Promise.all([
    supabase.from("seller_profiles").select("*").eq("user_id", id).maybeSingle<SellerProfile>(),
    supabase.from("seller_ratings").select("avg_score, rating_count").eq("seller_id", id).maybeSingle(),
    supabase
      .from("proposals")
      .select("id, product_name, price, image_url, created_at, request:requests(id, title, category_id)")
      .eq("seller_id", id)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<RecentProposal[]>(),
    user?.role === "consumer"
      ? supabase.from("ratings").select("score").eq("consumer_id", user.id).eq("seller_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!profile) notFound();

  const isOwn = user?.id === profile.user_id;
  const showBuyerLinks = user?.role !== "seller" || isOwn;

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">
            SELLER / {sellerTypeName(profile.seller_type)}
            {profile.is_subscribed && " · 구독 판매자"}
          </div>
          <h1>{profile.shop_name}</h1>
          <p>
            ★ {rating ? `${rating.avg_score} (평가 ${rating.rating_count}개)` : "아직 평가 없음"} · 제안 {proposals?.length ?? 0}개
            {profile.interest_categories.length > 0 && ` · 관심 ${profile.interest_categories.map(categoryName).join(", ")}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwn && (
            <Link href="/seller/settings" className="btn btn-sm">
              프로필 수정
            </Link>
          )}
          {/* 매장 위치·판매 사이트는 손님용 (다른 판매자에게는 숨김, 내 프로필이면 미리보기로 보여줌) */}
          {showBuyerLinks && profile.location_url && (
            <a href={profile.location_url} target="_blank" rel="noreferrer" className="btn btn-light btn-sm">
              📍 매장 위치
            </a>
          )}
          {showBuyerLinks && profile.shop_url && (
            <a href={profile.shop_url} target="_blank" rel="noreferrer" className="btn btn-light btn-sm">
              판매 사이트
            </a>
          )}
          {user?.role === "consumer" && (
            <form action={startDm.bind(null, profile.user_id, null)}>
              <button className="btn btn-sm">문의하기</button>
            </form>
          )}
        </div>
      </div>

      <div className="two-col">
        <section>
          <div className="section-head !mb-4">
            <div>
              <div className="section-kicker">RECENT PROPOSALS</div>
              <h2 className="section-title">최근 제안</h2>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {proposals?.length === 0 && <div className="empty-state">아직 제안한 상품이 없어요.</div>}
            {proposals?.map((p) => (
              <Link
                key={p.id}
                href={p.request ? `/requests/${p.request.id}` : "#"}
                className="panel flex items-center gap-3 !p-3 transition hover:border-[#aaa]"
              >
                <div className="h-16 w-14 flex-none bg-soft">
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="truncate font-bold">{p.product_name}</p>
                  {p.request && (
                    <p className="mt-1 truncate text-[11px] text-muted">
                      {categoryName(p.request.category_id)} · “{p.request.title}” 요청에 제안
                    </p>
                  )}
                </div>
                <div className="flex-none text-right">
                  <p className="text-xs font-bold">{won(p.price)}</p>
                  <p className="mt-1 text-[10px] text-muted">{timeAgo(p.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <aside className="side-panel">
          {user?.role === "consumer" && (
            <RatingForm sellerId={profile.user_id} shopName={profile.shop_name} myScore={myRating?.score ?? null} />
          )}
          {isOwn ? (
            <div className="tip-card">
              <h3>내 프로필 미리보기</h3>
              <p>손님에게는 이 화면이 보여요. 손님 화면에는 문의하기·평점 남기기 버튼이 함께 보여요.</p>
            </div>
          ) : (
            user?.role !== "seller" && (
              <div className="tip-card">
                <h3>{sellerTypeName(profile.seller_type)}</h3>
                <p>
                  {profile.seller_type === "offline"
                    ? "직접 찾아가서 입어보고 살 수 있는 매장이에요. 방문 전에 문의하기로 재고를 확인해보세요."
                    : profile.seller_type === "online"
                      ? "온라인 쇼핑몰이에요. 판매 사이트에서 다른 상품도 볼 수 있어요."
                      : "개인 판매자예요. 거래 전에 문의하기로 상품 상태를 확인해보세요."}
                </p>
              </div>
            )
          )}
        </aside>
      </div>
    </>
  );
}
