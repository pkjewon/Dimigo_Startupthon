import { createClient } from "@/lib/supabase/client";

// 브라우저에서 Storage images/<userId>/ 폴더로 바로 업로드하고 공개 URL 을 돌려줌
// (Vercel 함수 요청 크기 제한을 피하려고 서버를 거치지 않음)
export async function uploadImage(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

// 서버 action 에서 쓰는 검증: 본인 폴더에 올린 공개 URL 인지
export function isOwnImageUrl(url: string, userId: string) {
  return url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${userId}/`);
}
