export function won(amount: number) {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "2026-10-26" → "10/26(일)" (날짜만 있는 값이라 시간대 영향 없이 계산)
export function shortDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d}(${WEEKDAYS[day]})`;
}

// 서버(UTC)에서도 한국 날짜 기준 오늘 "YYYY-MM-DD"
export function todayKst() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}
