"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { TIME_SLOTS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

// DB 트리거가 던지는 메시지를 사용자용 문구로
function friendly(message: string) {
  if (message.includes("in the past")) return "지난 날짜는 고를 수 없어요.";
  if (message.includes("only offline")) return "오프라인 매장 제안에만 방문 예정을 남길 수 있어요.";
  return `저장하지 못했어요: ${message}`;
}

// 소비자: 오프라인 매장 제안에 방문 예정 남기기 (같은 상품이면 날짜·시간 갱신)
export async function planVisit(proposalId: number, visitDate: string, timeSlot: string, note: string): Promise<Result> {
  const user = await requireUser("consumer");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return { error: "방문 날짜를 골라주세요." };
  if (!TIME_SLOTS.some((t) => t.id === timeSlot)) return { error: "시간대를 골라주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("visits").upsert(
    {
      consumer_id: user.id,
      proposal_id: proposalId,
      visit_date: visitDate,
      time_slot: timeSlot,
      note: note.trim().slice(0, 200),
      status: "planned",
    },
    { onConflict: "consumer_id,proposal_id" },
  );
  if (error) return { error: friendly(error.message) };

  revalidatePath("/", "layout");
  return {};
}

export async function cancelVisit(visitId: number): Promise<Result> {
  const user = await requireUser("consumer");
  const supabase = await createClient();
  const { error } = await supabase.from("visits").update({ status: "cancelled" }).eq("id", visitId).eq("consumer_id", user.id);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/", "layout");
  return {};
}

// 매장: 방문 예정 확인 → 소비자에게 알림
export async function confirmVisit(visitId: number) {
  const user = await requireUser("seller");
  const supabase = await createClient();
  await supabase.from("visits").update({ status: "confirmed" }).eq("id", visitId).eq("seller_id", user.id);
  revalidatePath("/seller/dashboard");
}
