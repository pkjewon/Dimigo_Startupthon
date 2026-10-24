import { createClient } from "@/lib/supabase/client";

const MAX_SIDE = 1600; // 긴 변 기준 최대 픽셀
const SKIP_BELOW = 800 * 1024; // 이보다 작고 이미 작은 사진은 그대로 올림
const JPEG_QUALITY = 0.85;

// 휴대폰 사진(3~8MB)이 Storage 한도(5MB)에 걸리지 않도록 브라우저에서 줄여서 JPEG 로 다시 인코딩
// GIF(움직임 유지)나 브라우저가 못 여는 형식은 원본 그대로 둠
async function shrink(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  let bitmap: ImageBitmap;
  try {
    // imageOrientation: 휴대폰 사진의 EXIF 회전값 반영
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SKIP_BELOW) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // 투명 PNG 가 검게 나오지 않도록 흰 배경
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

// 브라우저에서 Storage images/<userId>/ 폴더로 바로 업로드하고 공개 URL 을 돌려줌
// (Vercel 함수 요청 크기 제한을 피하려고 서버를 거치지 않음)
export async function uploadImage(userId: string, original: File): Promise<string> {
  const file = await shrink(original);
  if (file.size > 5 * 1024 * 1024) throw new Error("사진이 너무 커요 (5MB 이하로 올려주세요)");

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
