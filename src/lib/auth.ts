import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

// 한 요청 안에서는 한 번만 조회
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, nickname")
    .eq("id", userId)
    .single();
  return profile as Profile | null;
});

// 역할별 첫 화면: 판매자는 대시보드, 소비자는 요청글 피드
export function roleHome(role: Role) {
  return role === "seller" ? "/seller/dashboard" : "/";
}

export async function requireUser(role?: Role, next?: string): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  // 다른 역할 전용 화면이면 내 역할의 첫 화면으로
  if (role && user.role !== role) redirect(roleHome(user.role));
  return user;
}
