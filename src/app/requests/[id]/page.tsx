import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalCard, type ProposalCardData } from "@/components/proposal-card";
import { getCurrentUser } from "@/lib/auth";
import { categoryName, requestConditionName, SELLER_TYPES } from "@/lib/constants";
import { timeAgo, won } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Request, SellerProfile } from "@/lib/types";
import { startDm } from "./actions";
import { ProposalButton } from "./proposal-form";
import { WatchToggle } from "./watch-toggle";

type RequestDetail = Request & { consumer: { nickname: string } | null };

// S-2: 구독 판매자 다음에 적용되는 정렬 기준
const SORTS = [
  { id: "latest", name: "최신순" },
  { id: "price_asc", name: "가격 낮은순" },
  { id: "price_desc", name: "가격 높은순" },
  { id: "rating", name: "판매자 평점순" },
] as const;

function compareBy(sort: string) {
  return (a: ProposalCardData, b: ProposalCardData) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "rating") return (b.rating?.avg_score ?? 0) - (a.rating?.avg_score ?? 0);
    return b.created_at.localeCompare(a.created_at);
  };
}

export default async function RequestDetailPage({ params, searchParams }: PageProps<"/requests/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const sort = SORTS.some((s) => s.id === query.sort) ? String(query.sort) : "latest";
  const typeFilter = SELLER_TYPES.some((t) => t.id === query.type) ? String(query.type) : "";

  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: request }, { data: proposals }, { data: watch }, { data: mySellerProfile }] = await Promise.all([
    supabase
      .from("requests")
      .select("*, consumer:profiles!consumer_id(nickname)")
      .eq("id", id)
      .maybeSingle<RequestDetail>(),
    supabase
      .from("proposals")
      .select("*, seller:profiles!seller_id(nickname, seller_profile:seller_profiles(shop_name, seller_type, is_subscribed))")
      .eq("request_id", id)
      .returns<Omit<ProposalCardData, "rating">[]>(),
    user?.role === "consumer"
      ? supabase.from("watches").select("notify").eq("user_id", user.id).eq("request_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    user?.role === "seller"
      ? supabase.from("seller_profiles").select("*").eq("user_id", user.id).single<SellerProfile>()
      : Promise.resolve({ data: null }),
  ]);
  if (!request) notFound();

  // 판매자 평균 평점
  const sellerIds = [...new Set((proposals ?? []).map((p) => p.seller_id))];
  const { data: ratings } = sellerIds.length
    ? await supabase.from("seller_ratings").select("seller_id, avg_score, rating_count").in("seller_id", sellerIds)
    : { data: [] };
  const ratingBySeller = new Map((ratings ?? []).map((r) => [r.seller_id, r]));

  const all: ProposalCardData[] = (proposals ?? []).map((p) => ({ ...p, rating: ratingBySeller.get(p.seller_id) ?? null }));
  const visible = typeFilter ? all.filter((p) => p.seller?.seller_profile?.seller_type === typeFilter) : all;
  // S-1: 구독 판매자 댓글이 위, 그 안과 나머지는 고른 기준으로 정렬
  const isSub = (p: ProposalCardData) => p.seller?.seller_profile?.is_subscribed ?? false;
  const sorted = [...visible.filter(isSub).sort(compareBy(sort)), ...visible.filter((p) => !isSub(p)).sort(compareBy(sort))];

  const isOwner = user?.id === request.consumer_id;
  const nickname = request.consumer?.nickname ?? "알 수 없음";
  const href = (next: { sort?: string; type?: string }) => {
    const p = new URLSearchParams();
    const s = next.sort ?? sort;
    const t = next.type ?? typeFilter;
    if (s !== "latest") p.set("sort", s);
    if (t) p.set("type", t);
    const qs = p.toString();
    return `/requests/${request.id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      {query.created && (
        <p className="mt-6 bg-dark px-4 py-3 text-xs text-white">
          요청을 등록했어요. 관심 카테고리 판매자들에게 알림을 보냈어요.
        </p>
      )}
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">REQUEST / {categoryName(request.category_id)}</div>
          <h1>{request.title}</h1>
          <p>
            {nickname} · {timeAgo(request.created_at)} · 제안 {all.length}개
          </p>
        </div>
        <Link href="/" className="btn btn-light btn-sm">
          ← 목록으로
        </Link>
      </div>

      <div className="two-col">
        <div className="flex flex-col gap-4">
          <section className="panel">
            {request.image_urls.length > 0 && (
              <div className="gallery">
                {request.image_urls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="참고 이미지" />
                  </a>
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#444]">
              {request.body || "추가 설명이 없어요."}
            </p>
          </section>

          <section id="proposals">
            <div className="section-head !mb-4 pt-6">
              <div>
                <div className="section-kicker">PROPOSALS</div>
                <h2 className="section-title">
                  판매자 제안 <small>{all.length}개</small>
                </h2>
              </div>
            </div>

            <div className="filter-bar !pb-3">
              {SORTS.map((s) => (
                <Link key={s.id} href={href({ sort: s.id })} scroll={false} className={`filter-chip ${sort === s.id ? "active" : ""}`}>
                  {s.name}
                </Link>
              ))}
            </div>
            <div className="filter-bar">
              <span className="text-[10px] text-muted">판매자 유형</span>
              <Link href={href({ type: "" })} scroll={false} className={`filter-chip ${!typeFilter ? "active" : ""}`}>
                전체
              </Link>
              {SELLER_TYPES.map((t) => (
                <Link key={t.id} href={href({ type: t.id })} scroll={false} className={`filter-chip ${typeFilter === t.id ? "active" : ""}`}>
                  {t.name}
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {all.length === 0 && <div className="empty-state">아직 제안이 없어요. 판매자에게 알림이 갔어요!</div>}
              {all.length > 0 && sorted.length === 0 && <div className="empty-state">이 유형의 판매자 제안이 없어요.</div>}
              {sorted.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  actions={
                    user?.role === "consumer" && (
                      <>
                        <form action={startDm.bind(null, p.seller_id, p.id)}>
                          <button className="btn btn-light btn-sm">문의하기</button>
                        </form>
                        <Link href={`/checkout/${p.id}`} className="btn btn-sm">
                          바로 구매
                        </Link>
                      </>
                    )
                  }
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="side-panel">
          {mySellerProfile && (
            <div className="how-card">
              <div className="section-kicker">FOR SELLER</div>
              <h3>이 요청에 맞는 상품이 있나요?</h3>
              <ProposalButton
                requestId={request.id}
                requestTitle={request.title}
                budgetMax={request.budget_max}
                seller={mySellerProfile}
              />
            </div>
          )}
          {user?.role === "consumer" && (
            <WatchToggle requestId={request.id} notify={watch?.notify ?? false} isOwner={isOwner} />
          )}
          <div className="panel">
            <div className="panel-title">
              <h2>요청 조건</h2>
            </div>
            <dl className="grid grid-cols-[72px_1fr] gap-y-3 text-xs">
              <dt className="text-muted">카테고리</dt>
              <dd>{categoryName(request.category_id)}</dd>
              <dt className="text-muted">예산</dt>
              <dd className="font-bold">최대 {won(request.budget_max)}</dd>
              <dt className="text-muted">브랜드</dt>
              <dd>{request.brand ?? "-"}</dd>
              <dt className="text-muted">사이즈</dt>
              <dd>{request.size ?? "-"}</dd>
              <dt className="text-muted">상품 상태</dt>
              <dd>{request.conditions.length ? request.conditions.map(requestConditionName).join(", ") : "-"}</dd>
            </dl>
          </div>
          {!user && (
            <div className="tip-card">
              <h3>제안을 받거나 보내려면</h3>
              <p>
                <Link href={`/login?next=/requests/${request.id}`} className="underline">
                  로그인
                </Link>
                하면 알림을 켜거나 판매자에게 문의할 수 있어요.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
