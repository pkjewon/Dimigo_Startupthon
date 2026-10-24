"use client";

import { useActionState, useState } from "react";
import { CATEGORIES, SELLER_TYPES } from "@/lib/constants";
import type { SellerProfile } from "@/lib/types";
import { saveSellerProfile } from "./actions";

export function SellerSettingsForm({ profile }: { profile: SellerProfile }) {
  const [state, action, pending] = useActionState(saveSellerProfile, undefined);
  const [sellerType, setSellerType] = useState(profile.seller_type);
  const [interests, setInterests] = useState<string[]>(profile.interest_categories);
  const [subscribed, setSubscribed] = useState(profile.is_subscribed);

  const toggleInterest = (id: string) =>
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <form action={action} className="flex flex-col gap-4">
      <section className="panel">
        <div className="panel-title">
          <h2>매장 정보</h2>
          <span>* 필수 입력</span>
        </div>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="shop_name">상호명 *</label>
            <input id="shop_name" name="shop_name" defaultValue={profile.shop_name} required maxLength={40} />
          </div>
          <div className="field full">
            <label>판매자 유형 *</label>
            <div className="checks">
              {SELLER_TYPES.map((t) => (
                <label key={t.id} className={`check-chip ${sellerType === t.id ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="seller_type"
                    value={t.id}
                    checked={sellerType === t.id}
                    onChange={() => setSellerType(t.id)}
                    className="sr-only"
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
          <div className="field full">
            <label htmlFor="shop_url">판매 사이트 링크</label>
            <input id="shop_url" name="shop_url" defaultValue={profile.shop_url ?? ""} placeholder="https://" />
          </div>
          <div className="field full">
            <label htmlFor="location_url">매장 위치 링크{sellerType === "offline" && " *"}</label>
            <input
              id="location_url"
              name="location_url"
              defaultValue={profile.location_url ?? ""}
              placeholder="네이버·카카오 지도 링크"
              required={sellerType === "offline"}
            />
            <span className="field-help">오프라인 매장은 제안 댓글에 이 링크가 자동으로 붙어요.</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>관심 카테고리</h2>
          <span>새 요청글 알림을 받을 카테고리</span>
        </div>
        <div className="checks">
          {CATEGORIES.map((c) => (
            <label key={c.id} className={`check-chip ${interests.includes(c.id) ? "selected" : ""}`}>
              <input
                type="checkbox"
                name="interest_categories"
                value={c.id}
                checked={interests.includes(c.id)}
                onChange={() => toggleInterest(c.id)}
                className="sr-only"
              />
              {c.name}
            </label>
          ))}
        </div>
      </section>

      <section className="panel flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold">구독</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            구독 판매자의 제안은 요청글 댓글 맨 위에 표시돼요. (시연용 모의 구독)
          </p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            name="is_subscribed"
            checked={subscribed}
            onChange={(e) => setSubscribed(e.target.checked)}
          />
          <span />
        </label>
      </section>

      <div className="form-submit">
        <small className={state?.error ? "form-error" : ""}>
          {state?.error ?? (state?.ok ? "저장했어요." : "")}
        </small>
        <button className="btn" disabled={pending}>
          {pending ? "저장 중…" : "저장하기"}
        </button>
      </div>
    </form>
  );
}
