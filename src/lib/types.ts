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
  created_at: string;
};

// 폼 server action 의 반환 상태
export type FormState = { error?: string; ok?: boolean } | undefined;
