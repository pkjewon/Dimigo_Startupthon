"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeWithAuth } from "@/lib/supabase/realtime";

// Realtime 이 끊겼을 때를 위한 보조 새로고침
const FALLBACK_POLL_MS = 60000;
const TOAST_MS = 5000;

const TOAST_TEXT: Record<string, string> = {
  new_request: "관심 카테고리에 새 요청글이 올라왔어요",
  new_proposal: "따라가는 요청글에 새 제안이 달렸어요",
  new_dm: "새 메시지가 도착했어요",
};

type Toast = { id: number; text: string; href: string };
type NotificationRow = { id: number; type: string; target_id: number; is_read: boolean };

// N-4: 안 읽은 알림 개수. Supabase Realtime 으로 새 알림이 오면 바로 갱신하고 토스트로 알려줌
export function NotificationBell({ userId, initialCount }: { userId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [toast, setToast] = useState<Toast | null>(null);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const { count } = await createClient()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (count !== null) setCount(count);
  }, [userId]);

  // 페이지를 옮길 때마다 (알림을 읽고 돌아온 경우 등) 개수 다시 확인
  useEffect(() => {
    const t = setTimeout(refresh, 0);
    return () => clearTimeout(t);
  }, [refresh, pathname]);

  useEffect(() => {
    const supabase = createClient();
    const timer = setInterval(refresh, FALLBACK_POLL_MS);

    const channelPromise = subscribeWithAuth(
      supabase,
      () =>
        supabase
          // 토픽 이름을 매번 다르게: 같은 이름이면 이전 채널의 leave 가 새 구독까지 끊을 수 있음
          .channel(`notifications:${userId}:${crypto.randomUUID()}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
            (payload) => {
              refresh();
              if (payload.eventType !== "INSERT") return;
              const n = payload.new as NotificationRow;
              // 지금 보고 있는 대화방의 DM 은 토스트 생략
              const href = n.type === "new_dm" ? `/dm/${n.target_id}` : `/requests/${n.target_id}`;
              if (window.location.pathname === href) return;
              setToast({ id: n.id, text: TOAST_TEXT[n.type] ?? "새 알림이 있어요", href });
            },
          ),
      "notifications",
    );

    return () => {
      clearInterval(timer);
      channelPromise.then((channel) => supabase.removeChannel(channel));
    };
  }, [userId, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <Link href="/notifications" className="icon-action" aria-label={`알림 ${count}개`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 && <span className="badge">{count > 99 ? "99+" : count}</span>}
      </Link>
      {toast && (
        <Link key={toast.id} href={toast.href} className="toast" role="status" onClick={() => setToast(null)}>
          <span className="toast-dot" />
          {toast.text}
          <span className="toast-go">보기 →</span>
        </Link>
      )}
    </>
  );
}
