"use client";

import { useActionState, useState } from "react";
import { placeOrder } from "./actions";

const PAY_METHODS = ["신용·체크카드", "계좌이체", "간편결제"];

export function CheckoutForm({ proposalId, defaultName }: { proposalId: number; defaultName: string }) {
  const [state, action, pending] = useActionState(placeOrder, undefined);
  const [method, setMethod] = useState(PAY_METHODS[0]);

  return (
    <form action={action} className="panel">
      <input type="hidden" name="proposal_id" value={proposalId} />
      <div className="panel-title">
        <h2>배송 정보</h2>
        <span>* 필수 입력</span>
      </div>
      <div className="form-grid !mt-0">
        <div className="field">
          <label htmlFor="recipient_name">받는 분 *</label>
          <input id="recipient_name" name="recipient_name" defaultValue={defaultName} required maxLength={30} />
        </div>
        <div className="field full">
          <label htmlFor="address">주소 *</label>
          <input id="address" name="address" required maxLength={120} placeholder="예: 경기도 안산시 단원구 사세충열로 94" />
          <span className="field-help">시연용이라 아무 주소나 적어도 돼요.</span>
        </div>
      </div>

      <div className="panel-title mt-8">
        <h2>결제 수단</h2>
        <span>모의 결제</span>
      </div>
      <div className="checks">
        {PAY_METHODS.map((m) => (
          <label key={m} className={`check-chip ${method === m ? "selected" : ""}`}>
            <input
              type="radio"
              name="pay_method"
              value={m}
              checked={method === m}
              onChange={() => setMethod(m)}
              className="sr-only"
            />
            {m}
          </label>
        ))}
      </div>
      <div className="privacy-note">
        <span>실제 결제는 일어나지 않아요. 카드번호 같은 결제 정보도 받지 않아요.</span>
      </div>

      {state?.error && <p className="form-error mt-4">{state.error}</p>}
      <div className="form-submit">
        <small>결제하면 주문 내역에 저장돼요.</small>
        <button className="btn" disabled={pending}>
          {pending ? "결제 중…" : "결제하기"}
        </button>
      </div>
    </form>
  );
}
