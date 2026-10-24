import Link from "next/link";
import { PROPOSAL_CONDITIONS, sellerTypeName } from "@/lib/constants";
import { timeAgo, won } from "@/lib/format";
import type { Proposal, Role, SellerProfile } from "@/lib/types";

export type ProposalCardData = Proposal & {
  seller: {
    nickname: string;
    seller_profile: Pick<SellerProfile, "shop_name" | "seller_type" | "is_subscribed"> | null;
  } | null;
  rating: { avg_score: number; rating_count: number } | null;
};

type Props = {
  proposal: ProposalCardData;
  actions?: React.ReactNode;
  // 보는 사람: 판매자에게는 구매용 링크(판매자 사이트·매장 위치)를 보여주지 않음
  viewer: { id: string; role: Role } | null;
};

export function ProposalCard({ proposal, actions, viewer }: Props) {
  const sp = proposal.seller?.seller_profile;
  const shopName = sp?.shop_name ?? proposal.seller?.nickname ?? "판매자";
  const condition = PROPOSAL_CONDITIONS.find((c) => c.id === proposal.condition)?.name;
  const isMine = viewer?.id === proposal.seller_id;
  const showBuyerLinks = viewer?.role !== "seller";

  return (
    <article className={`proposal-card ${sp?.is_subscribed ? "subscribed" : ""}`}>
      <div className="proposal-photo">
        {proposal.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proposal.image_url} alt={proposal.product_name} loading="lazy" />
        )}
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
          {isMine && <span className="tag !border !border-ink !bg-white !py-1 font-bold text-ink">내 제안</span>}
          {sp?.is_subscribed && <span className="tag tag-dark !py-1">구독 · AD</span>}
          <Link href={`/sellers/${proposal.seller_id}`} className="font-bold text-ink hover:underline">
            {shopName}
          </Link>
          {sp && <span>· {sellerTypeName(sp.seller_type)}</span>}
          <span>· ★ {proposal.rating ? `${proposal.rating.avg_score} (${proposal.rating.rating_count})` : "-"}</span>
          <span className="ml-auto">{timeAgo(proposal.created_at)}</span>
        </div>
        <h3 className="text-sm font-bold">{proposal.product_name}</h3>
        <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted">{proposal.description}</p>
        <div className="tags !mt-2">
          {condition && <span className="tag">{condition}</span>}
          {proposal.size_info && <span className="tag">{proposal.size_info}</span>}
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
          <strong className="text-base">{won(proposal.price)}</strong>
          <div className="flex flex-wrap gap-2">
            {actions}
            {showBuyerLinks && proposal.location_url && (
              <a href={proposal.location_url} target="_blank" rel="noreferrer" className="btn btn-light btn-sm">
                매장 위치
              </a>
            )}
            {showBuyerLinks && proposal.product_url && (
              <a href={proposal.product_url} target="_blank" rel="noreferrer" className="btn btn-sm">
                판매자 사이트에서 보기
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
