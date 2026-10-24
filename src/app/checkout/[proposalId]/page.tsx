import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PROPOSAL_CONDITIONS, sellerTypeName } from "@/lib/constants";
import { won } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./checkout-form";

type ProposalForCheckout = {
  id: number;
  request_id: number;
  product_name: string;
  price: number;
  condition: string | null;
  size_info: string | null;
  image_url: string | null;
  seller: { nickname: string; seller_profile: { shop_name: string; seller_type: string } | null } | null;
};

// 9번 화면: 모의 결제 (실제 결제·카드 정보 입력 없음)
export default async function CheckoutPage({ params }: PageProps<"/checkout/[proposalId]">) {
  const { proposalId } = await params;
  if (!/^\d+$/.test(proposalId)) notFound();
  const user = await requireUser("consumer", `/checkout/${proposalId}`);

  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select(
      "id, request_id, product_name, price, condition, size_info, image_url, seller:profiles!seller_id(nickname, seller_profile:seller_profiles(shop_name, seller_type))",
    )
    .eq("id", proposalId)
    .maybeSingle<ProposalForCheckout>();
  if (!proposal) notFound();

  const shop = proposal.seller?.seller_profile;
  const condition = PROPOSAL_CONDITIONS.find((c) => c.id === proposal.condition)?.name;

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">CHECKOUT</div>
          <h1>바로 구매</h1>
          <p>시연용 모의 결제예요. 실제로 돈이 나가지 않아요.</p>
        </div>
        <div className="stepper">
          <span>01 요청 작성</span>
          <span className="step-dot" />
          <span>02 제안 비교</span>
          <span className="step-dot" />
          <b>03 선택 & 구매</b>
        </div>
      </div>
      <div className="two-col">
        <CheckoutForm proposalId={proposal.id} defaultName={user.nickname} />
        <aside className="side-panel">
          <div className="panel">
            <div className="panel-title">
              <h2>주문 상품</h2>
              <Link href={`/requests/${proposal.request_id}`} className="text-[10px] text-muted underline">
                요청글 보기
              </Link>
            </div>
            <div className="flex gap-3">
              <div className="h-24 w-20 flex-none bg-soft">
                {proposal.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proposal.image_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 text-xs">
                <p className="text-[10px] text-muted">
                  {shop?.shop_name ?? proposal.seller?.nickname}
                  {shop && ` · ${sellerTypeName(shop.seller_type)}`}
                </p>
                <p className="mt-1 font-bold">{proposal.product_name}</p>
                <p className="mt-1 text-muted">{[condition, proposal.size_info].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-[1fr_auto] gap-y-2 border-t border-line pt-4 text-xs">
              <dt className="text-muted">상품 금액</dt>
              <dd>{won(proposal.price)}</dd>
              <dt className="text-muted">배송비</dt>
              <dd>무료</dd>
              <dt className="pt-2 font-bold">결제 금액</dt>
              <dd className="pt-2 text-base font-bold">{won(proposal.price)}</dd>
            </dl>
          </div>
          <div className="tip-card">
            <h3>사이트 안에서 결제하면</h3>
            <p>주문 내역이 남고, 결제 후 바로 판매자에게 평점을 남길 수 있어요.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
