"use client";

import { useActionState, useState } from "react";
import { LockNote } from "@/components/styling-profile";
import {
  BUDGET_PRESETS,
  CATEGORIES,
  FITS,
  MAX_REQUEST_IMAGES,
  OCCASIONS,
  STYLE_KEYWORDS,
  stylingTitle,
  TOP_SIZES,
} from "@/lib/constants";
import { uploadImage } from "@/lib/upload";
import { createStylingRequest } from "./actions";

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export function StylingForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(createStylingRequest, undefined);
  const [occasion, setOccasion] = useState("daily");
  const [budget, setBudget] = useState("200000");
  const [category, setCategory] = useState("outer");
  const [height, setHeight] = useState("168");
  const [topSize, setTopSize] = useState("M");
  const [bottomSize, setBottomSize] = useState("28–29 / M");
  const [fit, setFit] = useState("regular");
  const [styles, setStyles] = useState<string[]>(["minimal"]);
  const [pieces, setPieces] = useState<string[]>(["top", "bottom"]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

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
    <div className="two-col">
      <form action={action} className="panel">
        <div className="panel-title">
          <h2>나에게 맞는 코디 요청</h2>
          <span>약 2분</span>
        </div>

        <input type="hidden" name="occasion" value={occasion} />
        <input type="hidden" name="category_id" value={category} />
        {styles.map((s) => (
          <input key={s} type="hidden" name="styles" value={s} />
        ))}
        {pieces.map((p) => (
          <input key={p} type="hidden" name="pieces" value={p} />
        ))}
        {images.map((url) => (
          <input key={url} type="hidden" name="image_urls" value={url} />
        ))}

        <section className="form-section">
          <div className="section-label">
            <span>01</span>
            <div>
              <strong>어디에 입고 갈까요?</strong>
              <small>상황과 예산을 알려주시면 코디 방향을 잡기 쉬워요.</small>
            </div>
          </div>
          <div className="split-label">
            <span>입을 상황</span>
          </div>
          <div className="choice-grid">
            {OCCASIONS.map((o) => (
              <button key={o.id} type="button" className={`choice ${occasion === o.id ? "selected" : ""}`} onClick={() => setOccasion(o.id)}>
                {o.name}
              </button>
            ))}
          </div>
          <div className="split-label">
            <span>코디 전체 예산</span>
            <small>상품 전부를 합친 최대 금액</small>
          </div>
          <div className="budget-row">
            <div className="suffix-input">
              <input
                name="budget_max"
                type="number"
                min={10000}
                step={10000}
                required
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                aria-label="코디 전체 예산"
              />
              <span>원</span>
            </div>
            <div className="budget-presets">
              {BUDGET_PRESETS.map((b) => (
                <button key={b} type="button" className={`preset ${budget === String(b) ? "selected" : ""}`} onClick={() => setBudget(String(b))}>
                  {b / 10000}만원
                </button>
              ))}
            </div>
          </div>
          <div className="split-label">
            <span>중심 카테고리</span>
            <small>이 분야 판매자에게 먼저 알림이 가요</small>
          </div>
          <div className="checks">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className={`style-chip ${category === c.id ? "selected" : ""}`} onClick={() => setCategory(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </section>

        <section className="form-section">
          <div className="section-label">
            <span>02</span>
            <div>
              <strong>내 체형과 평소 사이즈</strong>
              <small>몸무게나 전신 사진 없이, 평소 입는 사이즈만으로 충분해요.</small>
            </div>
          </div>
          <div className="profile-grid">
            <div className="field">
              <label htmlFor="height_cm">키</label>
              <div className="suffix-input">
                <input id="height_cm" name="height_cm" type="number" min={120} max={220} required value={height} onChange={(e) => setHeight(e.target.value)} />
                <span>cm</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="top_size">평소 상의 사이즈</label>
              <select id="top_size" name="top_size" value={topSize} onChange={(e) => setTopSize(e.target.value)}>
                {TOP_SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="bottom_size">평소 하의 사이즈</label>
              <input id="bottom_size" name="bottom_size" required maxLength={30} value={bottomSize} onChange={(e) => setBottomSize(e.target.value)} placeholder="예: 28–29 / M" />
            </div>
            <div className="field">
              <label htmlFor="fit">좋아하는 핏</label>
              <select id="fit" name="fit" value={fit} onChange={(e) => setFit(e.target.value)}>
                {FITS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-label">
            <span>03</span>
            <div>
              <strong>원하는 분위기를 골라주세요</strong>
              <small>여러 개 골라도 괜찮아요.</small>
            </div>
          </div>
          <div className="split-label">
            <span>스타일</span>
          </div>
          <div className="checks">
            {STYLE_KEYWORDS.map((s) => (
              <button key={s.id} type="button" className={`style-chip ${styles.includes(s.id) ? "selected" : ""}`} onClick={() => setStyles((prev) => toggle(prev, s.id))}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="split-label">
            <span>코디에 넣을 품목</span>
            <small>2개 이상</small>
          </div>
          <div className="checks">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className={`piece-chip ${pieces.includes(c.id) ? "selected" : ""}`} onClick={() => setPieces((prev) => toggle(prev, c.id))}>
                <i>{pieces.includes(c.id) ? "✓" : ""}</i>
                {c.name}
              </button>
            ))}
          </div>
          <div className="split-label">
            <span>더 알려주고 싶은 점</span>
            <small>선택</small>
          </div>
          <div className="field">
            <textarea name="body" maxLength={2000} placeholder="예: 차분한 색 위주였으면 좋겠어요. 너무 붙거나 짧은 옷은 피하고 싶어요." />
          </div>
          <div className="split-label">
            <span>참고 이미지</span>
            <small>최대 {MAX_REQUEST_IMAGES}장 · 선택</small>
          </div>
          <label className="upload-zone !min-h-[110px]">
            <div>
              <strong>{uploading ? "업로드 중…" : "원하는 무드의 사진 추가"}</strong>
              <small>내 사진이 아니어도 괜찮아요. 마음에 드는 코디 사진을 올려주세요.</small>
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
                  <button type="button" aria-label="사진 빼기" onClick={() => setImages((prev) => prev.filter((x) => x !== url))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-5">
          <LockNote>
            <b>키와 사이즈는 판매자에게만 보여요.</b> 다른 소비자에게는 요청 제목과 설명만 보여요.
          </LockNote>
        </div>
        {state?.error && <p className="form-error mt-4">{state.error}</p>}
        <div className="form-submit">
          <small>
            &ldquo;{stylingTitle(occasion, styles)}&rdquo; 요청으로 올라가요.
          </small>
          <button className="btn" disabled={pending || uploading || pieces.length < 2}>
            {pending ? "올리는 중…" : "코디 요청하기 →"}
          </button>
        </div>
      </form>

      <aside className="side-panel sticky-side">
        <section className="fit-card">
          <div className="fit-card-top">
            <small>MY FIT PROFILE</small>
            <span className="lock-pill">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="3" y="7" width="10" height="8" rx="1" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" />
              </svg>
              판매자에게만 공개
            </span>
          </div>
          <div className="person-wrap">
            <svg viewBox="0 0 100 160" fill="none" aria-hidden="true">
              <circle cx="50" cy="18" r="11" stroke="currentColor" strokeWidth="2" />
              <path
                d="M35 38c-9 3-14 10-15 19l-4 28c-.5 4 2 7 5 7s5-2 6-6l4-18v27l-3 43c-.3 6 2 9 7 9s7-4 8-9l5-32 5 32c1 5 3 9 8 9s7-3 7-9l-3-43V68l4 18c1 4 3 6 6 6s5-3 5-7l-4-28c-1-9-6-16-15-19-8-3-18-3-26 0Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="m38 45 12 11 12-11" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </div>
          <div className="fit-stats">
            <div className="fit-stat">
              <small>키</small>
              <strong>{height || "—"} cm</strong>
            </div>
            <div className="fit-stat">
              <small>상의</small>
              <strong>{topSize}</strong>
            </div>
            <div className="fit-stat">
              <small>하의</small>
              <strong className="truncate">{bottomSize.split("/")[0].trim() || "—"}</strong>
            </div>
          </div>
          <div className="fit-mood">
            <small>좋아하는 핏</small>
            <strong>{FITS.find((f) => f.id === fit)?.name}</strong>
          </div>
        </section>
        <div className="tip-card">
          <h3>요청을 올리면</h3>
          <p>
            중심 카테고리를 관심 있게 보는 매장과 판매자에게 알림이 가요. 판매자가 실제로 팔고 있는 상품 2~4개로 한 벌을 묶어 보내주면, 상품별 가격과 사이즈를 비교해서 고를 수 있어요.
          </p>
        </div>
      </aside>
    </div>
  );
}
