# Flip (역방향 패션 쇼핑)

소비자가 원하는 옷을 요청하면 판매자가 댓글로 상품을 제안하는 웹 서비스. 기획은 [PRD.md](PRD.md), 디자인 시안은 [motif-market.html](motif-market.html).

## 기술 스택
Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 / Supabase (Postgres, Auth, Storage) / Vercel

## 처음 세팅
1. `.env.local` 에 Supabase URL·publishable key 넣기 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
2. Supabase 대시보드 > SQL Editor 에서 [supabase/migrations](supabase/migrations) 의 파일을 번호 순서대로 실행 (0001 → 0004)
3. Supabase 대시보드 > Authentication > Sign In / Providers > Email 에서 **Confirm email 끄기** (시연용, 가입 즉시 로그인)
4. `npm install` → `npm run dev` → http://localhost:3000
5. (선택) 시연용 데이터 넣기: `node supabase/seed.mjs` → 계정 정보는 `supabase/demo-accounts.local.md` (커밋 안 됨)

## 폴더 구조
```
src/
  app/
    (auth)/login, signup     로그인·회원가입(역할 선택)
    page.tsx                 메인 요청글 피드 + 카테고리 필터 + 검색
    requests/new             요청글 작성 (소비자)
    requests/[id]            요청글 상세 + 제안 목록 (코디 요청이면 코디 목록)
    styling                  코디 모드: 소비자는 체형·취향으로 코디 요청, 판매자는 상품 2~4개로 코디 제안
    seller/settings          판매자 설정 (유형·링크·관심 카테고리·구독 토글)
    seller/dashboard         판매자 대시보드 (관심 카테고리 요청, 내 제안, 주문·수수료)
    sellers/[id]             판매자 프로필 + 평점
    notifications            알림 목록 (누르면 읽음 처리)
    dm, dm/[id]              DM 목록·대화 (소비자만 시작)
    checkout/[proposalId]    모의 결제
    orders/[id]              결제 완료 + 평점 남기기
    me                       마이페이지 (내 요청, 주문, 알림 켠 글)
  components/                헤더, 요청 카드, 제안 카드
  lib/
    supabase/                서버·브라우저 클라이언트
    auth.ts                  현재 사용자 조회, 역할 체크
    constants.ts             서비스명, 카테고리, 상태값, 수수료율
  proxy.ts                   세션 쿠키 갱신
supabase/migrations/         스키마 + RLS + 알림 트리거
```

## 규칙 (DB에서 강제)
- 요청글은 소비자만, 제안 댓글은 판매자만 작성 (RLS)
- DM은 소비자만 시작 (RLS)
- 요청글 작성 시 작성자 Watch 자동 생성 + 관심 카테고리 판매자에게 알림 (트리거)
- 제안 작성 시 Watch(notify=true) 사용자에게 알림, 오프라인 매장은 위치 링크 자동 첨부 (트리거)
- 주문 금액·수수료(5%)는 서버 트리거가 계산
- 코디 요청의 키·사이즈(styling_profiles)는 요청자 본인과 판매자만 조회 (RLS)
- 코디 요청에는 코디 제안만, 일반 요청에는 일반 제안만 (트리거), 코디 총액은 요청 예산 이내 (create_look 함수)
