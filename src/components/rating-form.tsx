"use client";

import { useState, useTransition } from "react";
import { rateSeller } from "@/app/sellers/actions";

export function RatingForm({ sellerId, shopName, myScore }: { sellerId: string; shopName: string; myScore: number | null }) {
  const [score, setScore] = useState(myScore ?? 0);
  const [hover, setHover] = useState(0);
  const [saved, setSaved] = useState(myScore !== null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (value: number) => {
    setScore(value);
    setError("");
    startTransition(async () => {
      try {
        await rateSeller(sellerId, value);
        setSaved(true);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <h2>{shopName} 평점 남기기</h2>
        <span>{saved ? "저장됨 · 다시 누르면 수정" : "판매자당 1번"}</span>
      </div>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n}점`}
            disabled={pending}
            onMouseEnter={() => setHover(n)}
            onClick={() => submit(n)}
            className={`text-3xl leading-none transition ${n <= (hover || score) ? "text-ink" : "text-[#d0d1cd]"}`}
          >
            ★
          </button>
        ))}
      </div>
      {error && <p className="form-error mt-2">{error}</p>}
    </div>
  );
}
