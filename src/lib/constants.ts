// 서비스 이름은 미정. 정해지면 여기만 바꾸면 됨
export const SERVICE_NAME = "WANTED";
export const SERVICE_TAGLINE = "원하는 옷을 말하면, 판매자가 찾아와요";

// DB categories 테이블과 같은 값 (supabase/migrations/0001_init.sql)
export const CATEGORIES = [
  { id: "top", name: "상의", hint: "후드 · 셔츠 · 니트" },
  { id: "bottom", name: "하의", hint: "데님 · 팬츠 · 쇼츠" },
  { id: "outer", name: "아우터", hint: "코트 · 재킷 · 가디건" },
  { id: "dress", name: "원피스·스커트", hint: "원피스 · 스커트" },
  { id: "shoes", name: "신발", hint: "스니커즈 · 부츠 · 로퍼" },
  { id: "bag", name: "가방", hint: "숄더 · 토트 · 백팩" },
  { id: "acc", name: "액세서리", hint: "모자 · 머플러 · 주얼리" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function categoryName(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

// 요청글의 원하는 상품 상태 (시안 기준)
export const REQUEST_CONDITIONS = [
  { id: "new", name: "새 상품" },
  { id: "used", name: "중고 가능" },
  { id: "vintage", name: "빈티지" },
  { id: "sealed", name: "미개봉만" },
] as const;

export function requestConditionName(id: string) {
  return REQUEST_CONDITIONS.find((c) => c.id === id)?.name ?? id;
}

// 제안 상품의 상태
export const PROPOSAL_CONDITIONS = [
  { id: "new", name: "새 상품" },
  { id: "unused", name: "미사용" },
  { id: "used_a", name: "중고 · A" },
  { id: "used_b", name: "중고 · B" },
] as const;

export const SELLER_TYPES = [
  { id: "online", name: "온라인 쇼핑몰" },
  { id: "offline", name: "오프라인 매장" },
  { id: "individual", name: "개인" },
] as const;

export function sellerTypeName(id: string) {
  return SELLER_TYPES.find((t) => t.id === id)?.name ?? id;
}

// 사이트 내 결제 수수료 (표시용)
export const FEE_RATE = 0.05;

export const MAX_REQUEST_IMAGES = 5;
