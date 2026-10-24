"use client";

import { useState, useTransition } from "react";
import { cancelVisit, planVisit } from "@/app/visits/actions";
import { TIME_SLOTS, timeSlotName } from "@/lib/constants";
import { shortDate } from "@/lib/format";
import type { Visit } from "@/lib/types";

// 오늘부터 7일 (브라우저 = 한국 시간 기준)
function nextDays(count = 7) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { ymd, label: i === 0 ? "오늘" : i === 1 ? "내일" : shortDate(ymd) };
  });
}

// 오프라인 매장 제안에 "방문 예정" 남기기 (온라인에서 찾은 손님을 매장으로)
export function VisitButton({ proposalId, shopName, visit }: { proposalId: number; shopName: string; visit: Visit | null }) {
  const active = visit && visit.status !== "cancelled" ? visit : null;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(active?.visit_date ?? "");
  const [slot, setSlot] = useState<string>(active?.time_slot ?? "afternoon");
  const [note, setNote] = useState(active?.note ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const days = nextDays();

  const submit = () =>
    startTransition(async () => {
      setError("");
      const res = await planVisit(proposalId, date, slot, note);
      if (res.error) setError(res.error);
      else setOpen(false);
    });

  const cancel = () =>
    startTransition(async () => {
      const res = await cancelVisit(active!.id);
      if (res.error) setError(res.error);
    });

  return (
    <>
      {active ? (
        <span className="visit-pill">
          📍 {shortDate(active.visit_date)} {timeSlotName(active.time_slot)} 방문 예정
          <b>{active.status === "confirmed" ? "매장 확인 ✓" : "확인 대기"}</b>
          <button type="button" onClick={() => setOpen(true)} disabled={pending}>
            변경
          </button>
          <button type="button" onClick={cancel} disabled={pending}>
            취소
          </button>
        </span>
      ) : (
        <button type="button" className="btn btn-light btn-sm" onClick={() => setOpen(true)}>
          📍 방문 예정
        </button>
      )}

      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <button className="modal-close" aria-label="닫기" onClick={() => setOpen(false)}>
              ×
            </button>
            <div className="section-kicker">VISIT THE STORE</div>
            <h2>{shopName} 방문 예정</h2>
            <p className="mb-5 text-[11px] leading-relaxed text-muted">
              언제 들를지 알려주면 매장에서 상품을 준비해둘 수 있어요. 매장이 확인하면 알림으로 알려드려요.
            </p>

            <div className="field">
              <label>날짜</label>
              <div className="checks">
                {days.map((d) => (
                  <button
                    key={d.ymd}
                    type="button"
                    className={`check-chip ${date === d.ymd ? "selected" : ""}`}
                    onClick={() => setDate(d.ymd)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field mt-4">
              <label>시간대</label>
              <div className="checks">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`check-chip ${slot === t.id ? "selected" : ""}`}
                    onClick={() => setSlot(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="field mt-4">
              <label htmlFor={`visit-note-${proposalId}`}>매장에 남길 말 (선택)</label>
              <input
                id={`visit-note-${proposalId}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="예: M 사이즈로 입어보고 싶어요"
              />
            </div>

            {error && <p className="form-error mt-4">{error}</p>}
            <div className="form-submit">
              <small>{date ? `${shortDate(date)} ${timeSlotName(slot)}에 방문` : "날짜를 골라주세요"}</small>
              <button className="btn" onClick={submit} disabled={pending || !date}>
                {pending ? "저장 중…" : "방문 예정 남기기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
