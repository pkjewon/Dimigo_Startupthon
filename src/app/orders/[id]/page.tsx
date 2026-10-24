import Link from "next/link";
import { notFound } from "next/navigation";
import { RatingForm } from "@/components/rating-form";
import { requireUser } from "@/lib/auth";
import { won } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type OrderDetail = {
  id: number;
  consumer_id: string;
  amount: number;
  recipient_name: string | null;
  address: string | null;
  created_at: string;
  proposal: {
    request_id: number;
    product_name: string;
    image_url: string | null;
    seller_id: string;
    seller: { nickname: string; seller_profile: { shop_name: string; location_url: string | null } | null } | null;
  } | null;
};

// 결제 완료 화면 + 평점 남기기 (R-1)
export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const { paid } = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const user = await requireUser(undefined, `/orders/${id}`);

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, consumer_id, amount, recipient_name, address, created_at, proposal:proposals(request_id, product_name, image_url, seller_id, seller:profiles!seller_id(nickname, seller_profile:seller_profiles(shop_name, location_url)))",
    )
    .eq("id", id)
    .maybeSingle<OrderDetail>();
  if (!order?.proposal) notFound();

  const p = order.proposal;
  const shopName = p.seller?.seller_profile?.shop_name ?? p.seller?.nickname ?? "판매자";
  const isBuyer = user.id === order.consumer_id;
  const { data: myRating } = isBuyer
    ? await supabase.from("ratings").select("score").eq("consumer_id", user.id).eq("seller_id", p.seller_id).maybeSingle()
    : { data: null };

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">ORDER #{order.id}</div>
          <h1>{paid ? "결제가 완료됐어요" : "주문 상세"}</h1>
          <p>{new Date(order.created_at).toLocaleString("ko-KR")}</p>
        </div>
        <Link href={isBuyer ? "/me" : "/seller/dashboard"} className="btn btn-light btn-sm">
          {isBuyer ? "주문 내역" : "대시보드"}
        </Link>
      </div>
      <div className="mx-auto mt-7 flex max-w-2xl flex-col gap-3">
        <div className="panel flex gap-4">
          <div className="h-28 w-24 flex-none bg-soft">
            {p.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <Link href={`/sellers/${p.seller_id}`} className="text-[10px] text-muted underline">
              {shopName}
            </Link>
            <p className="mt-1 text-sm font-bold">{p.product_name}</p>
            <p className="mt-3 text-muted">
              {order.recipient_name} · {order.address}
            </p>
            <p className="mt-3 text-base font-bold">{won(order.amount)}</p>
          </div>
        </div>
        {isBuyer && <RatingForm sellerId={p.seller_id} shopName={shopName} myScore={myRating?.score ?? null} />}
        {p.seller?.seller_profile?.location_url && (
          <a href={p.seller.seller_profile.location_url} target="_blank" rel="noreferrer" className="btn btn-light">
            📍 {shopName} 매장 위치 보기
          </a>
        )}
      </div>
    </>
  );
}
