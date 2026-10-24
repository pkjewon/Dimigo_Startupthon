-- =====================================================================
-- 0002_realtime: 알림·DM 을 즉시 받도록 Realtime 에 테이블 등록
-- Realtime 도 RLS 를 따르므로 본인 알림, 참여 중인 대화방 메시지만 전달됨
-- =====================================================================

alter publication supabase_realtime add table public.notifications, public.dm_messages;
