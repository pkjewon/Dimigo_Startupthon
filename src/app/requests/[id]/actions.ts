"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PROPOSAL_CONDITIONS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { isOwnImageUrl } from "@/lib/upload";

function optionalUrl(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  return /^https?:\/\//.test(s) ? s : `https://${s}`;
}

// C-1, C-2: 판매자의 상품 제안 댓글
export async function createProposal(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("seller");

  const requestId = Number(formData.get("request_id"));
  const productName = String(formData.get("product_name") ?? "").trim();
  const price = Number(formData.get("price"));
  const condition = String(formData.get("condition") ?? "");
  const sizeInfo = String(formData.get("size_info") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "");

  if (!Number.isInteger(requestId)) return { error: "잘못된 요청글이에요." };
  if (!productName) return { error: "상품명을 입력해주세요." };
  if (!Number.isInteger(price) || price <= 0) return { error: "가격을 원 단위 숫자로 입력해주세요." };
  if (!PROPOSAL_CONDITIONS.some((c) => c.id === condition)) return { error: "상품 상태를 선택해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("proposals").insert({
    request_id: requestId,
    seller_id: user.id,
    product_name: productName,
    price,
    condition,
    size_info: sizeInfo,
    description,
    image_url: imageUrl && isOwnImageUrl(imageUrl, user.id) ? imageUrl : null,
    product_url: optionalUrl(formData.get("product_url")),
    // 비워두면 오프라인 매장은 DB 트리거가 프로필의 매장 위치를 채움
    location_url: optionalUrl(formData.get("location_url")),
  });
  if (error) return { error: `제안을 보내지 못했어요: ${error.message}` };

  revalidatePath(`/requests/${requestId}`);
  return { ok: true };
}

// N-2, N-3: 글별 댓글 알림 켜기/끄기 (내 글이든 남의 글이든)
export async function setWatch(requestId: number, notify: boolean) {
  const user = await requireUser("consumer");
  const supabase = await createClient();
  const { error } = await supabase
    .from("watches")
    .upsert({ user_id: user.id, request_id: requestId, notify }, { onConflict: "user_id,request_id" });
  if (error) throw new Error(error.message);
  revalidatePath(`/requests/${requestId}`);
}

// D-1, D-2: 소비자만 문의 시작. 같은 판매자와는 대화방 하나
export async function startDm(sellerId: string, proposalId: number) {
  const user = await requireUser("consumer");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("dm_threads")
    .select("id")
    .eq("consumer_id", user.id)
    .eq("seller_id", sellerId)
    .maybeSingle();

  let threadId = existing?.id;
  if (!threadId) {
    const { data, error } = await supabase
      .from("dm_threads")
      .insert({ consumer_id: user.id, seller_id: sellerId, proposal_id: proposalId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    threadId = data.id;
  }
  redirect(`/dm/${threadId}?proposal=${proposalId}`);
}
