import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type ThreadRow = {
  id: number;
  created_at: string;
  consumer: { nickname: string } | null;
  seller: { nickname: string; seller_profile: { shop_name: string } | null } | null;
  proposal: { product_name: string } | null;
  dm_messages: { body: string; created_at: string }[];
};

// D-3: DM 목록
export default async function DmListPage() {
  const user = await requireUser(undefined, "/dm");
  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("dm_threads")
    .select(
      "id, created_at, consumer:profiles!consumer_id(nickname), seller:profiles!seller_id(nickname, seller_profile:seller_profiles(shop_name)), proposal:proposals(product_name), dm_messages(body, created_at)",
    )
    .order("created_at", { referencedTable: "dm_messages", ascending: false })
    .limit(1, { referencedTable: "dm_messages" })
    .returns<ThreadRow[]>();

  // 최근 메시지 순
  const sorted = [...(threads ?? [])].sort((a, b) =>
    (b.dm_messages[0]?.created_at ?? b.created_at).localeCompare(a.dm_messages[0]?.created_at ?? a.created_at),
  );

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">MESSAGES</div>
          <h1>메시지</h1>
          <p>
            {user.role === "consumer"
              ? "제안 댓글의 \"문의하기\"로 판매자와 대화를 시작할 수 있어요."
              : "소비자가 문의를 시작하면 여기서 답장할 수 있어요."}
          </p>
        </div>
      </div>
      <ul className="mx-auto mt-7 flex max-w-2xl flex-col gap-2">
        {sorted.length === 0 && <li className="empty-state">아직 대화가 없어요.</li>}
        {sorted.map((t) => {
          const other =
            user.role === "consumer"
              ? (t.seller?.seller_profile?.shop_name ?? t.seller?.nickname ?? "판매자")
              : (t.consumer?.nickname ?? "소비자");
          const last = t.dm_messages[0];
          return (
            <li key={t.id}>
              <Link href={`/dm/${t.id}`} className="panel flex items-center gap-3 !py-4 transition hover:border-[#aaa]">
                <span className="avatar">{other[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">
                    {other}
                    {t.proposal && <span className="ml-2 font-normal text-muted">· {t.proposal.product_name}</span>}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-muted">{last?.body ?? "아직 메시지가 없어요."}</span>
                </span>
                <span className="flex-none text-[10px] text-muted">{timeAgo(last?.created_at ?? t.created_at)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
