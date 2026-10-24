"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// N-4: 알림을 누르면 읽음 처리하고 해당 글(또는 대화방)로 이동
export async function openNotification(id: number) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("type, target_id")
    .single();
  if (!data) redirect("/notifications");
  redirect(data.type === "new_dm" ? `/dm/${data.target_id}` : `/requests/${data.target_id}`);
}

export async function markAllRead() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  revalidatePath("/", "layout");
}
