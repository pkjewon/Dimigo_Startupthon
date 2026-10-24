"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// R-1: 로그인한 소비자는 판매자에게 1번 평점 (다시 주면 점수 수정)
export async function rateSeller(sellerId: string, score: number) {
  const user = await requireUser("consumer");
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error("평점은 1~5점이에요.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("ratings")
    .upsert({ consumer_id: user.id, seller_id: sellerId, score }, { onConflict: "consumer_id,seller_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
