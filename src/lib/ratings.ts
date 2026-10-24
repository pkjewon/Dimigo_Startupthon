import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Rating = { avg_score: number; rating_count: number };

// 제안 목록에 판매자 평균 평점을 붙임
export async function attachRatings<T extends { seller_id: string }>(supabase: Supabase, rows: T[]) {
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
  const { data } = sellerIds.length
    ? await supabase.from("seller_ratings").select("seller_id, avg_score, rating_count").in("seller_id", sellerIds)
    : { data: [] };
  const bySeller = new Map<string, Rating>((data ?? []).map((r) => [r.seller_id, r]));
  return rows.map((r) => ({ ...r, rating: bySeller.get(r.seller_id) ?? null }));
}

// 제안 + 판매자 정보 (+ 코디면 상품 목록)
export const PROPOSAL_SELECT =
  "*, items:look_items(*), seller:profiles!seller_id(nickname, seller_profile:seller_profiles(shop_name, seller_type, is_subscribed))";
