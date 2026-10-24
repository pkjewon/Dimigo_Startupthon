"use client";

import { useOptimistic, useTransition } from "react";
import { setWatch } from "./actions";

export function WatchToggle({ requestId, notify, isOwner }: { requestId: number; notify: boolean; isOwner: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(notify);
  const [, startTransition] = useTransition();

  return (
    <div className="panel flex items-center justify-between gap-4">
      <div>
        <h2 className="text-sm font-bold">새 제안 알림</h2>
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          {isOwner ? "내 요청글에 제안이 달리면 알려드려요." : "다른 사람의 요청글도 따라갈 수 있어요. 제안이 달리면 알려드려요."}
        </p>
      </div>
      <label className="toggle" aria-label="새 제안 알림">
        <input
          type="checkbox"
          checked={optimistic}
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(async () => {
              setOptimistic(next);
              await setWatch(requestId, next);
            });
          }}
        />
        <span />
      </label>
    </div>
  );
}
