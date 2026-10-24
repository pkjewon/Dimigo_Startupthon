import Link from "next/link";
import { RequestCard, type RequestCardData } from "@/components/request-card";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES, categoryName } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const user = await getCurrentUser();

  const supabase = await createClient();
  let query = supabase
    .from("requests")
    .select("*, consumer:profiles!consumer_id(nickname), proposals(count)")
    .order("created_at", { ascending: false })
    .limit(60);
  if (CATEGORIES.some((c) => c.id === category)) query = query.eq("category_id", category);
  if (q) {
    // PostgREST or 필터 문법을 깨뜨리는 문자는 제거
    const term = q.replace(/[,()%*\\]/g, " ");
    query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%,brand.ilike.%${term}%`);
  }
  const { data: requests, error } = await query.returns<RequestCardData[]>();

  const isSeller = user?.role === "seller";
  const ctaHref = isSeller ? "/seller/settings" : user ? "/requests/new" : "/signup";
  const filtered = category || q;

  return (
    <>
      {!filtered && (
        <div className="hero">
          {isSeller ? (
            <div className="hero-copy">
              <div className="eyebrow">FOR SELLER</div>
              <h1>
                누군가 찾는 옷,
                <br />
                <em>당신에게 있을지도 몰라요.</em>
              </h1>
              <p className="hero-desc">
                구매 요청을 살펴보고 가지고 있는 상품으로 제안해보세요. 오프라인 매장이라면 손님이 직접 찾아와요.
              </p>
              <div className="flex gap-2">
                <a href="#feed" className="btn">
                  제안할 요청 보기 →
                </a>
                <Link href="/seller/dashboard" className="btn btn-light">
                  대시보드
                </Link>
              </div>
            </div>
          ) : (
            <div className="hero-copy">
              <div className="eyebrow">A NEW WAY TO FIND FASHION</div>
              <h1>
                원하는 옷을 말하면,
                <br />
                <em>판매자가 찾아와요.</em>
              </h1>
              <p className="hero-desc">
                검색해도 나오지 않던 옷, 어디서 파는지 몰랐던 매장. 찾는 옷을 남기면 온라인 쇼핑몰과 동네 매장이 직접 제안해요.
              </p>
              <div className="flex gap-2">
                <Link href={user ? "/requests/new" : "/login?next=/requests/new"} className="btn">
                  원하는 옷 요청하기 →
                </Link>
                <a href="#feed" className="btn btn-light">
                  요청 둘러보기
                </a>
              </div>
            </div>
          )}
          <div className="hero-visual" />
        </div>
      )}

      <section id="feed" className={filtered ? "pt-9" : ""}>
        <div className="section-head">
          <div>
            <div className="section-kicker">OPEN REQUESTS</div>
            <h2 className="section-title">
              {q ? `"${q}" 검색 결과` : category ? `${categoryName(category)} 요청` : "지금 찾는 옷"}
              <small>{isSeller ? "내 상품으로 제안해보세요" : "판매자의 제안을 기다리고 있어요"}</small>
            </h2>
          </div>
        </div>

        <div className="filter-bar">
          <Link href="/" className={`filter-chip ${!category ? "active" : ""}`}>
            전체
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={`/?category=${c.id}`} className={`filter-chip ${category === c.id ? "active" : ""}`}>
              {c.name}
            </Link>
          ))}
        </div>

        <div className="request-grid">
          {error && <div className="empty-state">요청글을 불러오지 못했어요: {error.message}</div>}
          {requests?.length === 0 && (
            <div className="empty-state">{q ? "검색 결과가 없어요." : "아직 이 카테고리의 요청이 없어요."}</div>
          )}
          {requests?.map((r) => <RequestCard key={r.id} request={r} />)}
        </div>
      </section>

      <div className="daily-banner">
        <div>
          <div className="eyebrow !text-[#a7a8a3]">YOUR TASTE, YOUR MARKET</div>
          <h2>{isSeller ? "관심 카테고리를 설정했나요?" : "찾는 옷이 보이지 않나요?"}</h2>
          <p>
            {isSeller
              ? "관심 카테고리에 새 요청이 올라오면 바로 알려드려요."
              : "원하는 조건을 남기면 판매자가 직접 제안해요."}
          </p>
        </div>
        <Link href={ctaHref} className="btn">
          {isSeller ? "판매자 설정 →" : "요청 시작하기 →"}
        </Link>
      </div>
    </>
  );
}
