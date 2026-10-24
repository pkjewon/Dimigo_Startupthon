"use client";

import { useActionState, useState } from "react";
import { signup } from "../actions";

const ROLES = [
  { id: "consumer", title: "소비자", desc: "원하는 옷을 요청하고 제안을 받아요" },
  { id: "seller", title: "판매자", desc: "요청을 보고 내 상품을 제안해요" },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [role, setRole] = useState<string>("consumer");

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="field">
        <label>역할</label>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <label
              key={r.id}
              className={`cursor-pointer border p-3 transition ${role === r.id ? "border-ink bg-soft" : "border-line bg-white"}`}
            >
              <input
                type="radio"
                name="role"
                value={r.id}
                checked={role === r.id}
                onChange={() => setRole(r.id)}
                className="sr-only"
              />
              <strong className="block text-xs text-ink">{r.title}</strong>
              <span className="mt-1 block text-[10px] font-normal leading-relaxed text-muted">{r.desc}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="nickname">{role === "seller" ? "상호명" : "닉네임"}</label>
        <input id="nickname" name="nickname" required maxLength={30} />
      </div>
      <div className="field">
        <label htmlFor="email">이메일</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required />
        <span className="field-help">6자 이상</span>
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      <button className="btn mt-2" disabled={pending}>
        {pending ? "가입 중…" : "가입하기"}
      </button>
    </form>
  );
}
