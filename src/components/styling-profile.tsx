import { categoryName, fitName, occasionName, styleName } from "@/lib/constants";
import type { StylingProfile } from "@/lib/types";

// 코디 요청의 체형 정보 (RLS 로 요청자 본인과 판매자에게만 내려옴)
export function BodyProfile({ profile }: { profile: StylingProfile }) {
  return (
    <div className="body-profile">
      <div className="measure">
        <small>키</small>
        <b>{profile.height_cm} cm</b>
      </div>
      <div className="measure">
        <small>평소 상의</small>
        <b>{profile.top_size}</b>
      </div>
      <div className="measure">
        <small>평소 하의</small>
        <b>{profile.bottom_size}</b>
      </div>
      <div className="measure">
        <small>선호 핏</small>
        <b>{fitName(profile.fit)}</b>
      </div>
    </div>
  );
}

export function PieceList({ pieces }: { pieces: string[] }) {
  return (
    <div className="piece-list">
      {pieces.map((p) => (
        <i key={p}>{categoryName(p)}</i>
      ))}
    </div>
  );
}

export function stylingTags(profile: Pick<StylingProfile, "occasion" | "styles">) {
  return [occasionName(profile.occasion), ...profile.styles.map(styleName)];
}

export function LockNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="lock-note">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="10" width="16" height="11" rx="1" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
