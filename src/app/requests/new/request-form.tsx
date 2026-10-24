"use client";

import { useActionState, useState } from "react";
import { CATEGORIES, MAX_REQUEST_IMAGES, REQUEST_CONDITIONS } from "@/lib/constants";
import { uploadImage } from "@/lib/upload";
import { createRequest } from "./actions";

export function RequestForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(createRequest, undefined);
  const [conditions, setConditions] = useState<string[]>(["new", "used"]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const toggleCondition = (id: string) =>
    setConditions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError("");
    const room = MAX_REQUEST_IMAGES - images.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) setUploadError(`사진은 최대 ${MAX_REQUEST_IMAGES}장까지 올릴 수 있어요.`);

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of picked) {
      try {
        uploaded.push(await uploadImage(userId, file));
      } catch (e) {
        setUploadError(`업로드 실패: ${(e as Error).message}`);
      }
    }
    setImages((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }

  return (
    <form action={action} className="panel">
      <div className="panel-title">
        <h2>찾는 옷 정보</h2>
        <span>* 필수 입력</span>
      </div>

      <label className="upload-zone">
        <div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <strong>{uploading ? "업로드 중…" : "참고 이미지 추가하기"}</strong>
          <small>찾는 옷의 사진이나 비슷한 스타일 이미지를 올려주세요 · 최대 {MAX_REQUEST_IMAGES}장</small>
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          disabled={uploading || images.length >= MAX_REQUEST_IMAGES}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {uploadError && <p className="form-error mt-2">{uploadError}</p>}
      {images.length > 0 && (
        <div className="thumbs">
          {images.map((url) => (
            <div key={url} className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              <button
                type="button"
                aria-label="사진 빼기"
                onClick={() => setImages((prev) => prev.filter((x) => x !== url))}
              >
                ×
              </button>
              <input type="hidden" name="image_urls" value={url} />
            </div>
          ))}
        </div>
      )}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="category_id">카테고리 *</label>
          <select id="category_id" name="category_id" required defaultValue="">
            <option value="" disabled>
              선택해주세요
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="brand">브랜드</label>
          <input id="brand" name="brand" placeholder="예: OUR LEGACY, 빈티지" maxLength={50} />
        </div>
        <div className="field full">
          <label htmlFor="title">찾는 옷을 한 문장으로 *</label>
          <input id="title" name="title" required maxLength={100} placeholder="예: 20만 원 이하 가을 트렌치코트 찾아요" />
        </div>
        <div className="field">
          <label htmlFor="size">사이즈</label>
          <input id="size" name="size" placeholder="예: L / 허리 28–29" maxLength={50} />
        </div>
        <div className="field">
          <label htmlFor="budget_max">예산 *</label>
          <input id="budget_max" name="budget_max" type="number" min={1} step={1} required placeholder="최대 금액 (원)" />
        </div>
        <div className="field full">
          <label>상품 상태</label>
          <div className="checks">
            {REQUEST_CONDITIONS.map((c) => (
              <label key={c.id} className={`check-chip ${conditions.includes(c.id) ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  name="conditions"
                  value={c.id}
                  checked={conditions.includes(c.id)}
                  onChange={() => toggleCondition(c.id)}
                  className="sr-only"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div className="field full">
          <label htmlFor="body">추가로 원하는 특징</label>
          <textarea id="body" name="body" maxLength={2000} placeholder="색상, 핏, 소재, 실측 등 원하는 조건을 자유롭게 적어주세요." />
          <span className="field-help">“비슷한 상품도 괜찮아요”처럼 대체 가능 여부도 적어주세요.</span>
        </div>
      </div>

      <div className="privacy-note">
        <span>요청글은 누구나 볼 수 있어요. 연락처·주소는 적지 마세요. 판매자와는 DM으로 이야기할 수 있어요.</span>
      </div>
      {state?.error && <p className="form-error mt-4">{state.error}</p>}
      <div className="form-submit">
        <small>등록하면 이 카테고리를 관심 있게 보는 판매자에게 알림이 가요.</small>
        <button className="btn" disabled={pending || uploading}>
          {pending ? "등록 중…" : "요청 등록하기 ↗"}
        </button>
      </div>
    </form>
  );
}
