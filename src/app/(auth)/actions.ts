"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

// 외부 주소로 튕기지 않도록 내부 경로만 허용
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "이메일 또는 비밀번호가 맞지 않아요." };

  redirect(safeNext(formData.get("next")));
}

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  if (!email || !password || !nickname) return { error: "모든 항목을 입력해주세요." };
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 해요." };
  if (role !== "consumer" && role !== "seller") return { error: "역할을 선택해주세요." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, nickname } },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "이미 가입된 이메일이에요." };
    return { error: `가입에 실패했어요: ${error.message}` };
  }
  if (!data.session) {
    // Supabase 의 Confirm email 설정이 켜져 있으면 세션이 바로 안 생김
    return { error: "가입은 됐지만 이메일 인증이 필요해요. (시연용이면 Supabase에서 Confirm email 을 꺼주세요)" };
  }

  redirect(role === "seller" ? "/seller/settings?welcome=1" : "/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
