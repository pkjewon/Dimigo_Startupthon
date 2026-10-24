"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  CATEGORIES,
  FITS,
  LOOK_MAX_ITEMS,
  LOOK_MIN_ITEMS,
  MAX_REQUEST_IMAGES,
  OCCASIONS,
  PROPOSAL_CONDITIONS,
  STYLE_KEYWORDS,
  stylingTitle,
  TOP_SIZES,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { isOwnImageUrl } from "@/lib/upload";

const categoryIds = new Set<string>(CATEGORIES.map((c) => c.id));

function optionalUrl(value: unknown) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return /^https?:\/\//.test(s) ? s : `https://${s}`;
}

// 소비자: 체형·상황·취향을 담은 코디 요청
export async function createStylingRequest(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("consumer");

  const occasion = String(formData.get("occasion") ?? "");
  const budget = Number(formData.get("budget_max"));
  const categoryId = String(formData.get("category_id") ?? "");
  const height = Number(formData.get("height_cm"));
  const topSize = String(formData.get("top_size") ?? "");
  const bottomSize = String(formData.get("bottom_size") ?? "").trim();
  const fit = String(formData.get("fit") ?? "");
  const styleIds = new Set<string>(STYLE_KEYWORDS.map((s) => s.id));
  const styles = formData.getAll("styles").map(String).filter((s) => styleIds.has(s));
  const pieces = [...new Set(formData.getAll("pieces").map(String).filter((p) => categoryIds.has(p)))];
  const body = String(formData.get("body") ?? "").trim();
  const imageUrls = formData
    .getAll("image_urls")
    .map(String)
    .filter((url) => isOwnImageUrl(url, user.id))
    .slice(0, MAX_REQUEST_IMAGES);

  if (!OCCASIONS.some((o) => o.id === occasion)) return { error: "어떤 상황에 입을지 골라주세요." };
  if (!Number.isInteger(budget) || budget <= 0) return { error: "예산을 원 단위 숫자로 입력해주세요." };
  if (!categoryIds.has(categoryId)) return { error: "요청을 받을 중심 카테고리를 골라주세요." };
  if (!Number.isInteger(height) || height < 120 || height > 220) return { error: "키를 120~220cm 사이로 입력해주세요." };
  if (!(TOP_SIZES as readonly string[]).includes(topSize)) return { error: "평소 상의 사이즈를 골라주세요." };
  if (!bottomSize || bottomSize.length > 30) return { error: "평소 하의 사이즈를 적어주세요." };
  if (!FITS.some((f) => f.id === fit)) return { error: "선호하는 핏을 골라주세요." };
  if (pieces.length < 2) return { error: "코디에 넣을 품목을 2개 이상 골라주세요." };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_styling_request", {
    p_category_id: categoryId,
    p_title: stylingTitle(occasion, styles),
    p_body: body,
    p_budget_max: budget,
    p_image_urls: imageUrls,
    p_occasion: occasion,
    p_height_cm: height,
    p_top_size: topSize,
    p_bottom_size: bottomSize,
    p_fit: fit,
    p_styles: styles,
    p_pieces: pieces,
  });
  if (error) return { error: `등록하지 못했어요: ${error.message}` };

  redirect(`/requests/${id}?created=1`);
}

type LookItemInput = {
  category_id: string;
  product_name: string;
  price: number;
  condition: string;
  size_info: string;
  product_url: string;
};

// 판매자: 내 상품 2~4개로 묶은 코디 제안 (총액·예산 확인은 DB 함수가 한 번 더 함)
export async function createLook(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("seller");

  const requestId = Number(formData.get("request_id"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "");

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "상품 정보를 읽지 못했어요." };
  }
  if (!Array.isArray(raw)) return { error: "상품 정보를 읽지 못했어요." };

  const conditionIds = new Set<string>(PROPOSAL_CONDITIONS.map((c) => c.id));
  const items: LookItemInput[] = raw.map((it: Record<string, unknown>) => ({
    category_id: String(it.category_id ?? ""),
    product_name: String(it.product_name ?? "").trim().slice(0, 80),
    price: Number(it.price),
    condition: conditionIds.has(String(it.condition)) ? String(it.condition) : "",
    size_info: String(it.size_info ?? "").trim().slice(0, 60),
    product_url: optionalUrl(it.product_url),
  }));

  if (!Number.isInteger(requestId)) return { error: "잘못된 요청글이에요." };
  if (!title) return { error: "코디 이름을 적어주세요." };
  if (!description) return { error: "이 코디를 고른 이유를 적어주세요." };
  if (items.length < LOOK_MIN_ITEMS || items.length > LOOK_MAX_ITEMS)
    return { error: `상품 ${LOOK_MIN_ITEMS}~${LOOK_MAX_ITEMS}개로 코디를 구성해주세요.` };
  for (const [i, it] of items.entries()) {
    if (!it.product_name) return { error: `${i + 1}번 상품명을 적어주세요.` };
    if (!categoryIds.has(it.category_id)) return { error: `${i + 1}번 상품의 카테고리를 골라주세요.` };
    if (!Number.isInteger(it.price) || it.price <= 0) return { error: `${i + 1}번 상품 가격을 원 단위 숫자로 적어주세요.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_look", {
    p_request_id: requestId,
    p_title: title.slice(0, 80),
    p_description: description.slice(0, 1000),
    p_image_url: imageUrl && isOwnImageUrl(imageUrl, user.id) ? imageUrl : "",
    p_items: items,
  });
  if (error) return { error: `코디를 보내지 못했어요: ${error.message}` };

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/styling");
  return { ok: true };
}
