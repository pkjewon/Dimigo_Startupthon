import Link from "next/link";
import { categoryName, requestConditionName } from "@/lib/constants";
import { timeAgo, won } from "@/lib/format";
import type { Request } from "@/lib/types";

export type RequestCardData = Request & {
  consumer: { nickname: string } | null;
  proposals: { count: number }[];
};

export function RequestCard({ request }: { request: RequestCardData }) {
  const nickname = request.consumer?.nickname ?? "알 수 없음";
  const proposalCount = request.proposals[0]?.count ?? 0;
  const cover = request.image_urls[0];

  return (
    <Link href={`/requests/${request.id}`} className="request-card">
      {cover && (
        <div className="request-card-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" loading="lazy" />
          <span>{categoryName(request.category_id)}</span>
        </div>
      )}
      <div className="request-card-body">
        <div className="request-top">
          <span className="avatar">{nickname[0]?.toUpperCase()}</span>
          <span className="request-user">{nickname}</span>
          <span className="request-time">{timeAgo(request.created_at)}</span>
        </div>
        <h3>{request.title}</h3>
        {request.body && <p>{request.body}</p>}
        <div className="tags mb-4">
          {!cover && <span className="tag tag-dark">{categoryName(request.category_id)}</span>}
          {request.brand && <span className="tag">{request.brand}</span>}
          {request.size && <span className="tag">{request.size}</span>}
          {request.conditions.map((c) => (
            <span key={c} className="tag">
              {requestConditionName(c)}
            </span>
          ))}
        </div>
        <div className="request-foot">
          <strong>최대 {won(request.budget_max)}</strong>
          <span>제안 {proposalCount}개</span>
        </div>
      </div>
    </Link>
  );
}
