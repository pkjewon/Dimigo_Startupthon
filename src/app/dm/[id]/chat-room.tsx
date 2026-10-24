"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Message = { id: number; sender_id: string; body: string; created_at: string };

const POLL_MS = 4000;

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

// 메시지 전송·조회는 브라우저에서 바로 (RLS 가 참여자만 허용), 새 메시지는 짧은 간격 폴링
export function ChatRoom({ threadId, userId, initialMessages }: { threadId: number; userId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(initialMessages.at(-1)?.id ?? 0);

  const append = (incoming: Message[]) => {
    const fresh = incoming.filter((m) => m.id > lastIdRef.current);
    if (!fresh.length) return;
    lastIdRef.current = fresh.at(-1)!.id;
    setMessages((prev) => [...prev, ...fresh]);
  };

  useEffect(() => {
    const supabase = createClient();
    const timer = setInterval(async () => {
      const { data } = await supabase
        .from("dm_messages")
        .select("id, sender_id, body, created_at")
        .eq("thread_id", threadId)
        .gt("id", lastIdRef.current)
        .order("id");
      if (data?.length) {
        append(data);
        // 보고 있는 대화방의 DM 알림은 바로 읽음 처리
        await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("type", "new_dm").eq("target_id", threadId);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
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
