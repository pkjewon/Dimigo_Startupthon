export const SERVICE_NAME = "flip";
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

// 매장 방문 예정 시간대
export const TIME_SLOTS = [
  { id: "morning", name: "오전" },
  { id: "afternoon", name: "오후" },
  { id: "evening", name: "저녁" },
] as const;

export function timeSlotName(id: string) {
  return TIME_SLOTS.find((t) => t.id === id)?.name ?? id;
}

// 사이트 내 결제 수수료 (표시용)
export const FEE_RATE = 0.05;

export const MAX_REQUEST_IMAGES = 5;

// ---------- 코디 모드 (supabase/migrations/0004_styling.sql) ----------
export const OCCASIONS = [
  { id: "daily", name: "일상", title: "데일리로 입을" },
  { id: "school", name: "학교·출근", title: "학교·출근용" },
  { id: "date", name: "데이트", title: "데이트에 입을" },
  { id: "travel", name: "여행", title: "여행에 입을" },
  { id: "special", name: "특별한 날", title: "특별한 날 입을" },
] as const;

export const TOP_SIZES = ["XS", "S", "M", "L", "XL", "2XL"] as const;

export const FITS = [
  { id: "over", name: "오버핏" },
  { id: "regular", name: "정핏" },
  { id: "slim", name: "슬림핏" },
  { id: "relaxed", name: "편한 핏" },
] as const;

export const STYLE_KEYWORDS = [
  { id: "minimal", name: "미니멀" },
  { id: "vintage", name: "빈티지" },
  { id: "street", name: "스트릿" },
  { id: "casual", name: "캐주얼" },
  { id: "classic", name: "클래식" },
  { id: "sporty", name: "스포티" },
] as const;

export const BUDGET_PRESETS = [100000, 200000, 300000, 500000] as const;

// 판매자 한 명이 한 코디에 묶을 수 있는 상품 수
export const LOOK_MIN_ITEMS = 2;
export const LOOK_MAX_ITEMS = 4;

export function occasionName(id: string) {
  return OCCASIONS.find((o) => o.id === id)?.name ?? id;
}

export function fitName(id: string) {
  return FITS.find((f) => f.id === id)?.name ?? id;
}

export function styleName(id: string) {
  return STYLE_KEYWORDS.find((s) => s.id === id)?.name ?? id;
}

export function conditionName(id: string | null) {
  return PROPOSAL_CONDITIONS.find((c) => c.id === id)?.name ?? null;
}

// 코디 요청 제목: "데이트에 입을 미니멀 코디"
export function stylingTitle(occasion: string, styles: string[]) {
  const phrase = OCCASIONS.find((o) => o.id === occasion)?.title ?? "";
  const style = styles[0] ? `${styleName(styles[0])} ` : "";
  return `${phrase} ${style}코디`.trim();
}
