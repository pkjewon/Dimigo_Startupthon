"use client";

import { useActionState, useEffect, useState } from "react";
import { PROPOSAL_CONDITIONS } from "@/lib/constants";
import { won } from "@/lib/format";
import type { SellerProfile } from "@/lib/types";
import { uploadImage } from "@/lib/upload";
import { createProposal } from "./actions";

type Props = {
  requestId: number;
  requestTitle: string;
  budgetMax: number;
  seller: SellerProfile;
};

export function ProposalButton(props: Props) {
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
      <button className="btn w-full !bg-paper !text-ink" onClick={() => setOpen(true)}>
        내 상품으로 제안하기 ↗
      </button>
      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <button className="modal-close" aria-label="닫기" onClick={() => setOpen(false)}>
              ×
            </button>
            <ProposalForm {...props} onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function ProposalForm({ requestId, requestTitle, budgetMax, seller, onDone }: Props & { onDone: () => void }) {
  const [state, action, pending] = useActionState(createProposal, undefined);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const isOffline = seller.seller_type === "offline";

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

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
      <div className="section-kicker">SEND AN OFFER</div>
      <h2>내 상품으로 제안하기</h2>
      <p>실제 상품 사진과 실측을 함께 보내면 구매자가 더 쉽게 고를 수 있어요.</p>
      <div className="modal-request">
        <b>{requestTitle}</b>
        <small>희망 예산 최대 {won(budgetMax)}</small>
      </div>

      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="image_url" value={image} />

      <label className="upload-zone !min-h-[110px]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="상품 사진" className="h-[110px] object-contain" />
        ) : (
          <div>
            <strong>{uploading ? "업로드 중…" : "상품 사진 추가"}</strong>
            <small>실제 상품 사진 1장</small>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {uploadError && <p className="form-error mt-2">{uploadError}</p>}

      <div className="form-grid">
        <div className="field full">
          <label htmlFor="product_name">제안 상품명 *</label>
          <input id="product_name" name="product_name" required maxLength={80} placeholder="브랜드와 상품명" />
        </div>
        <div className="field">
          <label htmlFor="price">판매 가격 *</label>
          <input id="price" name="price" type="number" min={1} step={1} required placeholder="원" />
        </div>
        <div className="field">
          <label htmlFor="condition">상품 상태 *</label>
          <select id="condition" name="condition" required defaultValue="">
            <option value="" disabled>
              선택
            </option>
            {PROPOSAL_CONDITIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="size_info">사이즈 / 실측</label>
          <input id="size_info" name="size_info" maxLength={60} placeholder="예: M / 총장 110cm" />
        </div>
        <div className="field full">
          <label htmlFor="description">상품 설명</label>
          <textarea id="description" name="description" maxLength={1000} placeholder="소재, 핏, 사용감, 구성품 등" />
        </div>
        <div className="field full">
          <label htmlFor="product_url">상품 링크</label>
          <input id="product_url" name="product_url" defaultValue={seller.shop_url ?? ""} placeholder="https://" />
          <span className="field-help">&ldquo;판매자 사이트에서 보기&rdquo; 버튼이 이 링크로 연결돼요.</span>
        </div>
        {isOffline ? (
          <p className="field full field-help">
            📍 오프라인 매장이라 매장 위치 링크가 자동으로 붙어요{seller.location_url ? "" : " (판매자 설정에서 위치 링크를 먼저 넣어주세요)"}.
          </p>
        ) : (
          <div className="field full">
            <label htmlFor="location_url">매장 위치 링크</label>
            <input id="location_url" name="location_url" placeholder="오프라인 매장이 있으면 지도 링크" />
          </div>
        )}
      </div>
      {state?.error && <p className="form-error mt-4">{state.error}</p>}
      <div className="form-submit">
        <small>제안하면 이 글의 알림을 켠 사람들에게 알림이 가요.</small>
        <button className="btn" disabled={pending || uploading}>
          {pending ? "보내는 중…" : "제안 보내기 ↗"}
        </button>
      </div>
    </form>
  );
}
