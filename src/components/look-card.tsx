import Link from "next/link";
import { categoryName, conditionName, sellerTypeName } from "@/lib/constants";
import { timeAgo, won } from "@/lib/format";
import type { LookItem, Role } from "@/lib/types";
import type { ProposalCardData } from "./proposal-card";

export type LookCardData = ProposalCardData & { items: LookItem[] };

type Props = {
  look: LookCardData;
  actions?: React.ReactNode;
  // 판매자에게는 구매용 링크(상품 링크·매장 위치)를 보여주지 않음
  viewer: { id: string; role: Role } | null;
  // 예시로 보여줄 때 요청글로 가는 링크
  href?: string;
};

// 판매자가 자기 상품 2~4개로 묶은 한 벌 코디 제안
export function LookCard({ look, actions, viewer, href }: Props) {
  const sp = look.seller?.seller_profile;
  const shopName = sp?.shop_name ?? look.seller?.nickname ?? "판매자";
  const items = [...look.items].sort((a, b) => a.position - b.position);
  const isMine = viewer?.id === look.seller_id;
  const showBuyerLinks = viewer?.role !== "seller";

  return (
    <article className={`look-card ${sp?.is_subscribed ? "subscribed" : ""}`}>
      <div className={`look-visual ${look.image_url ? "has-photo" : ""}`}>
        {look.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={look.image_url} alt={look.product_name} loading="lazy" />
        )}
        <div className="look-brand">
          <span>LOOK</span>
          <b>{shopName}</b>
        </div>
        {!look.image_url && (
          <div className="look-pieces">
            {items.map((item) => (
              <span key={item.id}>{categoryName(item.category_id)}</span>
            ))}
          </div>
        )}
        <div className="look-foot">{items.length} PIECES · ONE LOOK</div>
      </div>

      <div className="look-body">
        <div className="seller-meta">
          <span className="seller-avatar">{shopName[0]?.toUpperCase()}</span>
          <Link href={`/sellers/${look.seller_id}`} className="hover:underline">
            <strong>{shopName}</strong>
          </Link>
          {sp && <span>{sellerTypeName(sp.seller_type)}</span>}
          <span>★ {look.rating ? look.rating.avg_score : "-"}</span>
          {isMine && <span className="tag !border !border-ink !bg-white !py-1 font-bold text-ink">내 코디</span>}
          {sp?.is_subscribed && <span className="tag tag-dark !py-1">구독 · AD</span>}
          <span className="ml-auto">{timeAgo(look.created_at)}</span>
        </div>
        <h3>{href ? <Link href={href} className="hover:underline">{look.product_name}</Link> : look.product_name}</h3>
        {look.description && <p className="line-clamp-3">{look.description}</p>}

        <div className="item-list">
          {items.map((item, i) => (
            <div key={item.id} className="item-row">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <strong className="truncate">{item.product_name}</strong>
                <small>
                  {[categoryName(item.category_id), item.size_info, conditionName(item.condition)].filter(Boolean).join(" · ")}
                  {showBuyerLinks && item.product_url && (
                    <>
                      {" · "}
                      <a href={item.product_url} target="_blank" rel="noreferrer">
                        상품 보기
                      </a>
                    </>
                  )}
                </small>
              </span>
              <b>{won(item.price)}</b>
            </div>
          ))}
        </div>

        <div className="look-total">
          <small>코디 총액 · {items.length}개 상품</small>
          <strong>{won(look.price)}</strong>
        </div>
        {(actions || (showBuyerLinks && look.location_url)) && (
          <div className="look-actions">
            {actions}
            {showBuyerLinks && look.location_url && (
              <a href={look.location_url} target="_blank" rel="noreferrer" className="btn btn-light btn-sm">
                매장 위치
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
