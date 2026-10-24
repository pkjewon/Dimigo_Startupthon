"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

// B-2, B-3: 모의 결제. 금액·수수료는 DB 트리거가 제안 가격 기준으로 계산
export async function placeOrder(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("consumer");
  const proposalId = Number(formData.get("proposal_id"));
  const recipient = String(formData.get("recipient_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!Number.isInteger(proposalId)) return { error: "잘못된 상품이에요." };
  if (!recipient || !address) return { error: "받는 분과 주소를 입력해주세요." };
  if (!formData.get("pay_method")) return { error: "결제 수단을 골라주세요." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({ consumer_id: user.id, proposal_id: proposalId, recipient_name: recipient, address })
    .select("id")
    .single();
  if (error) return { error: `결제하지 못했어요: ${error.message}` };

  redirect(`/orders/${data.id}?paid=1`);
}
