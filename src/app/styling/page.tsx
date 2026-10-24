import Link from "next/link";
import { LookButton } from "@/components/look-composer";
import { LookCard, type LookCardData } from "@/components/look-card";
import { REQUEST_CARD_SELECT, RequestCard, type RequestCardData } from "@/components/request-card";
import { BodyProfile, LockNote, PieceList, stylingTags } from "@/components/styling-profile";
import { getCurrentUser } from "@/lib/auth";
import { categoryName, fitName } from "@/lib/constants";
import { isWithinDays, timeAgo, won } from "@/lib/format";
import { attachRatings, PROPOSAL_SELECT } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SellerProfile } from "@/lib/types";
import { StylingForm } from "./styling-form";

// 코디 모드: 소비자는 코디 요청을 남기고, 판매자는 들어온 코디 요청에 한 벌을 제안
export default async function StylingPage() {
  const user = await getCurrentUser();
  return user?.role === "seller" ? <SellerStyling user={user} /> : <ConsumerStyling user={user} />;
}

async function ConsumerStyling({ user }: { user: Profile | null }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("proposals")
    .select(PROPOSAL_SELECT)
    .eq("is_look", true)
    .order("created_at", { ascending: false })
    .limit(2)
    .returns<Omit<LookCardData, "rating">[]>();
  const examples = await attachRatings(supabase, data ?? []);

  return (
    <>
      <section className="styling-intro">
        <div>
          <div className="eyebrow">STYLING MODE · FIT FIRST</div>
          <h1>
            나에게 맞는 한 벌,
            <br />
            <em>판매자가 골라줘요.</em>
          </h1>
          <p className="styling-intro-copy">
            키와 평소 사이즈, 입고 갈 상황만 알려주세요. 동네 매장과 쇼핑몰이 지금 팔고 있는 옷으로 나에게 맞는 코디를 묶어서 보내드려요.
          </p>
        </div>
        <div className="mini-steps" aria-label="이용 순서">
          <div className="mini-step">
            <small>01 / REQUEST</small>
            <strong>내 조건 남기기</strong>
          </div>
          <div className="mini-step">
            <small>02 / CURATE</small>
            <strong>판매자가 코디</strong>
          </div>
          <div className="mini-step">
            <small>03 / PICK</small>
            <strong>비교하고 고르기</strong>
          </div>
        </div>
      </section>

      {user ? (
        <StylingForm userId={user.id} />
      ) : (
        <div className="daily-banner !mt-7">
          <div>
            <div className="eyebrow !text-[#a7a8a3]">STYLING REQUEST</div>
            <h2>로그인하고 코디를 요청해보세요</h2>
            <p>요청은 소비자 계정으로 올릴 수 있어요.</p>
          </div>
          <Link href="/login?next=/styling" className="btn">
            로그인 →
          </Link>
        </div>
      )}

      {examples.length > 0 && (
        <section className="pt-14">
          <div className="section-head">
            <div>
              <div className="section-kicker">LOOKS FROM SELLERS</div>
              <h2 className="section-title">
                이런 코디가 도착해요 <small>최근 판매자들이 보낸 코디</small>
              </h2>
            </div>
          </div>
          <div className="look-grid">
            {examples.map((look) => (
              <LookCard key={look.id} look={look} viewer={user} href={`/requests/${look.request_id}`} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

type MyLook = {
  id: number;
  product_name: string;
  price: number;
  created_at: string;
  request: { id: number; title: string; consumer: { nickname: string } | null } | null;
};

async function SellerStyling({ user }: { user: Profile }) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("seller_profiles").select("*").eq("user_id", user.id).single<SellerProfile>();
  const interests = profile?.interest_categories ?? [];

  let requestQuery = supabase
    .from("requests")
    .select(REQUEST_CARD_SELECT)
    .eq("kind", "styling")
    .order("created_at", { ascending: false })
    .limit(30);
  if (interests.length) requestQuery = requestQuery.in("category_id", interests);

  const [{ data: requests }, { data: myLooks }, { data: orders }] = await Promise.all([
    requestQuery.returns<RequestCardData[]>(),
    supabase
      .from("proposals")
      .select("id, product_name, price, created_at, request:requests(id, title, consumer:profiles!consumer_id(nickname))")
      .eq("seller_id", user.id)
      .eq("is_look", true)
      .order("created_at", { ascending: false })
      .returns<MyLook[]>(),
    supabase
      .from("orders")
      .select("amount, proposal:proposals!inner(seller_id, is_look)")
      .eq("proposal.seller_id", user.id)
      .eq("proposal.is_look", true),
  ]);

  const answered = new Set((myLooks ?? []).map((l) => l.request?.id));
  const open = (requests ?? []).filter((r) => !answered.has(r.id));
  const focus = open[0];
  const rest = (requests ?? []).filter((r) => r.id !== focus?.id);
  const sales = (orders ?? []).reduce((sum, o) => sum + o.amount, 0);
  const newCount = open.filter((r) => isWithinDays(r.created_at, 7)).length;

  return (
    <>
      <section className="styling-intro">
        <div>
          <div className="eyebrow">STYLING MODE · {profile?.shop_name ?? user.nickname}</div>
          <h1>
            누군가의 한 벌,
            <br />
            <em>내 상품으로 완성해보세요.</em>
          </h1>
          <p className="styling-intro-copy">
            손님이 남긴 키·사이즈·분위기를 보고, 매장에 있는 상품 2~4개를 묶어 코디로 제안해보세요. 한 번에 여러 상품을 보여줄 수 있어요.
          </p>
        </div>
        <div className="mini-steps" aria-label="이용 순서">
          <div className="mini-step">
            <small>01 / READ</small>
            <strong>조건 확인</strong>
          </div>
          <div className="mini-step">
            <small>02 / MATCH</small>
            <strong>상품 묶기</strong>
          </div>
          <div className="mini-step">
            <small>03 / MEET</small>
            <strong>문의·방문</strong>
          </div>
        </div>
      </section>

      <section className="stats" aria-label="코디 요약">
        <div className="stat">
          <span>기다리는 코디 요청</span>
          <div>
            <b>{String(open.length).padStart(2, "0")}</b>
            <small>이번 주 새 요청 {newCount}개</small>
          </div>
        </div>
        <div className="stat">
          <span>내가 보낸 코디</span>
          <div>
            <b>{String(myLooks?.length ?? 0).padStart(2, "0")}</b>
            <small>손님 답장은 메시지에서</small>
          </div>
        </div>
        <div className="stat">
          <span>코디 결제 금액</span>
          <div>
            <b>{won(sales)}</b>
            <small>사이트 내 결제 · 정산 전</small>
          </div>
        </div>
      </section>

      <section id="requests">
        <div className="section-head">
          <div>
            <div className="section-kicker">STYLING REQUESTS FOR YOUR SHOP</div>
            <h2 className="section-title">
              체형 맞춤 코디 요청
              <small>
                {interests.length ? `관심 카테고리 ${interests.map(categoryName).join(" · ")}` : "모든 카테고리 (관심 카테고리를 설정하면 맞는 요청만 보여요)"}
              </small>
            </h2>
          </div>
          <Link href="/seller/dashboard" className="btn btn-light btn-sm">
            대시보드
          </Link>
        </div>

        {focus?.styling && profile && (
          <article className="focus-request">
            <div className="focus-main">
              <div className="request-top !mb-0">
                <span className="avatar">{focus.consumer?.nickname[0]?.toUpperCase()}</span>
                <span className="request-user">
                  <b className="text-ink">{focus.consumer?.nickname}</b> · {timeAgo(focus.created_at)} · {categoryName(focus.category_id)}
                </span>
                <span className="new-pill">{isWithinDays(focus.created_at, 1) ? "NEW · STYLING" : "STYLING"}</span>
              </div>
              <h3>
                <Link href={`/requests/${focus.id}`} className="hover:underline">
                  {focus.title}
                </Link>
              </h3>
              {focus.body && <p>{focus.body}</p>}
              <div className="tags !mt-0 mb-3">
                {stylingTags(focus.styling).map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
              <BodyProfile profile={focus.styling} />
              <div className="focus-extra">
                <span>코디에 넣을 품목</span>
                <PieceList pieces={focus.styling.pieces} />
              </div>
            </div>
            <aside className="focus-side">
              <div>
                <span className="budget-label">코디 전체 예산</span>
                <strong className="budget-value">{won(focus.budget_max)}</strong>
                <span className="budget-hint">상품 2~4개로 한 벌을 묶어주세요. 총액이 예산을 넘으면 보낼 수 없어요.</span>
                <div className="mt-3">
                  <LockNote>체형 정보는 판매자에게만 보여요. 다른 소비자에게는 보이지 않아요.</LockNote>
                </div>
              </div>
              <LookButton
                requestId={focus.id}
                requestTitle={focus.title}
                summary={`${focus.styling.height_cm}cm · ${focus.styling.top_size} · ${focus.styling.bottom_size} · ${fitName(focus.styling.fit)}`}
                budgetMax={focus.budget_max}
                pieces={focus.styling.pieces}
                seller={profile}
              />
            </aside>
          </article>
        )}

        <div className="request-grid">
          {(requests ?? []).length === 0 && <div className="empty-state">아직 들어온 코디 요청이 없어요.</div>}
          {rest.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      </section>

      <div className="two-col !pt-12">
        <section>
          <div className="section-head !mb-4">
            <div>
              <div className="section-kicker">MY LOOKS</div>
              <h2 className="section-title">
                내가 보낸 코디 <small>{myLooks?.length ?? 0}개</small>
              </h2>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {myLooks?.length === 0 && <li className="empty-state">아직 보낸 코디가 없어요.</li>}
            {myLooks?.map((l) => (
              <li key={l.id}>
                <Link href={`/requests/${l.request?.id}`} className="panel flex items-center justify-between gap-3 !py-3 text-xs hover:border-[#aaa]">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{l.product_name}</span>
                    <span className="mt-1 block truncate text-[11px] text-muted">
                      {l.request?.consumer?.nickname} 님 · “{l.request?.title}”
                    </span>
                  </span>
                  <span className="flex-none text-right">
                    <span className="block font-bold">{won(l.price)}</span>
                    <span className="text-[10px] text-muted">{timeAgo(l.created_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <aside className="side-panel">
          <div className="how-card">
            <div className="section-kicker">YOUR SHOP PROFILE</div>
            <h3>
              관심 카테고리를
              <br />
              최신으로 유지하고 있나요?
            </h3>
            <p className="mb-4 text-[11px] leading-relaxed text-[#c9c9c5]">
              관심 카테고리에 맞는 코디 요청이 오면 바로 알림을 보내드려요. 매장 위치를 넣어두면 코디에 자동으로 붙어요.
            </p>
            <Link href="/seller/settings" className="btn w-full !bg-paper !text-ink">
              판매자 설정 →
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
