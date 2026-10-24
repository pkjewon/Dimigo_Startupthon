import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SellerProfile } from "@/lib/types";
import { SellerSettingsForm } from "./settings-form";

export default async function SellerSettingsPage({ searchParams }: PageProps<"/seller/settings">) {
  const user = await requireUser("seller", "/seller/settings");
  const { welcome } = await searchParams;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single<SellerProfile>();

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">FOR SELLER / SETTINGS</div>
          <h1>판매자 설정</h1>
          <p>
            {welcome
              ? "가입을 환영해요! 관심 카테고리를 고르면 새 요청글이 올라올 때 알림을 받아요."
              : "프로필과 알림 받을 카테고리를 관리해요."}
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-2xl pt-7">
        {profile ? <SellerSettingsForm profile={profile} /> : <p className="empty-state">판매자 프로필을 찾을 수 없어요.</p>}
      </div>
    </>
  );
}
