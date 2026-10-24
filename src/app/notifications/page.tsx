import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { markAllRead, openNotification } from "./actions";

const LABELS: Record<string, string> = {
  new_request: "관심 카테고리에 새 요청글이 올라왔어요",
  new_proposal: "따라가는 요청글에 새 제안이 달렸어요",
  new_dm: "새 메시지가 도착했어요",
};

type NotificationRow = { id: number; type: string; target_id: number; is_read: boolean; created_at: string };

export default async function NotificationsPage() {
  const user = await requireUser(undefined, "/notifications");
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("notifications")
    .select("id, type, target_id, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<NotificationRow[]>();

  // 요청글 알림에는 글 제목을 같이 보여줌
  const requestIds = [...new Set((items ?? []).filter((n) => n.type !== "new_dm").map((n) => n.target_id))];
  const { data: requests } = requestIds.length
    ? await supabase.from("requests").select("id, title").in("id", requestIds)
    : { data: [] };
  const titleById = new Map((requests ?? []).map((r) => [r.id, r.title]));
  const unread = (items ?? []).filter((n) => !n.is_read).length;

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">NOTIFICATIONS</div>
          <h1>알림</h1>
          <p>안 읽은 알림 {unread}개</p>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="btn btn-light btn-sm">모두 읽음</button>
          </form>
        )}
      </div>
      <ul className="mx-auto mt-7 flex max-w-2xl flex-col gap-2">
        {items?.length === 0 && <li className="empty-state">알림이 없어요.</li>}
        {items?.map((n) => (
          <li key={n.id}>
            <form action={openNotification.bind(null, n.id)}>
              <button
                className={`panel flex w-full items-center justify-between gap-3 !py-4 text-left text-xs transition hover:border-[#aaa] ${n.is_read ? "text-muted" : ""}`}
              >
                <span className="flex items-center gap-2">
                  {!n.is_read && <span className="h-1.5 w-1.5 flex-none rounded-full bg-ink" />}
                  <span>
                    <span className={n.is_read ? "" : "font-semibold"}>{LABELS[n.type] ?? n.type}</span>
                    {titleById.get(n.target_id) && n.type !== "new_dm" && (
                      <span className="mt-1 block text-[11px] text-muted">{titleById.get(n.target_id)}</span>
                    )}
                  </span>
                </span>
                <span className="flex-none text-[10px] text-muted">{timeAgo(n.created_at)}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
