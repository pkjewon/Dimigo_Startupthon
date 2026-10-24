export type Role = "consumer" | "seller";

export type Profile = {
  id: string;
  role: Role;
  nickname: string;
};

export type SellerProfile = {
  user_id: string;
  shop_name: string;
  seller_type: "online" | "offline" | "individual";
  shop_url: string | null;
  location_url: string | null;
  is_subscribed: boolean;
  interest_categories: string[];
};

export type Request = {
  kind: "item" | "styling";
  id: number;
  consumer_id: string;
  category_id: string;
  title: string;
  body: string;
  brand: string | null;
  size: string | null;
  budget_max: number;
  conditions: string[];
  image_urls: string[];
  created_at: string;
};

export type Proposal = {
  id: number;
  request_id: number;
  seller_id: string;
  product_name: string;
  price: number;
  condition: string | null;
  size_info: string | null;
  description: string;
  image_url: string | null;
  product_url: string | null;
  location_url: string | null;
  is_look: boolean;
  created_at: string;
};

export type Visit = {
  id: number;
  proposal_id: number;
  visit_date: string; // YYYY-MM-DD
  time_slot: "morning" | "afternoon" | "evening";
  note: string;
  status: "planned" | "confirmed" | "cancelled";
};

// 폼 server action 의 반환 상태
export type FormState = { error?: string; ok?: boolean } | undefined;

// 코디 요청의 체형·취향 정보 (요청자 본인과 판매자에게만 조회됨)
export type StylingProfile = {
  request_id: number;
  occasion: string;
  height_cm: number;
  top_size: string;
  bottom_size: string;
  fit: string;
  styles: string[];
  pieces: string[];
};

export type LookItem = {
  id: number;
  position: number;
  category_id: string;
  product_name: string;
  price: number;
  condition: string | null;
  size_info: string | null;
  product_url: string | null;
};
