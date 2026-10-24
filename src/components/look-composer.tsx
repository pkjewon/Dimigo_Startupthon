"use client";

import { useActionState, useEffect, useState } from "react";
import { createLook } from "@/app/styling/actions";
import { CATEGORIES, LOOK_MAX_ITEMS, LOOK_MIN_ITEMS, PROPOSAL_CONDITIONS } from "@/lib/constants";
import { won } from "@/lib/format";
import type { SellerProfile } from "@/lib/types";
import { uploadImage } from "@/lib/upload";

type Props = {
  requestId: number;
  requestTitle: string;
  // "168cm · M · 28–29 · 정핏"
  summary: string;
  budgetMax: number;
  pieces: string[];
  seller: SellerProfile;
  label?: string;
};

// 상품 칸의 React key
let seq = 0;

type Item = {
  key: number;
  category_id: string;
  product_name: string;
  price: string;
  condition: string;
  size_info: string;
  product_url: string;
};

export function LookButton({ label = "한 벌 코디 구성하기 ↗", ...props }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" className="btn w-full" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal modal-wide">
            <button className="modal-close" aria-label="닫기" onClick={() => setOpen(false)}>
              ×
            </button>
            <LookForm {...props} onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function LookForm({ requestId, requestTitle, summary, budgetMax, pieces, seller, onDone }: Props & { onDone: () => void }) {
  const [state, action, pending] = useActionState(createLook, undefined);
  const blank = (category_id: string): Item => ({
    key: seq++,
    category_id,
    product_name: "",
    price: "",
    condition: "",
    size_info: "",
    product_url: "",
  });
  // 손님이 고른 품목으로 칸을 미리 채워둠
  const [items, setItems] = useState<Item[]>(() => {
    const start = pieces.slice(0, LOOK_MAX_ITEMS);
    while (start.length < LOOK_MIN_ITEMS) start.push("top");
    return start.map(blank);
  });
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  const over = total > budgetMax;
  const isOffline = seller.seller_type === "offline";

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const update = (key: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      setImage(await uploadImage(seller.user_id, file));
    } catch (e) {
      setUploadError(`업로드 실패: ${(e as Error).message}`);
    }
    setUploading(false);
  }

  return (
    <form action={action}>
      <div className="section-kicker">CREATE A LOOK</div>
      <h2>내 상품으로 한 벌 구성하기</h2>
      <p>손님 조건에 맞는 상품을 {LOOK_MIN_ITEMS}~{LOOK_MAX_ITEMS}개 골라 한 벌로 보내주세요.</p>
      <div className="modal-request">
        <b>{requestTitle}</b>
        <small>
          {summary} · 예산 최대 {won(budgetMax)}
        </small>
      </div>

      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="image_url" value={image} />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map((it) => ({
            category_id: it.category_id,
            product_name: it.product_name,
            price: Number(it.price),
            condition: it.condition,
            size_info: it.size_info,
            product_url: it.product_url,
          })),
        )}
      />

      <div className="form-grid !mt-0 mb-3">
        <div className="field full">
          <label htmlFor="look-title">코디 이름 *</label>
          <input id="look-title" name="title" required maxLength={80} placeholder="예: 차분한 톤의 데이트 룩" />
        </div>
      </div>

      {items.map((it, i) => (
        <section key={it.key} className="composer-item">
          <div className="composer-item-head">
            <b>{String(i + 1).padStart(2, "0")} / 코디 상품</b>
            {items.length > LOOK_MIN_ITEMS && (
              <button type="button" onClick={() => setItems((prev) => prev.filter((x) => x.key !== it.key))}>
                빼기
              </button>
            )}
          </div>
          <div className="composer-fields">
            <div className="field full">
              <label>상품명 *</label>
              <input required maxLength={80} value={it.product_name} onChange={(e) => update(it.key, { product_name: e.target.value })} placeholder="예: 울 블렌드 싱글 코트" />
            </div>
            <div className="field">
              <label>가격 *</label>
              <input type="number" min={1} step={1} required value={it.price} onChange={(e) => update(it.key, { price: e.target.value })} placeholder="원" />
            </div>
            <div className="field">
              <label>카테고리</label>
              <select value={it.category_id} onChange={(e) => update(it.key, { category_id: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>상태</label>
              <select value={it.condition} onChange={(e) => update(it.key, { condition: e.target.value })}>
                <option value="">선택</option>
                {PROPOSAL_CONDITIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="composer-fields sub">
            <div className="field">
              <label>사이즈 · 실측</label>
              <input maxLength={60} value={it.size_info} onChange={(e) => update(it.key, { size_info: e.target.value })} placeholder="예: M · 총장 110cm" />
            </div>
            <div className="field">
              <label>상품 링크</label>
              <input value={it.product_url} onChange={(e) => update(it.key, { product_url: e.target.value })} placeholder={seller.shop_url ?? "https://"} />
            </div>
          </div>
        </section>
      ))}
      {items.length < LOOK_MAX_ITEMS && (
        <button type="button" className="add-item" onClick={() => setItems((prev) => [...prev, blank("acc")])}>
          ＋ 상품 추가
        </button>
      )}

      <div className={`total-row ${over ? "over" : ""}`}>
        <span>코디 총액</span>
        <small>{over ? "요청 예산을 넘었어요" : `예산 ${won(budgetMax)} 이내`}</small>
        <strong>{won(total)}</strong>
      </div>

      <div className="form-grid">
        <div className="field full">
          <label htmlFor="look-description">이 코디를 고른 이유 *</label>
          <textarea id="look-description" name="description" required maxLength={1000} placeholder="체형에 잘 맞는 이유, 상품끼리 어떻게 어울리는지 알려주세요." />
        </div>
      </div>

      <label className="upload-zone mt-3 !min-h-[90px]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="코디 사진" className="h-[90px] object-contain" />
        ) : (
          <div>
            <strong>{uploading ? "업로드 중…" : "코디 사진 추가 (선택)"}</strong>
            <small>상품을 함께 놓고 찍은 사진이면 좋아요</small>
          </div>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>
      {uploadError && <p className="form-error mt-2">{uploadError}</p>}

      {isOffline && (
        <p className="field-help mt-3">📍 오프라인 매장이라 매장 위치가 코디에 자동으로 붙어요. 손님이 방문 예정을 남길 수 있어요.</p>
      )}
      {state?.error && <p className="form-error mt-4">{state.error}</p>}
      <div className="form-submit">
        <small>보내면 이 요청의 알림을 켠 사람에게 알림이 가요.</small>
        <button className="btn" disabled={pending || uploading || over || total <= 0}>
          {pending ? "보내는 중…" : "이 코디 보내기 ↗"}
        </button>
      </div>
    </form>
  );
}
