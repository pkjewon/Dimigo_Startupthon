// 알림 종류별 문구와 이동할 곳 (알림 목록·토스트·알림 클릭 처리에서 같이 씀)
export const NOTIFICATION_TEXT: Record<string, string> = {
  new_request: "관심 카테고리에 새 요청글이 올라왔어요",
  new_proposal: "따라가는 요청글에 새 제안이 달렸어요",
  new_dm: "새 메시지가 도착했어요",
  new_visit: "매장 방문 예정 손님이 생겼어요",
  visit_confirmed: "매장에서 방문 예정을 확인했어요",
};

export function notificationHref(type: string, targetId: number) {
  if (type === "new_dm") return `/dm/${targetId}`;
  if (type === "new_visit") return "/seller/dashboard#visits";
  if (type === "visit_confirmed") return "/me#visits";
  return `/requests/${targetId}`;
}

// 대상이 요청글인 알림 (목록에서 글 제목을 같이 보여줌)
export function isRequestNotification(type: string) {
  return type === "new_request" || type === "new_proposal";
}
