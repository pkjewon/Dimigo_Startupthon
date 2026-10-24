import Link from "next/link";
import { notFound } from "next/navigation";
import { LookButton } from "@/components/look-composer";
import { LookCard, type LookCardData } from "@/components/look-card";
import { ProposalCard, type ProposalCardData } from "@/components/proposal-card";
import { BodyProfile, LockNote, PieceList, stylingTags } from "@/components/styling-profile";
import { getCurrentUser } from "@/lib/auth";
import { categoryName, fitName, occasionName, requestConditionName, SELLER_TYPES, styleName } from "@/lib/constants";
import { timeAgo, won } from "@/lib/format";
import { PROPOSAL_SELECT } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";
import { VisitButton } from "@/components/visit-button";
import type { Request, SellerProfile, StylingProfile, Visit } from "@/lib/types";
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
  return (a: LookCardData, b: LookCardData) => {
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

  const [{ data: request }, { data: proposals }, { data: watch }, { data: mySellerProfile }, { data: styling }] = await Promise.all([
    supabase
      .from("requests")
      .select("*, consumer:profiles!consumer_id(nickname)")
      .eq("id", id)
      .maybeSingle<RequestDetail>(),
    supabase
      .from("proposals")
      .select(PROPOSAL_SELECT)
      .eq("request_id", id)
      .returns<Omit<LookCardData, "rating">[]>(),
    user?.role === "consumer"
      ? supabase.from("watches").select("notify").eq("user_id", user.id).eq("request_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    user?.role === "seller"
      ? supabase.from("seller_profiles").select("*").eq("user_id", user.id).single<SellerProfile>()
      : Promise.resolve({ data: null }),
    // 코디 요청의 체형 정보: RLS 로 요청자 본인과 판매자에게만 내려옴
    supabase.from("styling_profiles").select("*").eq("request_id", id).maybeSingle<StylingProfile>(),
  ]);
  if (!request) notFound();
  const isStyling = request.kind === "styling";

  // 판매자 평균 평점 + (소비자) 내 방문 예정
  const sellerIds = [...new Set((proposals ?? []).map((p) => p.seller_id))];
  const proposalIds = (proposals ?? []).map((p) => p.id);
  const [{ data: ratings }, { data: visits }] = await Promise.all([
    sellerIds.length
      ? supabase.from("seller_ratings").select("seller_id, avg_score, rating_count").in("seller_id", sellerIds)
      : Promise.resolve({ data: [] }),
    user?.role === "consumer" && proposalIds.length
      ? supabase
          .from("visits")
          .select("id, proposal_id, visit_date, time_slot, note, status")
          .eq("consumer_id", user.id)
          .in("proposal_id", proposalIds)
          .returns<Visit[]>()
      : Promise.resolve({ data: [] as Visit[] }),
  ]);
  const ratingBySeller = new Map((ratings ?? []).map((r) => [r.seller_id, r]));
  const visitByProposal = new Map((visits ?? []).map((v) => [v.proposal_id, v]));

  const all: LookCardData[] = (proposals ?? []).map((p) => ({ ...p, rating: ratingBySeller.get(p.seller_id) ?? null }));
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

  // 소비자에게만 보이는 제안 버튼들 (판매자 화면에는 없음)
  const buyerActions = (p: LookCardData) =>
    user?.role === "consumer" && (
      <>
        {p.seller?.seller_profile?.seller_type === "offline" && (
          <VisitButton proposalId={p.id} shopName={p.seller.seller_profile.shop_name} visit={visitByProposal.get(p.id) ?? null} />
        )}
        <form action={startDm.bind(null, p.seller_id, p.id)}>
          <button className="btn btn-light btn-sm">문의하기</button>
        </form>
        <Link href={`/checkout/${p.id}`} className="btn btn-sm">
          {p.is_look ? "코디 전체 구매" : "바로 구매"}
        </Link>
      </>
    );

  return (
    <>
      {query.created && (
        <p className="mt-6 bg-dark px-4 py-3 text-xs text-white">
          {isStyling ? "코디 요청을 올렸어요." : "요청을 등록했어요."} 관심 카테고리 판매자들에게 알림을 보냈어요.
        </p>
      )}
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">
            {isStyling ? "STYLING REQUEST" : "REQUEST"} / {categoryName(request.category_id)}
          </div>
          <h1>{request.title}</h1>
          <p>
            {nickname} · {timeAgo(request.created_at)} · {isStyling ? "코디" : "제안"} {all.length}개
          </p>
        </div>
        <Link href={isStyling ? "/styling" : "/"} className="btn btn-light btn-sm">
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
            {isStyling && (
              <div className="mb-4 flex flex-col gap-3">
                {styling ? (
                  <>
                    <div className="tags !mt-0">
                      {stylingTags(styling).map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                    <BodyProfile profile={styling} />
                    <LockNote>
                      {isOwner ? "키와 사이즈는 나와 판매자에게만 보여요." : "체형 정보는 판매자에게만 보여요. 다른 소비자에게는 보이지 않아요."}
                    </LockNote>
                  </>
                ) : (
                  <LockNote>이 손님의 키와 사이즈는 판매자에게만 보여요.</LockNote>
                )}
              </div>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#444]">
              {request.body || "추가 설명이 없어요."}
            </p>
          </section>

          <section id="proposals">
            <div className="section-head !mb-4 pt-6">
              <div>
                <div className="section-kicker">{isStyling ? "LOOKS" : "PROPOSALS"}</div>
                <h2 className="section-title">
                  {isStyling ? "판매자 코디" : "판매자 제안"} <small>{all.length}개</small>
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

            <div className={isStyling ? "look-grid single" : "flex flex-col gap-3"}>
              {all.length === 0 && (
                <div className="empty-state">
                  아직 {isStyling ? "도착한 코디가" : "제안이"} 없어요. 판매자에게 알림이 갔어요!
                </div>
              )}
              {all.length > 0 && sorted.length === 0 && <div className="empty-state">이 유형의 판매자 제안이 없어요.</div>}
              {sorted.map((p) =>
                p.is_look ? (
                  <LookCard key={p.id} look={p} viewer={user} actions={buyerActions(p)} />
                ) : (
                  <ProposalCard key={p.id} proposal={p} viewer={user} actions={buyerActions(p)} />
                ),
              )}
            </div>
          </section>
        </div>

        <aside className="side-panel">
          {mySellerProfile && (
            <div className="how-card">
              <div className="section-kicker">FOR SELLER</div>
              {isStyling && styling ? (
                <>
                  <h3>내 상품으로 이 손님의 한 벌을 만들어보세요.</h3>
                  <LookButton
                    requestId={request.id}
                    requestTitle={request.title}
                    summary={`${styling.height_cm}cm · ${styling.top_size} · ${styling.bottom_size} · ${fitName(styling.fit)}`}
                    budgetMax={request.budget_max}
                    pieces={styling.pieces}
                    seller={mySellerProfile}
                  />
                </>
              ) : (
                <>
                  <h3>이 요청에 맞는 상품이 있나요?</h3>
                  <ProposalButton
                    requestId={request.id}
                    requestTitle={request.title}
                    budgetMax={request.budget_max}
                    seller={mySellerProfile}
                  />
                </>
              )}
            </div>
          )}
          {user?.role === "consumer" && (
            <WatchToggle requestId={request.id} notify={watch?.notify ?? false} isOwner={isOwner} />
          )}
          <div className="panel">
            <div className="panel-title">
              <h2>요청 조건</h2>
            </div>
            {isStyling ? (
              <dl className="grid grid-cols-[72px_1fr] gap-y-3 text-xs">
                <dt className="text-muted">코디 예산</dt>
                <dd className="font-bold">최대 {won(request.budget_max)}</dd>
                <dt className="text-muted">중심 분야</dt>
                <dd>{categoryName(request.category_id)}</dd>
                {styling && (
                  <>
                    <dt className="text-muted">입을 상황</dt>
                    <dd>{occasionName(styling.occasion)}</dd>
                    <dt className="text-muted">스타일</dt>
                    <dd>{styling.styles.length ? styling.styles.map(styleName).join(", ") : "-"}</dd>
                    <dt className="text-muted">넣을 품목</dt>
                    <dd>
                      <PieceList pieces={styling.pieces} />
                    </dd>
                  </>
                )}
              </dl>
            ) : (
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
            )}
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
