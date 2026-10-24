"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { CATEGORIES, SELLER_TYPES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

function optionalUrl(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  return /^https?:\/\//.test(s) ? s : `https://${s}`;
}

export async function saveSellerProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("seller");

  const shopName = String(formData.get("shop_name") ?? "").trim();
  const sellerType = String(formData.get("seller_type") ?? "");
  const shopUrl = optionalUrl(formData.get("shop_url"));
  const locationUrl = optionalUrl(formData.get("location_url"));
  const categoryIds = new Set<string>(CATEGORIES.map((c) => c.id));
  const interests = formData.getAll("interest_categories").map(String).filter((id) => categoryIds.has(id));

  if (!shopName) return { error: "상호명을 입력해주세요." };
  if (!SELLER_TYPES.some((t) => t.id === sellerType)) return { error: "판매자 유형을 선택해주세요." };
  if (sellerType === "offline" && !locationUrl) return { error: "오프라인 매장은 매장 위치 링크가 필요해요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("seller_profiles")
    .update({
      shop_name: shopName,
      seller_type: sellerType,
      shop_url: shopUrl,
      location_url: locationUrl,
      is_subscribed: formData.get("is_subscribed") === "on",
      interest_categories: interests,
    })
    .eq("user_id", user.id);
  if (error) return { error: `저장하지 못했어요: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}
