import Link from "next/link";
import { categoryName, fitName, requestConditionName, styleName } from "@/lib/constants";
import { timeAgo, won } from "@/lib/format";
import type { Request, StylingProfile } from "@/lib/types";

export type RequestCardData = Request & {
  consumer: { nickname: string } | null;
  proposals: { count: number }[];
  // 코디 요청의 체형 정보: RLS 때문에 요청자 본인·판매자에게만 채워짐
  styling?: StylingProfile | null;
};

// 목록 쿼리에서 쓰는 select
export const REQUEST_CARD_SELECT =
  "*, consumer:profiles!consumer_id(nickname), proposals(count), styling:styling_profiles(*)";

export function RequestCard({ request }: { request: RequestCardData }) {
  const nickname = request.consumer?.nickname ?? "알 수 없음";
  const proposalCount = request.proposals[0]?.count ?? 0;
  const cover = request.image_urls[0];
  const isStyling = request.kind === "styling";
  const styling = request.styling;

  return (
    <Link href={`/requests/${request.id}`} className="request-card">
      {cover && (
        <div className="request-card-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" loading="lazy" />
          <span>{isStyling ? "코디 요청" : categoryName(request.category_id)}</span>
        </div>
      )}
      <div className="request-card-body">
        <div className="request-top">
          <span className="avatar">{nickname[0]?.toUpperCase()}</span>
          <span className="request-user">{nickname}</span>
          <span className="request-time">{timeAgo(request.created_at)}</span>
        </div>
        <h3>{request.title}</h3>
        {styling ? (
          <p>
            {styling.height_cm}cm · {styling.top_size} · {fitName(styling.fit)}
            {styling.styles.length > 0 && ` / ${styling.styles.map(styleName).join(", ")}`}
          </p>
        ) : (
          request.body && <p>{request.body}</p>
        )}
        <div className="tags mb-4">
          {isStyling ? (
            <>
              <span className="tag tag-dark">코디 요청</span>
              {styling?.pieces.map((p) => (
                <span key={p} className="tag">
                  {categoryName(p)}
                </span>
              ))}
            </>
          ) : (
            <>
              {!cover && <span className="tag tag-dark">{categoryName(request.category_id)}</span>}
              {request.brand && <span className="tag">{request.brand}</span>}
              {request.size && <span className="tag">{request.size}</span>}
              {request.conditions.map((c) => (
                <span key={c} className="tag">
                  {requestConditionName(c)}
                </span>
              ))}
            </>
          )}
        </div>
        <div className="request-foot">
          <strong>
            {isStyling ? "코디 예산" : "최대"} {won(request.budget_max)}
          </strong>
          <span>
            {isStyling ? "코디" : "제안"} {proposalCount}개
          </span>
        </div>
      </div>
    </Link>
  );
}
