import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { won } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom, type Message } from "./chat-room";

type ThreadDetail = {
  id: number;
  consumer_id: string;
  seller_id: string;
  consumer: { nickname: string } | null;
  seller: { nickname: string; seller_profile: { shop_name: string; location_url: string | null } | null } | null;
  proposal: { id: number; request_id: number; product_name: string; price: number; image_url: string | null } | null;
};

export default async function DmThreadPage({ params, searchParams }: PageProps<"/dm/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const user = await requireUser(undefined, `/dm/${id}`);
  const supabase = await createClient();

  // RLS 때문에 참여자가 아니면 조회 결과가 없음
  const { data: thread } = await supabase
    .from("dm_threads")
    .select(
      "id, consumer_id, seller_id, consumer:profiles!consumer_id(nickname), seller:profiles!seller_id(nickname, seller_profile:seller_profiles(shop_name, location_url)), proposal:proposals(id, request_id, product_name, price, image_url)",
    )
    .eq("id", id)
    .maybeSingle<ThreadDetail>();
  if (!thread) notFound();

  // 같은 판매자와 다른 제안으로 문의하면 그 제안을 보여줌
  let proposal = thread.proposal;
  const proposalParam = Number(query.proposal);
  if (Number.isInteger(proposalParam) && proposalParam !== proposal?.id) {
    const { data } = await supabase
      .from("proposals")
      .select("id, request_id, product_name, price, image_url")
      .eq("id", proposalParam)
      .eq("seller_id", thread.seller_id)
      .maybeSingle();
    if (data) proposal = data;
  }

  const [{ data: messages }] = await Promise.all([
    supabase.from("dm_messages").select("id, sender_id, body, created_at").eq("thread_id", id).order("created_at").returns<Message[]>(),
    // 이 대화방의 DM 알림은 읽음 처리
    supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("type", "new_dm").eq("target_id", id),
  ]);

  const otherName =
    user.id === thread.consumer_id
      ? (thread.seller?.seller_profile?.shop_name ?? thread.seller?.nickname ?? "판매자")
      : (thread.consumer?.nickname ?? "소비자");

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">MESSAGES</div>
          <h1>{otherName}</h1>
          {thread.seller?.seller_profile?.location_url && (
            <p>
              <a href={thread.seller.seller_profile.location_url} target="_blank" rel="noreferrer" className="underline">
                📍 매장 위치 보기
              </a>
            </p>
          )}
        </div>
        <Link href="/dm" className="btn btn-light btn-sm">
          ← 메시지 목록
        </Link>
      </div>
      <div className="mx-auto mt-7 max-w-2xl">
        {proposal && (
          <Link href={`/requests/${proposal.request_id}`} className="panel mb-3 flex items-center gap-3 !py-3">
            {proposal.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proposal.image_url} alt="" className="h-14 w-12 flex-none object-cover" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] text-muted">문의 중인 상품</span>
              <span className="block truncate text-xs font-bold">{proposal.product_name}</span>
            </span>
            <strong className="text-sm">{won(proposal.price)}</strong>
          </Link>
        )}
        <ChatRoom threadId={thread.id} userId={user.id} initialMessages={messages ?? []} />
      </div>
    </>
  );
}
