"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CATEGORIES, MAX_REQUEST_IMAGES, REQUEST_CONDITIONS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { isOwnImageUrl } from "@/lib/upload";

export async function createRequest(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("consumer");

  const categoryId = String(formData.get("category_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const size = String(formData.get("size") ?? "").trim() || null;
  const budget = Number(formData.get("budget_max"));
  const conditionIds = new Set<string>(REQUEST_CONDITIONS.map((c) => c.id));
  const conditions = formData.getAll("conditions").map(String).filter((c) => conditionIds.has(c));

  // 이미지는 브라우저에서 본인 폴더로 업로드한 공개 URL 만 허용
  const imageUrls = formData
    .getAll("image_urls")
    .map(String)
    .filter((url) => isOwnImageUrl(url, user.id))
    .slice(0, MAX_REQUEST_IMAGES);

  if (!CATEGORIES.some((c) => c.id === categoryId)) return { error: "카테고리를 선택해주세요." };
  if (!title) return { error: "찾는 옷을 한 문장으로 적어주세요." };
  if (title.length > 100) return { error: "제목은 100자 이내로 적어주세요." };
  if (!Number.isInteger(budget) || budget <= 0) return { error: "예산을 원 단위 숫자로 입력해주세요." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .insert({
      consumer_id: user.id,
      category_id: categoryId,
      title,
      body,
      brand,
      size,
      budget_max: budget,
      conditions,
      image_urls: imageUrls,
    })
    .select("id")
    .single();
  if (error) return { error: `등록하지 못했어요: ${error.message}` };

  redirect(`/requests/${data.id}?created=1`);
}
