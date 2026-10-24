"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeWithAuth } from "@/lib/supabase/realtime";

export type Message = { id: number; sender_id: string; body: string; created_at: string };

// Realtime 이 끊겼을 때를 위한 보조 새로고침
const FALLBACK_POLL_MS = 15000;

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

// id 기준으로 합치고 정렬 (Realtime·전송 응답·폴링 어느 쪽으로 와도 한 번만 표시)
function merge(prev: Message[], incoming: Message[]) {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// 메시지 전송·조회는 브라우저에서 바로 (RLS 가 참여자만 허용), 새 메시지는 Supabase Realtime 으로 즉시 받음
export function ChatRoom({ threadId, userId, initialMessages }: { threadId: number; userId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(initialMessages.at(-1)?.id ?? 0);

  const append = (incoming: Message[]) => {
    if (!incoming.length) return;
    lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((m) => m.id));
    setMessages((prev) => merge(prev, incoming));
  };

  useEffect(() => {
    const supabase = createClient();
    // 보고 있는 대화방의 DM 알림은 바로 읽음 처리
    // (Supabase 쿼리는 await 해야 실제로 실행됨)
    const markRead = async () => {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("type", "new_dm").eq("target_id", threadId);
    };

    const channelPromise = subscribeWithAuth(
      supabase,
      () =>
        supabase
          // 토픽 이름을 매번 다르게: 같은 이름이면 이전 채널의 leave 가 새 구독까지 끊을 수 있음
          .channel(`dm:${threadId}:${crypto.randomUUID()}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
            (payload) => {
              const m = payload.new as Message & { thread_id: number };
              append([{ id: m.id, sender_id: m.sender_id, body: m.body, created_at: m.created_at }]);
              if (m.sender_id !== userId) markRead();
            },
          ),
      "dm",
    );

    const timer = setInterval(async () => {
      const { data } = await supabase
        .from("dm_messages")
        .select("id, sender_id, body, created_at")
        .eq("thread_id", threadId)
        .gt("id", lastIdRef.current)
        .order("id");
      if (data?.length) {
        append(data);
        markRead();
      }
    }, FALLBACK_POLL_MS);

    return () => {
      clearInterval(timer);
      channelPromise.then((channel) => supabase.removeChannel(channel));
    };
  }, [threadId, userId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    const { data, error } = await createClient()
      .from("dm_messages")
      .insert({ thread_id: threadId, sender_id: userId, body: text })
      .select("id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error) {
      setError(`보내지 못했어요: ${error.message}`);
      return;
    }
    setBody("");
    append([data]);
  }

  return (
    <div className="chat">
      <div ref={listRef} className="chat-list">
        {messages.length === 0 && <p className="m-auto text-xs text-muted">첫 메시지를 보내 대화를 시작해보세요.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-row ${m.sender_id === userId ? "mine" : ""}`}>
            <p className="chat-bubble">{m.body}</p>
            <span className="chat-time">{timeLabel(m.created_at)}</span>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="chat-form">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="메시지를 입력하세요"
          aria-label="메시지"
        />
        <button className="btn btn-sm" disabled={sending || !body.trim()}>
          보내기
        </button>
      </form>
      {error && <p className="form-error mt-2">{error}</p>}
    </div>
  );
}
