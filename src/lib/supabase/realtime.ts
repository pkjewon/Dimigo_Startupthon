import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// Realtime 소켓이 로그인 토큰 없이(anon 키로) 붙으면 RLS 때문에 이벤트가 하나도 안 옴.
// @supabase/ssr 브라우저 클라이언트는 세션을 쿠키에서 비동기로 읽으므로, 구독 전에 토큰을 직접 넣어줌
export async function subscribeWithAuth(supabase: SupabaseClient, build: () => RealtimeChannel, label: string) {
  const { data } = await supabase.auth.getSession();
  if (data.session) await supabase.realtime.setAuth(data.session.access_token);

  return build().subscribe((status, err) => {
    // CLOSED 는 페이지를 떠날 때 정상적으로 생김
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn(`[realtime] ${label}`, status, err?.message ?? "");
  });
}
