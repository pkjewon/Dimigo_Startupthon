// 시연용 데이터 (PRD 8장 + 예시 보강)
// 소비자 4, 판매자 6 (온라인 3·오프라인 2·개인 1, 그중 구독 1), 요청글 22개 + 코디 요청 5개, 제안·코디, DM·주문·평점 예시
// 실행: node supabase/seed.mjs   (.env.local 의 Supabase URL·키 사용, Confirm email 이 꺼져 있어야 함)
// 계정 비밀번호는 supabase/demo-accounts.local.md 에 저장 (gitignore).
// 다시 실행해도 됨: 있는 계정은 로그인, 있는 글은 사진·시간만 맞추고, DM·주문·평점은 중복 생성하지 않음
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ACCOUNTS_FILE = path.join(root, "supabase", "demo-accounts.local.md");

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=80`;
// 사진을 직접 내려받아 확인하고 고른 것만 사용 (시안의 일부 사진은 설명과 내용이 달랐음)
const IMG = {
  sneakersRed: img("1542291026-7eec264c27ff"), // 빨간 러닝화
  sneakersGrey: img("1460353581641-37baddab0fa2"), // 그레이 나이키 러닝화
  sneakersWhite: img("1608231387042-66d1773070a5"), // 화이트 퓨마 스니커즈
  sneakersPastel: img("1595950653106-6c9ebd614d3a"), // 파스텔 에어포스
  sneakersTan: img("1549298916-b41d501d3772"), // 탄 컬러 에어포스
  pantsSneakers: img("1544441893-675973e31985"), // 팬츠 + 화이트 스니커즈 플랫레이
  heelsWhite: img("1535043934128-cf0b28d52f95"), // 화이트 펌프스
  leather: img("1551028719-00167b16eac5"), // 블랙 레더 재킷
  leatherMan: img("1520975954732-35dd22299614"), // 레더 재킷 입은 남자
  bomber: img("1591047139829-d91aecb6caea"), // 살구색 봄버 재킷
  denimJacket: img("1611312449408-fcece27cdbb7"), // 데님 재킷
  sweat: img("1556821840-3a63f95609a7"), // 그레이 후드
  sweatWhite: img("1620799140408-edc6dcb6d633"), // 화이트 스웻셔츠
  sweatOrange: img("1578587018452-892bacefd3f2"), // 오렌지 스웻셔츠
  knit: img("1434389677669-e08b4cac3105"), // 크림 니트
  knitFlatlay: img("1556905055-8f358a7a47b2"), // 니트 비니·스웨터 플랫레이
  tee: img("1521572163474-6864f9cf17ab"), // 화이트 티셔츠
  teeBlack: img("1583743814966-8936f5b7be1a"), // 블랙 티셔츠
  teeGraphic: img("1576566588028-4147f3842f27"), // 그래픽 티셔츠
  teeGraphicLook: img("1503342217505-b0a15ec3261c"), // 그래픽 티 코디
  shirtDenim: img("1596755094514-f87e34085b2c"), // 블루 셔츠
  tracksuit: img("1515886657613-9f3515b0c78f"), // 옐로 트레이닝 세트
  denim: img("1541099649105-f69ad21f3246"), // 데님 팬츠
  denimStack: img("1542272604-787c3835535d"), // 청바지 여러 벌
  denimBlack: img("1624378439575-d8705ad7ae80"), // 블랙 데님
  skirt: img("1583496661160-fb5886a0aaaa"), // 블랙 플레어 스커트 코디
  dressRed: img("1572804013309-59a88b7e92f1"), // 레드 플라워 원피스
  dressLong: img("1595777457583-95e059d581b8"), // 레드 롱 원피스
  bag: img("1584917865442-de89df76afd3"), // 레드 핸드백
  bagBlack: img("1548036328-c9fa89d128fa"), // 블랙 퀼팅 체인백
  bagWicker: img("1590874103328-eac38a683ce7"), // 오렌지 라탄백
  backpackNavy: img("1553062407-98eeb64c6a62"), // 네이비 백팩
  backpackLeather: img("1622560480605-d83c853bc5c3"), // 브라운 가죽 백팩
  capGrey: img("1521369909029-2afed882baee"), // 워싱 그레이 볼캡
  capWhite: img("1588850561407-ed78c282e89b"), // 화이트 볼캡
  necklace: img("1611652022419-a9419f74343d"), // 골드 목걸이
  jewelry: img("1606760227091-3dd870d97f1d"), // 골드 주얼리 모음
  rack: img("1490481651871-ab68de25d43d"), // 옷걸이에 걸린 옷들
};

const CONSUMERS = [
  { key: "c1", email: "demo.consumer1@example.com", nickname: "jiyoon.archive" },
  { key: "c2", email: "demo.consumer2@example.com", nickname: "moodboard_m" },
  { key: "c3", email: "demo.consumer3@example.com", nickname: "hyeon.zip" },
  { key: "c4", email: "demo.consumer4@example.com", nickname: "sohee.daily" },
];
const SELLERS = [
  { key: "online1", email: "demo.seller.online1@example.com", nickname: "ARCHIVE ROOM", seller_type: "online", is_subscribed: true, shop_url: "https://example.com/archive-room", interest_categories: ["top", "bottom", "outer", "acc", "bag"] },
  { key: "online2", email: "demo.seller.online2@example.com", nickname: "SECOND FORM", seller_type: "online", is_subscribed: false, shop_url: "https://example.com/second-form", interest_categories: ["top", "dress", "bag", "shoes"] },
  { key: "online3", email: "demo.seller.online3@example.com", nickname: "DAILY BASIC", seller_type: "online", is_subscribed: false, shop_url: "https://example.com/daily-basic", interest_categories: ["top", "bottom", "outer", "dress", "shoes", "acc"] },
  // 시연 시나리오 1번: 관심 카테고리 "아우터" 오프라인 매장
  { key: "offline", email: "demo.seller.offline@example.com", nickname: "성수 무드샵", seller_type: "offline", is_subscribed: false, location_url: "https://map.naver.com/p/search/%EC%84%B1%EC%88%98%EB%8F%99%20%ED%8E%B8%EC%A7%91%EC%88%8D", interest_categories: ["outer", "top", "bottom"] },
  { key: "offline2", email: "demo.seller.offline2@example.com", nickname: "홍대 빈티지랩", seller_type: "offline", is_subscribed: false, location_url: "https://map.naver.com/p/search/%ED%99%8D%EB%8C%80%20%EB%B9%88%ED%8B%B0%EC%A7%80", interest_categories: ["top", "bottom", "shoes", "bag", "acc"] },
  { key: "personal", email: "demo.seller.personal@example.com", nickname: "민지의 옷장", seller_type: "individual", is_subscribed: false, interest_categories: ["dress", "bag", "acc", "shoes"] },
];

// 시연 시나리오의 트렌치코트 요청은 발표 때 새로 쓰므로 넣지 않음
// hoursAgo: 피드가 자연스러워 보이도록 작성 시각을 흩어 놓음
const REQUESTS = [
  {
    by: "c2", hoursAgo: 3, category_id: "top", title: "90년대 빈티지 나이키 스웻셔츠 찾아요", brand: "NIKE", size: "L–XL", budget_max: 100000,
    conditions: ["used", "vintage"], image_urls: [IMG.sweat],
    body: "90년대 느낌의 박시한 핏. 프린팅이 과하지 않은 그레이나 네이비면 좋겠어요.",
    proposals: [
      { by: "online1", product_name: "90s Nike 센터 스우시 크루넥 (그레이)", price: 92000, condition: "used_a", size_info: "L / 가슴 62cm", description: "목 늘어남 없음, 세탁 완료.", image_url: IMG.sweat, product_url: "https://example.com/archive-room/nike-crew" },
      { by: "offline", product_name: "빈티지 나이키 네이비 스웻셔츠", price: 78000, condition: "used_b", size_info: "XL", description: "매장에서 직접 입어볼 수 있어요. 소매 끝 약간 보풀.", image_url: IMG.sweatOrange },
      { by: "online2", product_name: "나이키 클럽 플리스 크루 (새 상품)", price: 69000, condition: "new", size_info: "L", description: "빈티지는 아니지만 비슷한 핏의 새 상품이에요.", image_url: IMG.sweatWhite, product_url: "https://example.com/second-form/club-crew" },
    ],
  },
  {
    by: "c1", hoursAgo: 6, category_id: "bottom", title: "아워레가시 써드컷 데님 허리 28–29", brand: "OUR LEGACY", size: "28–29", budget_max: 220000,
    conditions: ["new", "used"], image_urls: [IMG.denim],
    body: "블루 계열, 밑단 수선 없는 제품으로 찾고 있어요. 실측 같이 보내주세요.",
    proposals: [
      { by: "online1", product_name: "OUR LEGACY Third Cut Digital Denim", price: 198000, condition: "unused", size_info: "29 / 허리 39cm", description: "택 있는 미사용 제품.", image_url: IMG.denim, product_url: "https://example.com/archive-room/third-cut" },
      { by: "offline", product_name: "써드컷 데님 워시드 블루", price: 165000, condition: "used_a", size_info: "28 / 총장 104cm", description: "밑단 수선 없음. 매장 방문 시 피팅 가능.", image_url: IMG.denimStack },
    ],
  },
  {
    by: "c2", hoursAgo: 9, category_id: "shoes", title: "살로몬 XT-6 오프화이트 260 구해요", brand: "SALOMON", size: "260", budget_max: 250000,
    conditions: ["new", "used"], image_urls: [IMG.sneakersGrey],
    body: "박스 없어도 괜찮아요. 밑창 상태 좋은 제품이면 중고도 OK.",
    proposals: [
      { by: "online2", product_name: "Salomon XT-6 Vanilla Ice", price: 239000, condition: "new", size_info: "260", description: "정품 새 상품, 박스 포함.", image_url: IMG.sneakersWhite, product_url: "https://example.com/second-form/xt6" },
      { by: "personal", product_name: "XT-6 오프화이트 (3회 착용)", price: 165000, condition: "used_a", size_info: "260", description: "밑창 거의 새것. 박스 없음.", image_url: IMG.sneakersGrey },
    ],
  },
  {
    by: "c1", hoursAgo: 14, category_id: "bag", title: "브라운 미니 숄더백 (빈티지 OK)", brand: null, size: null, budget_max: 300000,
    conditions: ["used", "vintage"], image_urls: [IMG.bagWicker],
    body: "작은 사이즈, 브라운 계열. 모서리 까짐이 심하지 않은 제품을 찾아요.",
    proposals: [
      { by: "personal", product_name: "빈티지 레더 숄더백 브라운", price: 145000, condition: "used_b", size_info: "가로 24cm", description: "모서리 살짝 사용감. 정품 증빙 사진 있어요.", image_url: IMG.bag },
      { by: "online2", product_name: "미니 레더 숄더백 (카멜)", price: 128000, condition: "new", size_info: "가로 22cm", description: "새 상품, 소가죽.", image_url: IMG.bagWicker, product_url: "https://example.com/second-form/mini-bag" },
      { by: "online1", product_name: "90s 빈티지 숄더백 다크브라운", price: 285000, condition: "used_a", size_info: "가로 25cm", description: "상태 A, 더스트백 포함.", image_url: IMG.bag, product_url: "https://example.com/archive-room/vintage-bag" },
    ],
  },
  {
    by: "c2", hoursAgo: 20, category_id: "acc", title: "로고 작은 그레이 울 머플러", brand: "ACNE STUDIOS", size: null, budget_max: 180000,
    conditions: ["new", "used"], image_urls: [IMG.knitFlatlay],
    body: "그레이 멜란지, 로고가 크게 보이지 않는 제품이면 좋겠어요.",
    proposals: [
      { by: "online1", product_name: "Acne Studios Canada 머플러 그레이", price: 175000, condition: "unused", size_info: "200×30cm", description: "미사용, 택 포함.", image_url: null, product_url: "https://example.com/archive-room/canada" },
      { by: "personal", product_name: "울 머플러 그레이 멜란지 (무로고)", price: 39000, condition: "used_a", size_info: "180×30cm", description: "브랜드 없지만 촉감 좋아요.", image_url: IMG.knitFlatlay },
    ],
  },
  {
    by: "c1", hoursAgo: 26, category_id: "dress", title: "가을 하객룩 미디 원피스", brand: null, size: "S–M", budget_max: 150000,
    conditions: ["new"], image_urls: [IMG.rack],
    body: "차분한 컬러(네이비, 브라운), 무릎 아래 기장. 다음 달 결혼식에 입을 거예요.",
    proposals: [
      { by: "online2", product_name: "플리츠 미디 원피스 네이비", price: 119000, condition: "new", size_info: "S / 총장 115cm", description: "구김 적은 소재.", image_url: null, product_url: "https://example.com/second-form/pleats" },
      { by: "personal", product_name: "브라운 니트 원피스 (1회 착용)", price: 58000, condition: "used_a", size_info: "M", description: "한 번 입고 드라이했어요.", image_url: IMG.rack },
    ],
  },
  {
    by: "c1", hoursAgo: 31, category_id: "outer", title: "90s 블랙 레더 블루종, 어깨 48cm 내외", brand: null, size: "M–L", budget_max: 190000,
    conditions: ["used", "vintage"], image_urls: [IMG.leather],
    body: "너무 슬림하지 않은 핏. 사용감 적은 제품이면 좋겠어요.",
    proposals: [
      { by: "offline", product_name: "빈티지 레더 블루종 블랙", price: 155000, condition: "used_a", size_info: "L / 어깨 48cm", description: "성수 매장에 있어요. 직접 입어보고 결정하세요!", image_url: IMG.leather },
      { by: "online1", product_name: "90s Leather Blouson", price: 189000, condition: "used_a", size_info: "M / 어깨 47cm", description: "가죽 관리 완료.", image_url: IMG.leatherMan, product_url: "https://example.com/archive-room/blouson" },
      { by: "personal", product_name: "레더 자켓 블랙 (보세)", price: 70000, condition: "used_b", size_info: "M", description: "소매에 약간 생활 기스.", image_url: IMG.leather },
    ],
  },
  {
    by: "c2", hoursAgo: 40, category_id: "top", title: "부드러운 그레이 모헤어 가디건", brand: null, size: "M", budget_max: 120000,
    conditions: ["new", "used"], image_urls: [IMG.knit],
    body: "까슬거리지 않는 소재. 오버핏도 괜찮아요.",
    proposals: [
      { by: "offline", product_name: "모헤어 블렌드 가디건 그레이", price: 98000, condition: "new", size_info: "Free", description: "매장 인기 상품, 3가지 컬러.", image_url: IMG.knit },
      { by: "online2", product_name: "소프트 니트 가디건", price: 74000, condition: "new", size_info: "M", description: "울 30% 블렌드.", image_url: IMG.knitFlatlay, product_url: "https://example.com/second-form/cardigan" },
    ],
  },
  // ---- 예시 보강 ----
  {
    by: "c3", hoursAgo: 1, category_id: "top", title: "오버핏 그래픽 반팔티 (90s 무드)", brand: null, size: "XL", budget_max: 50000,
    conditions: ["new", "used", "vintage"], image_urls: [IMG.teeGraphic],
    body: "프린트가 너무 크지 않고 레트로한 느낌이면 좋아요. 여름에 데님이랑 입을 거예요.",
    proposals: [
      { by: "online3", product_name: "레트로 그래픽 오버핏 티", price: 29000, condition: "new", size_info: "XL / 총장 76cm", description: "코튼 100%, 세탁 후 수축 적어요.", image_url: IMG.teeGraphic, product_url: "https://example.com/daily-basic/graphic-tee" },
      { by: "offline2", product_name: "90s 밴드 티셔츠 블랙 (빈티지)", price: 45000, condition: "used_a", size_info: "L–XL", description: "홍대 매장에 비슷한 빈티지 티 30장 넘게 있어요.", image_url: IMG.teeBlack },
      { by: "online2", product_name: "스켈레톤 프린트 크롭 티", price: 32000, condition: "new", size_info: "Free", description: "크롭 기장이라 하이웨이스트랑 잘 어울려요.", image_url: IMG.teeGraphicLook, product_url: "https://example.com/second-form/skeleton-tee" },
    ],
  },
  {
    by: "c3", hoursAgo: 4, category_id: "bottom", title: "블랙 와이드 데님 허리 30", brand: null, size: "30", budget_max: 90000,
    conditions: ["new", "used"], image_urls: [IMG.denimBlack],
    body: "물 빠짐 적은 진한 블랙, 통 넓은 스트레이트나 와이드 핏 찾아요.",
    proposals: [
      { by: "online1", product_name: "와이드 블랙 데님 (원워시)", price: 89000, condition: "new", size_info: "30 / 밑단 26cm", description: "원워시라 물빠짐 거의 없어요.", image_url: IMG.denimBlack, product_url: "https://example.com/archive-room/black-wide" },
      { by: "offline2", product_name: "리바이스 550 블랙 (빈티지)", price: 55000, condition: "used_a", size_info: "W30 L32", description: "매장에서 기장 수선도 해드려요.", image_url: IMG.denimStack },
      { by: "online3", product_name: "데일리 와이드 데님 블랙", price: 39000, condition: "new", size_info: "30", description: "가성비 좋은 기본 와이드핏.", image_url: null, product_url: "https://example.com/daily-basic/wide-denim" },
    ],
  },
  {
    by: "c3", hoursAgo: 8, category_id: "shoes", title: "출근용 깔끔한 화이트 스니커즈 270", brand: null, size: "270", budget_max: 120000,
    conditions: ["new"], image_urls: [IMG.sneakersWhite],
    body: "로고 크지 않고 슬랙스에도 어울리는 미니멀한 디자인이면 좋겠어요.",
    proposals: [
      { by: "online2", product_name: "퓨마 코트 클래식 화이트", price: 89000, condition: "new", size_info: "270", description: "가죽 갑피, 정사이즈.", image_url: IMG.sneakersWhite, product_url: "https://example.com/second-form/puma-court" },
      { by: "online3", product_name: "미니멀 레더 스니커즈", price: 59000, condition: "new", size_info: "270", description: "로고 없는 올 화이트.", image_url: IMG.pantsSneakers, product_url: "https://example.com/daily-basic/minimal-sneakers" },
      { by: "offline2", product_name: "나이키 에어맥스 그레이 (2회 착용)", price: 70000, condition: "used_a", size_info: "270", description: "화이트는 아니지만 회색 톤이라 출근룩에도 무난해요.", image_url: IMG.sneakersGrey },
    ],
  },
  {
    by: "c3", hoursAgo: 52, category_id: "acc", title: "데일리로 할 심플한 골드 목걸이", brand: null, size: null, budget_max: 80000,
    conditions: ["new", "used"], image_urls: [IMG.necklace],
    body: "얇은 체인에 작은 펜던트 정도. 알러지 있어서 써지컬이나 14k면 좋아요.",
    proposals: [
      { by: "personal", product_name: "14k 얇은 체인 목걸이 (미착용)", price: 65000, condition: "unused", size_info: "40cm + 5cm", description: "선물 받았는데 길이가 안 맞아서 내놔요.", image_url: IMG.necklace },
      { by: "offline2", product_name: "빈티지 골드톤 주얼리 (여러 개)", price: 18000, condition: "used_a", size_info: null, description: "매장에 빈티지 주얼리 코너가 따로 있어요. 직접 골라보세요!", image_url: IMG.jewelry },
    ],
  },
  {
    by: "c4", hoursAgo: 2, category_id: "dress", title: "여름 휴양지 원피스 (빨강·플라워)", brand: null, size: "M", budget_max: 100000,
    conditions: ["new"], image_urls: [IMG.dressRed],
    body: "다음 달 제주 여행 가요. 사진 잘 나오는 쨍한 컬러였으면 좋겠어요.",
    proposals: [
      { by: "online2", product_name: "플라워 랩 원피스 레드", price: 79000, condition: "new", size_info: "M / 총장 105cm", description: "허리 벨트 포함, 구김 적어요.", image_url: IMG.dressRed, product_url: "https://example.com/second-form/wrap-dress" },
      { by: "personal", product_name: "레드 롱 원피스 (1회 착용)", price: 45000, condition: "used_a", size_info: "S–M", description: "바람에 날리는 소재라 사진 예뻐요.", image_url: IMG.dressLong },
      { by: "online3", product_name: "린넨 플라워 미디 원피스", price: 52000, condition: "new", size_info: "Free", description: "린넨 블렌드라 시원해요.", image_url: null, product_url: "https://example.com/daily-basic/linen-dress" },
    ],
  },
  {
    by: "c4", hoursAgo: 11, category_id: "outer", title: "가벼운 봄 블루종 (살구·베이지 톤)", brand: null, size: "M", budget_max: 130000,
    conditions: ["new", "used"], image_urls: [IMG.bomber],
    body: "얇아서 봄·가을에 걸치기 좋은 거요. 너무 크지 않은 레귤러핏.",
    proposals: [
      { by: "online3", product_name: "라이트 봄버 재킷 살구", price: 69000, condition: "new", size_info: "M / 어깨 46cm", description: "나일론 소재, 생활 방수.", image_url: IMG.bomber, product_url: "https://example.com/daily-basic/bomber" },
      { by: "online1", product_name: "빈티지 데님 트러커 재킷", price: 98000, condition: "used_a", size_info: "M", description: "블루종 대신 데님도 괜찮으시면 추천드려요.", image_url: IMG.denimJacket, product_url: "https://example.com/archive-room/trucker" },
      { by: "offline", product_name: "베이지 코튼 블루종", price: 119000, condition: "new", size_info: "M", description: "성수 매장 신상. 입어보고 결정하세요.", image_url: null },
    ],
  },
  {
    by: "c4", hoursAgo: 17, category_id: "bag", title: "출근용 블랙 크로스백 (명품 중고 OK)", brand: null, size: null, budget_max: 900000,
    conditions: ["used"], image_urls: [IMG.bagBlack],
    body: "체인 스트랩, 블랙 가죽. 정품 인증 가능한 곳이면 좋겠어요.",
    proposals: [
      { by: "online1", product_name: "GG 마몬트 미니 체인백 블랙 (중고 A)", price: 820000, condition: "used_a", size_info: "가로 22cm", description: "정품 인증서·영수증 있음.", image_url: IMG.bagBlack, product_url: "https://example.com/archive-room/marmont" },
      { by: "personal", product_name: "블랙 퀼팅 체인백 (보세)", price: 45000, condition: "used_a", size_info: "가로 20cm", description: "명품은 아니지만 비슷한 디자인이에요.", image_url: null },
    ],
  },
  {
    by: "c4", hoursAgo: 60, category_id: "dress", title: "블랙 플레어 미니스커트", brand: null, size: "S", budget_max: 60000,
    conditions: ["new", "used"], image_urls: [IMG.skirt],
    body: "셔츠랑 입을 거라 허리선 깔끔한 거, 안감 있으면 좋아요.",
    proposals: [
      { by: "online3", product_name: "하이웨이스트 플레어 스커트", price: 39000, condition: "new", size_info: "S / 총장 42cm", description: "속바지 내장.", image_url: IMG.skirt, product_url: "https://example.com/daily-basic/flare-skirt" },
      { by: "online2", product_name: "울 블렌드 플리츠 미니스커트", price: 58000, condition: "new", size_info: "S", description: "가을·겨울용 도톰한 소재.", image_url: null, product_url: "https://example.com/second-form/pleats-mini" },
    ],
  },
  {
    by: "c1", hoursAgo: 5, category_id: "acc", title: "워싱된 그레이 볼캡", brand: null, size: null, budget_max: 40000,
    conditions: ["new", "used", "vintage"], image_urls: [IMG.capGrey],
    body: "빈티지하게 물 빠진 느낌, 로고 없거나 작은 거요.",
    proposals: [
      { by: "offline2", product_name: "피그먼트 워싱 볼캡 차콜", price: 25000, condition: "new", size_info: "Free", description: "홍대 매장에 컬러 6가지 있어요.", image_url: IMG.capGrey },
      { by: "online3", product_name: "베이직 코튼 볼캡 화이트", price: 19000, condition: "new", size_info: "Free", description: "그레이 품절이라 화이트도 추천드려요.", image_url: IMG.capWhite, product_url: "https://example.com/daily-basic/cap" },
    ],
  },
  {
    by: "c2", hoursAgo: 13, category_id: "top", title: "노란색 트레이닝 세트 (상하의)", brand: null, size: "M", budget_max: 120000,
    conditions: ["new"], image_urls: [IMG.tracksuit],
    body: "쨍한 옐로우, 조거 팬츠 핏이면 좋아요. 상의만 있어도 괜찮아요.",
    proposals: [
      { by: "online2", product_name: "옐로 트레이닝 셋업", price: 99000, condition: "new", size_info: "M", description: "상하의 세트, 기모 없음.", image_url: IMG.tracksuit, product_url: "https://example.com/second-form/track-set" },
      { by: "offline2", product_name: "오렌지 빈티지 스웻셔츠", price: 35000, condition: "used_a", size_info: "M–L", description: "노랑은 아니지만 비슷한 쨍한 컬러 추천드려요.", image_url: IMG.sweatOrange },
    ],
  },
  {
    by: "c1", hoursAgo: 22, category_id: "shoes", title: "에어포스 파스텔 컬러 240", brand: "NIKE", size: "240", budget_max: 180000,
    conditions: ["new", "used"], image_urls: [IMG.sneakersPastel],
    body: "한정판 파스텔 컬러웨이 찾고 있어요. 박스 있으면 더 좋아요.",
    proposals: [
      { by: "online2", product_name: "에어포스 1 섀도우 파스텔", price: 159000, condition: "new", size_info: "240", description: "정품 새 상품, 박스 포함.", image_url: IMG.sneakersPastel, product_url: "https://example.com/second-form/af1-pastel" },
      { by: "personal", product_name: "에어포스 1 칼하트 콜라보 (240)", price: 210000, condition: "used_a", size_info: "240", description: "파스텔은 아니지만 희귀한 콜라보예요. 2회 착용.", image_url: IMG.sneakersTan },
    ],
  },
  {
    by: "c3", hoursAgo: 35, category_id: "bag", title: "노트북 들어가는 갈색 가죽 백팩", brand: null, size: null, budget_max: 200000,
    conditions: ["new", "used"], image_urls: [IMG.backpackLeather],
    body: "13인치 노트북 들어가고 너무 무겁지 않은 거요.",
    proposals: [
      { by: "offline2", product_name: "빈티지 레더 백팩 브라운", price: 168000, condition: "used_a", size_info: "13인치 수납", description: "매장에서 노트북 넣어보고 결정하세요.", image_url: IMG.backpackLeather },
      { by: "online3", product_name: "데일리 백팩 네이비", price: 59000, condition: "new", size_info: "15인치 수납", description: "가죽은 아니지만 가볍고 튼튼해요.", image_url: IMG.backpackNavy, product_url: "https://example.com/daily-basic/backpack" },
    ],
  },
  {
    by: "c4", hoursAgo: 44, category_id: "outer", title: "남자친구 선물용 레더 자켓 (L)", brand: null, size: "L", budget_max: 300000,
    conditions: ["new"], image_urls: [IMG.leatherMan],
    body: "라이더 스타일, 너무 반짝이지 않는 가죽이면 좋겠어요. 선물 포장 되면 최고!",
    proposals: [
      { by: "offline", product_name: "라이더 레더 자켓 블랙 (양가죽)", price: 289000, condition: "new", size_info: "L / 어깨 49cm", description: "성수 매장에서 선물 포장 해드려요.", image_url: IMG.leatherMan },
      { by: "online1", product_name: "베지터블 레더 라이더 자켓", price: 245000, condition: "new", size_info: "L", description: "무광 가죽, 선물 포장 가능.", image_url: IMG.leather, product_url: "https://example.com/archive-room/rider" },
    ],
  },
  {
    by: "c2", hoursAgo: 70, category_id: "top", title: "여름용 블루 셔츠 (린넨이면 최고)", brand: null, size: "L", budget_max: 70000,
    conditions: ["new", "used"], image_urls: [IMG.shirtDenim],
    body: "반팔 말고 긴팔, 걷어 입을 거예요. 너무 하늘색 말고 차분한 블루.",
    proposals: [
      { by: "online3", product_name: "린넨 블렌드 셔츠 블루", price: 42000, condition: "new", size_info: "L", description: "린넨 55%.", image_url: IMG.shirtDenim, product_url: "https://example.com/daily-basic/linen-shirt" },
      { by: "offline", product_name: "샴브레이 셔츠 (빈티지)", price: 48000, condition: "used_a", size_info: "L", description: "매장에 사이즈 여러 개 있어요.", image_url: null },
    ],
  },
];

// 코디 모드 예시: 체형·취향을 남긴 코디 요청 + 판매자가 상품 2~4개로 묶은 코디
// 제목은 앱과 같은 규칙 ("데이트에 입을 미니멀 코디")
const STYLING = [
  {
    by: "c4", hoursAgo: 0.4, title: "데일리로 입을 미니멀 코디", category_id: "outer", budget_max: 200000,
    occasion: "daily", height_cm: 165, top_size: "M", bottom_size: "27 / M", fit: "relaxed", styles: ["minimal"], pieces: ["outer", "top", "bottom"],
    body: "출퇴근길에 편하게 걸칠 수 있는 아우터 위주로요. 무채색이면 좋겠어요.",
    looks: [],
  },
  {
    by: "c3", hoursAgo: 1.5, title: "데이트에 입을 미니멀 코디", category_id: "outer", budget_max: 250000,
    occasion: "date", height_cm: 168, top_size: "M", bottom_size: "28–29 / M", fit: "regular", styles: ["minimal", "vintage"], pieces: ["outer", "top", "bottom", "bag"],
    body: "차분하고 단정한 분위기를 원해요. 너무 붙거나 짧은 옷은 피하고 싶고, 평소 입는 옷과도 잘 어울렸으면 좋겠어요.",
    looks: [
      {
        by: "offline", title: "차분한 톤의 데이트 룩", image_url: IMG.knit,
        description: "168cm · M 기준으로 어깨가 너무 크지 않은 코트를 골랐어요. 크림 니트와 슬랙스로 톤을 맞춰서 단정하게 보이고, 매장에서 세 벌 모두 같이 입어볼 수 있어요.",
        items: [
          { category_id: "outer", product_name: "울 블렌드 싱글 코트 (차콜)", price: 129000, condition: "used_a", size_info: "M · 총장 108cm" },
          { category_id: "top", product_name: "크림 라운드 니트", price: 49000, condition: "new", size_info: "M · 어깨 46cm" },
          { category_id: "bottom", product_name: "스트레이트 울 슬랙스", price: 59000, condition: "new", size_info: "M · 총장 102cm" },
        ],
      },
      {
        by: "online1", title: "빈티지 한 스푼 레이어드 룩", image_url: IMG.leather,
        description: "레더 재킷 하나로 빈티지 무드를 주고, 안은 화이트 티와 블랙 데님으로 깔끔하게 정리했어요. 정핏 선호하셔서 재킷은 M으로 골랐어요.",
        items: [
          { category_id: "outer", product_name: "빈티지 램스킨 레더 재킷", price: 139000, condition: "used_a", size_info: "M · 어깨 45cm", product_url: "https://example.com/archive-room/leather" },
          { category_id: "top", product_name: "헤비웨이트 화이트 티셔츠", price: 29000, condition: "new", size_info: "M", product_url: "https://example.com/archive-room/tee" },
          { category_id: "bottom", product_name: "블랙 스트레이트 데님", price: 59000, condition: "unused", size_info: "29 · 총장 103cm", product_url: "https://example.com/archive-room/black-denim" },
        ],
      },
    ],
  },
  {
    by: "c4", hoursAgo: 5, title: "여행에 입을 캐주얼 코디", category_id: "top", budget_max: 180000,
    occasion: "travel", height_cm: 162, top_size: "S", bottom_size: "26 / S", fit: "over", styles: ["casual", "sporty"], pieces: ["top", "bottom", "shoes"],
    body: "제주도 2박 3일, 하루에 만 보 넘게 걸을 것 같아요. 편하지만 사진은 예쁘게 나왔으면!",
    looks: [
      {
        by: "online3", title: "많이 걸어도 편한 여행 룩", image_url: IMG.sweatWhite,
        description: "오버핏을 좋아하셔서 스웻셔츠는 한 치수 큰 M으로 골랐어요. 와이드 팬츠와 쿠션 좋은 스니커즈로 오래 걸어도 편해요.",
        items: [
          { category_id: "top", product_name: "오버핏 화이트 스웻셔츠", price: 39000, condition: "new", size_info: "M · 가슴 60cm", product_url: "https://example.com/daily-basic/sweat" },
          { category_id: "bottom", product_name: "와이드 나일론 트랙 팬츠", price: 45000, condition: "new", size_info: "S · 총장 98cm", product_url: "https://example.com/daily-basic/track" },
          { category_id: "shoes", product_name: "화이트 레더 스니커즈", price: 79000, condition: "new", size_info: "235", product_url: "https://example.com/daily-basic/sneakers" },
        ],
      },
    ],
  },
  {
    by: "c1", hoursAgo: 20, title: "학교·출근용 미니멀 코디", category_id: "bottom", budget_max: 300000,
    occasion: "school", height_cm: 175, top_size: "L", bottom_size: "31 / L", fit: "regular", styles: ["minimal", "classic"], pieces: ["outer", "top", "bottom"],
    body: "다음 달 인턴 면접에도 입을 수 있게 단정한 셋업이면 좋겠어요.",
    looks: [
      {
        by: "offline", title: "단정한 면접·출근 셋업", image_url: IMG.shirtDenim,
        description: "175cm · L이면 블레이저는 L, 슬랙스는 31이 잘 맞아요. 셔츠는 블루 계열로 너무 딱딱하지 않게 골랐어요. 기장 수선은 매장에서 바로 해드려요.",
        items: [
          { category_id: "outer", product_name: "네이비 싱글 블레이저", price: 149000, condition: "new", size_info: "L · 어깨 47cm" },
          { category_id: "top", product_name: "블루 옥스포드 셔츠", price: 45000, condition: "new", size_info: "L" },
          { category_id: "bottom", product_name: "테이퍼드 울 슬랙스", price: 79000, condition: "new", size_info: "31 · 기장 수선 가능" },
        ],
      },
      {
        by: "online2", title: "캐주얼하게 입는 출근 룩", image_url: IMG.denimBlack,
        description: "면접 날만 아니면 이렇게도 입을 수 있어요. 블랙 데님과 스니커즈로 편하지만 깔끔하게.",
        items: [
          { category_id: "top", product_name: "데님 웨스턴 셔츠", price: 59000, condition: "new", size_info: "L", product_url: "https://example.com/second-form/denim-shirt" },
          { category_id: "bottom", product_name: "블랙 슬림 스트레이트 데님", price: 89000, condition: "new", size_info: "31", product_url: "https://example.com/second-form/black-denim" },
          { category_id: "shoes", product_name: "화이트 로우 스니커즈", price: 79000, condition: "unused", size_info: "270", product_url: "https://example.com/second-form/low" },
        ],
      },
    ],
  },
  {
    by: "c2", hoursAgo: 30, title: "특별한 날 입을 빈티지 코디", category_id: "dress", budget_max: 350000,
    occasion: "special", height_cm: 160, top_size: "S", bottom_size: "25 / S", fit: "slim", styles: ["vintage"], pieces: ["dress", "bag", "shoes"],
    body: "친구 결혼식 2부에 입을 옷이에요. 너무 화려하지 않게, 사진에 잘 나오는 색이면 좋겠어요.",
    looks: [
      {
        by: "personal", title: "결혼식 2부 원피스 룩", image_url: IMG.dressLong,
        description: "한 번 입은 롱 원피스예요. 160cm면 발목 위로 떨어져요. 블랙 백과 화이트 펌프스로 색을 정리했어요.",
        items: [
          { category_id: "dress", product_name: "레드 롱 원피스", price: 89000, condition: "used_a", size_info: "S · 총장 125cm" },
          { category_id: "bag", product_name: "블랙 퀼팅 체인백", price: 120000, condition: "used_a", size_info: "미니" },
          { category_id: "shoes", product_name: "화이트 포인티드 펌프스", price: 59000, condition: "used_b", size_info: "230 · 굽 5cm" },
        ],
      },
    ],
  },
];

// 소비자가 먼저 시작한 DM 예시 (D-1, D-2): [소비자, 판매자, 관련 제안(요청 제목, 상품명), 메시지들]
const DMS = [
  {
    consumer: "c1", seller: "offline", proposal: ["90s 블랙 레더 블루종, 어깨 48cm 내외", "빈티지 레더 블루종 블랙"],
    messages: [
      ["c1", "안녕하세요! 어깨 실측 48cm 맞는지 한 번만 더 확인 가능할까요?"],
      ["offline", "네, 방금 다시 재봤는데 48cm 맞아요. 주말에 매장 오시면 입어보실 수 있어요."],
      ["c1", "좋아요! 토요일 오후에 갈게요 :)"],
    ],
  },
  {
    consumer: "c2", seller: "online1", proposal: ["90년대 빈티지 나이키 스웻셔츠 찾아요", "90s Nike 센터 스우시 크루넥 (그레이)"],
    messages: [
      ["c2", "목 부분 늘어남 없나요? 추가 사진 볼 수 있을까요?"],
      ["online1", "늘어남 없어요! 사이트 상품 페이지에 디테일 사진 6장 올려뒀어요."],
    ],
  },
  {
    consumer: "c4", seller: "personal", proposal: ["여름 휴양지 원피스 (빨강·플라워)", "레드 롱 원피스 (1회 착용)"],
    messages: [
      ["c4", "혹시 실측 총장 알 수 있을까요? 키가 163이에요."],
      ["personal", "총장 128cm예요! 163이면 발목 위 정도 올 것 같아요."],
      ["c4", "감사합니다. 고민해보고 연락드릴게요!"],
    ],
  },
];

// 사이트 내 모의 결제 예시 (B-3) + 평점 (R-1)
const ORDERS = [
  { consumer: "c2", proposal: ["90년대 빈티지 나이키 스웻셔츠 찾아요", "90s Nike 센터 스우시 크루넥 (그레이)"] },
  { consumer: "c1", proposal: ["살로몬 XT-6 오프화이트 260 구해요", "XT-6 오프화이트 (3회 착용)"] },
  { consumer: "c3", proposal: ["출근용 깔끔한 화이트 스니커즈 270", "퓨마 코트 클래식 화이트"] },
  { consumer: "c4", proposal: ["가벼운 봄 블루종 (살구·베이지 톤)", "라이트 봄버 재킷 살구"] },
];
// 매장 방문 예정 예시: [소비자, 관련 제안(요청 제목, 상품명), 며칠 뒤, 시간대, 메모, 매장 확인 여부]
const VISITS = [
  ["c1", ["90s 블랙 레더 블루종, 어깨 48cm 내외", "빈티지 레더 블루종 블랙"], 2, "afternoon", "오후에 들를게요! L 사이즈로 입어보고 싶어요", true],
  ["c3", ["노트북 들어가는 갈색 가죽 백팩", "빈티지 레더 백팩 브라운"], 3, "evening", "퇴근하고 들를게요. 노트북 넣어볼 수 있을까요?", false],
  ["c4", ["가벼운 봄 블루종 (살구·베이지 톤)", "베이지 코튼 블루종"], 1, "morning", "M 사이즈 있으면 입어볼게요", true],
];

const RATINGS = [
  ["c2", "online1", 5],
  ["c1", "online1", 4],
  ["c1", "personal", 4],
  ["c3", "online2", 4],
  ["c4", "online2", 5],
  ["c4", "online3", 5],
  ["c3", "online3", 4],
  ["c1", "offline", 5],
  ["c3", "offline", 4],
  ["c2", "offline2", 5],
  ["c3", "offline2", 5],
];

// ---------------------------------------------------------------------------

function loadPasswords() {
  if (!fs.existsSync(ACCOUNTS_FILE)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(ACCOUNTS_FILE, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("@example.com"))
      .map((l) => {
        const cols = l.split("|").map((c) => c.trim());
        return [cols[3], cols[4]];
      }),
  );
}

function savePasswords(rows) {
  const lines = [
    "# 시연용 계정 (supabase/seed.mjs 가 생성, 커밋하지 말 것)",
    "",
    "| 역할 | 이름 | 이메일 | 비밀번호 |",
    "|---|---|---|---|",
    ...rows.map((r) => `| ${r.label} | ${r.nickname} | ${r.email} | ${r.password} |`),
    "",
  ];
  fs.writeFileSync(ACCOUNTS_FILE, lines.join("\n"));
}

async function api(token, method, p, body, prefer = "return=representation") {
  const res = await fetch(`${URL_}/rest/v1/${p}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: prefer },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function auth(kind, body) {
  const res = await fetch(`${URL_}/auth/v1/${kind}`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, json: await res.json() };
}

async function ensureUser(acct, role, passwords) {
  const password = passwords[acct.email] ?? `Demo-${crypto.randomBytes(5).toString("hex")}`;
  let r = await auth("token?grant_type=password", { email: acct.email, password });
  if (!r.ok) {
    r = await auth("signup", { email: acct.email, password, data: { role, nickname: acct.nickname } });
    if (!r.ok || !r.json.access_token) throw new Error(`가입 실패 ${acct.email}: ${JSON.stringify(r.json)}`);
    console.log(`  + 가입 ${acct.email}`);
  } else {
    console.log(`  = 로그인 ${acct.email}`);
  }
  return { ...acct, password, token: r.json.access_token, id: r.json.user.id };
}

const hoursAgoIso = (h) => new Date(Date.now() - h * 3600_000).toISOString();
const q = encodeURIComponent;

async function main() {
  const passwords = loadPasswords();
  const users = {};
  console.log("계정");
  for (const c of CONSUMERS) users[c.key] = await ensureUser(c, "consumer", passwords);
  for (const s of SELLERS) users[s.key] = await ensureUser(s, "seller", passwords);
  savePasswords([
    ...CONSUMERS.map((c) => ({ label: "소비자", ...users[c.key] })),
    ...SELLERS.map((s) => ({ label: `판매자 (${s.seller_type}${s.is_subscribed ? ", 구독" : ""})`, ...users[s.key] })),
  ]);

  console.log("판매자 프로필");
  for (const s of SELLERS) {
    const u = users[s.key];
    await api(u.token, "PATCH", `seller_profiles?user_id=eq.${u.id}`, {
      shop_name: s.nickname,
      seller_type: s.seller_type,
      is_subscribed: s.is_subscribed,
      shop_url: s.shop_url ?? null,
      location_url: s.location_url ?? null,
      interest_categories: s.interest_categories,
    });
  }

  console.log("요청글·제안");
  const proposalIds = new Map(); // "요청 제목|상품명" → proposal id
  for (const r of REQUESTS) {
    const consumer = users[r.by];
    const { proposals, hoursAgo, ...fields } = r;
    const createdAt = hoursAgoIso(hoursAgo);
    const existing = await api(consumer.token, "GET", `requests?select=id&consumer_id=eq.${consumer.id}&title=eq.${q(r.title)}`);
    let requestId = existing[0]?.id;

    if (requestId) {
      // 이미 있으면 사진·시각만 이 파일 기준으로 맞춤
      await api(consumer.token, "PATCH", `requests?id=eq.${requestId}`, { image_urls: r.image_urls, created_at: createdAt });
    } else {
      const [created] = await api(consumer.token, "POST", "requests", { ...fields, by: undefined, consumer_id: consumer.id, created_at: createdAt });
      requestId = created.id;
    }

    for (const [i, p] of proposals.entries()) {
      const seller = users[p.by];
      // 제안은 요청글 이후 40분 간격으로
      const proposalAt = new Date(Math.min(Date.now(), new Date(createdAt).getTime() + (i + 1) * 40 * 60_000)).toISOString();
      const found = await api(seller.token, "GET", `proposals?select=id&request_id=eq.${requestId}&seller_id=eq.${seller.id}&product_name=eq.${q(p.product_name)}`);
      let id = found[0]?.id;
      if (id) {
        await api(seller.token, "PATCH", `proposals?id=eq.${id}`, { image_url: p.image_url, created_at: proposalAt });
      } else {
        const [created] = await api(seller.token, "POST", "proposals", { ...p, by: undefined, request_id: requestId, seller_id: seller.id, created_at: proposalAt });
        id = created.id;
      }
      proposalIds.set(`${r.title}|${p.product_name}`, id);
    }
    console.log(`  ${existing.length ? "=" : "+"} ${r.title} (제안 ${proposals.length})`);
  }

  console.log("코디 요청·코디");
  for (const r of STYLING) {
    const consumer = users[r.by];
    const createdAt = hoursAgoIso(r.hoursAgo);
    const existing = await api(consumer.token, "GET", `requests?select=id&consumer_id=eq.${consumer.id}&kind=eq.styling&title=eq.${q(r.title)}`);
    let requestId = existing[0]?.id;
    if (!requestId) {
      requestId = await api(consumer.token, "POST", "rpc/create_styling_request", {
        p_category_id: r.category_id,
        p_title: r.title,
        p_body: r.body,
        p_budget_max: r.budget_max,
        p_image_urls: [],
        p_occasion: r.occasion,
        p_height_cm: r.height_cm,
        p_top_size: r.top_size,
        p_bottom_size: r.bottom_size,
        p_fit: r.fit,
        p_styles: r.styles,
        p_pieces: r.pieces,
      });
    }
    await api(consumer.token, "PATCH", `requests?id=eq.${requestId}`, { created_at: createdAt }, "return=minimal");

    for (const [i, look] of r.looks.entries()) {
      const seller = users[look.by];
      const lookAt = new Date(Math.min(Date.now(), new Date(createdAt).getTime() + (i + 1) * 25 * 60_000)).toISOString();
      const found = await api(seller.token, "GET", `proposals?select=id&request_id=eq.${requestId}&seller_id=eq.${seller.id}&product_name=eq.${q(look.title)}`);
      let id = found[0]?.id;
      if (!id) {
        id = await api(seller.token, "POST", "rpc/create_look", {
          p_request_id: requestId,
          p_title: look.title,
          p_description: look.description,
          p_image_url: look.image_url,
          p_items: look.items,
        });
      }
      await api(seller.token, "PATCH", `proposals?id=eq.${id}`, { image_url: look.image_url, created_at: lookAt }, "return=minimal");
    }
    console.log(`  ${existing.length ? "=" : "+"} ${r.title} (코디 ${r.looks.length})`);
  }

  console.log("알림 켠 남의 글 (N-3)");
  const watchTitle = REQUESTS[1].title; // c1 의 데님 글을 c2 가 따라감
  const [denim] = await api(users.c2.token, "GET", `requests?select=id&title=eq.${q(watchTitle)}`);
  await api(users.c2.token, "POST", "watches?on_conflict=user_id,request_id", { user_id: users.c2.id, request_id: denim.id, notify: true }, "resolution=merge-duplicates");

  console.log("DM");
  for (const dm of DMS) {
    const consumer = users[dm.consumer];
    const seller = users[dm.seller];
    const [thread] = await api(consumer.token, "GET", `dm_threads?select=id&consumer_id=eq.${consumer.id}&seller_id=eq.${seller.id}`);
    if (thread) {
      console.log(`  = ${consumer.nickname} ↔ ${seller.nickname}`);
      continue;
    }
    const [created] = await api(consumer.token, "POST", "dm_threads", {
      consumer_id: consumer.id,
      seller_id: seller.id,
      proposal_id: proposalIds.get(dm.proposal.join("|")),
    });
    for (const [who, body] of dm.messages) {
      await api(users[who].token, "POST", "dm_messages", { thread_id: created.id, sender_id: users[who].id, body });
    }
    console.log(`  + ${consumer.nickname} ↔ ${seller.nickname} (${dm.messages.length})`);
  }

  console.log("주문");
  for (const o of ORDERS) {
    const consumer = users[o.consumer];
    const proposalId = proposalIds.get(o.proposal.join("|"));
    const found = await api(consumer.token, "GET", `orders?select=id&consumer_id=eq.${consumer.id}&proposal_id=eq.${proposalId}`);
    if (found.length) continue;
    await api(consumer.token, "POST", "orders", {
      consumer_id: consumer.id,
      proposal_id: proposalId,
      recipient_name: consumer.nickname,
      address: "서울시 성동구 (시연용 주소)",
    });
    console.log(`  + ${consumer.nickname}: ${o.proposal[1]}`);
  }

  console.log("매장 방문 예정");
  for (const [c, [title, productName], daysLater, slot, note, confirmed] of VISITS) {
    const consumer = users[c];
    const proposalId = proposalIds.get(`${title}|${productName}`);
    const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // 한국 날짜
    const visitDate = new Date(Date.now() + 9 * 3600_000 + daysLater * 86400_000).toISOString().slice(0, 10);
    // 아직 지나지 않은 방문 예정이 있으면 그대로 둠 (다시 잡으면 알림이 또 생김)
    const [existing] = await api(consumer.token, "GET", `visits?select=id,visit_date,status&consumer_id=eq.${consumer.id}&proposal_id=eq.${proposalId}`);
    if (existing && existing.status !== "cancelled" && existing.visit_date >= today) {
      console.log(`  = ${consumer.nickname} → ${productName} (${existing.visit_date})`);
      continue;
    }
    const [visit] = await api(
      consumer.token,
      "POST",
      "visits?on_conflict=consumer_id,proposal_id",
      { consumer_id: consumer.id, proposal_id: proposalId, visit_date: visitDate, time_slot: slot, note, status: "planned" },
      "resolution=merge-duplicates,return=representation",
    );
    if (confirmed) {
      const seller = Object.values(users).find((u) => u.id === visit.seller_id);
      await api(seller.token, "PATCH", `visits?id=eq.${visit.id}`, { status: "confirmed" });
    }
    console.log(`  ${consumer.nickname} → ${productName} (${visitDate}${confirmed ? ", 확인" : ""})`);
  }

  console.log("평점");
  for (const [c, s, score] of RATINGS) {
    await api(users[c].token, "POST", "ratings?on_conflict=consumer_id,seller_id", { consumer_id: users[c].id, seller_id: users[s].id, score }, "resolution=merge-duplicates");
  }

  // 시드 중에 생긴 알림은 읽음 처리 → 시연 때 새로 오는 알림만 눈에 띄게
  console.log("알림 읽음 처리");
  for (const u of Object.values(users)) {
    await api(u.token, "PATCH", "notifications?is_read=eq.false", { is_read: true }, "return=minimal");
  }

  console.log(`완료. 계정 정보: ${path.relative(root, ACCOUNTS_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
