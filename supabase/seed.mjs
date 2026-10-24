// 시연용 데이터 (PRD 8장): 소비자 2, 판매자 4 (온라인 2·오프라인 1·개인 1, 그중 구독 1), 요청글 8개, 글마다 제안 2~4개
// 실행: node supabase/seed.mjs   (.env.local 의 Supabase URL·키 사용, Confirm email 이 꺼져 있어야 함)
// 계정 비밀번호는 supabase/demo-accounts.local.md 에 저장 (gitignore). 다시 실행하면 이미 있는 계정·글은 건너뜀
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
// 사진을 직접 확인하고 고른 것만 사용 (시안의 일부 사진은 설명과 내용이 달랐음)
const IMG = {
  sneakers: img("1542291026-7eec264c27ff"), // 빨간 러닝화
  leather: img("1551028719-00167b16eac5"), // 블랙 레더 재킷
  sweat: img("1556821840-3a63f95609a7"), // 그레이 후드
  bag: img("1584917865442-de89df76afd3"), // 레드 핸드백
  denim: img("1541099649105-f69ad21f3246"), // 데님 팬츠
  tee: img("1521572163474-6864f9cf17ab"), // 화이트 티셔츠
  rack: img("1490481651871-ab68de25d43d"), // 옷걸이에 걸린 옷들
};

const CONSUMERS = [
  { key: "c1", email: "demo.consumer1@example.com", nickname: "jiyoon.archive" },
  { key: "c2", email: "demo.consumer2@example.com", nickname: "moodboard_m" },
];
const SELLERS = [
  { key: "online1", email: "demo.seller.online1@example.com", nickname: "ARCHIVE ROOM", seller_type: "online", is_subscribed: true, shop_url: "https://example.com/archive-room", interest_categories: ["top", "bottom", "outer", "acc"] },
  { key: "online2", email: "demo.seller.online2@example.com", nickname: "SECOND FORM", seller_type: "online", is_subscribed: false, shop_url: "https://example.com/second-form", interest_categories: ["top", "dress", "bag", "shoes"] },
  { key: "offline", email: "demo.seller.offline@example.com", nickname: "성수 무드샵", seller_type: "offline", is_subscribed: false, location_url: "https://map.naver.com/p/search/%EC%84%B1%EC%88%98%EB%8F%99%20%ED%8E%B8%EC%A7%91%EC%88%8D", interest_categories: ["outer", "top", "bottom"] },
  { key: "personal", email: "demo.seller.personal@example.com", nickname: "민지의 옷장", seller_type: "individual", is_subscribed: false, interest_categories: ["dress", "bag", "acc"] },
];

// [요청, 제안들]. 시연 시나리오의 트렌치코트 요청은 발표 때 새로 쓰므로 넣지 않음
const REQUESTS = [
  {
    by: "c2", category_id: "top", title: "90년대 빈티지 나이키 스웻셔츠 찾아요", brand: "NIKE", size: "L–XL", budget_max: 100000,
    conditions: ["used", "vintage"], image_urls: [IMG.sweat],
    body: "90년대 느낌의 박시한 핏. 프린팅이 과하지 않은 그레이나 네이비면 좋겠어요.",
    proposals: [
      { by: "online1", product_name: "90s Nike 센터 스우시 크루넥 (그레이)", price: 92000, condition: "used_a", size_info: "L / 가슴 62cm", description: "목 늘어남 없음, 세탁 완료.", image_url: IMG.sweat, product_url: "https://example.com/archive-room/nike-crew" },
      { by: "offline", product_name: "빈티지 나이키 네이비 스웻셔츠", price: 78000, condition: "used_b", size_info: "XL", description: "매장에서 직접 입어볼 수 있어요. 소매 끝 약간 보풀.", image_url: IMG.tee },
      { by: "online2", product_name: "나이키 클럽 플리스 크루 (새 상품)", price: 69000, condition: "new", size_info: "L", description: "빈티지는 아니지만 비슷한 핏의 새 상품이에요.", image_url: IMG.sweat, product_url: "https://example.com/second-form/club-crew" },
    ],
  },
  {
    by: "c1", category_id: "bottom", title: "아워레가시 써드컷 데님 허리 28–29", brand: "OUR LEGACY", size: "28–29", budget_max: 220000,
    conditions: ["new", "used"], image_urls: [IMG.denim],
    body: "블루 계열, 밑단 수선 없는 제품으로 찾고 있어요. 실측 같이 보내주세요.",
    proposals: [
      { by: "online1", product_name: "OUR LEGACY Third Cut Digital Denim", price: 198000, condition: "unused", size_info: "29 / 허리 39cm", description: "택 있는 미사용 제품.", image_url: IMG.denim, product_url: "https://example.com/archive-room/third-cut" },
      { by: "offline", product_name: "써드컷 데님 워시드 블루", price: 165000, condition: "used_a", size_info: "28 / 총장 104cm", description: "밑단 수선 없음. 매장 방문 시 피팅 가능.", image_url: IMG.denim },
    ],
  },
  {
    by: "c2", category_id: "shoes", title: "살로몬 XT-6 오프화이트 260 구해요", brand: "SALOMON", size: "260", budget_max: 250000,
    conditions: ["new", "used"], image_urls: [IMG.sneakers],
    body: "박스 없어도 괜찮아요. 밑창 상태 좋은 제품이면 중고도 OK.",
    proposals: [
      { by: "online2", product_name: "Salomon XT-6 Vanilla Ice", price: 239000, condition: "new", size_info: "260", description: "정품 새 상품, 박스 포함.", image_url: IMG.sneakers, product_url: "https://example.com/second-form/xt6" },
      { by: "personal", product_name: "XT-6 오프화이트 (3회 착용)", price: 165000, condition: "used_a", size_info: "260", description: "밑창 거의 새것. 박스 없음.", image_url: IMG.sneakers },
    ],
  },
  {
    by: "c1", category_id: "bag", title: "브라운 미니 숄더백 (빈티지 OK)", brand: null, size: null, budget_max: 300000,
    conditions: ["used", "vintage"], image_urls: [IMG.bag],
    body: "작은 사이즈, 브라운 계열. 모서리 까짐이 심하지 않은 제품을 찾아요.",
    proposals: [
      { by: "personal", product_name: "빈티지 레더 숄더백 브라운", price: 145000, condition: "used_b", size_info: "가로 24cm", description: "모서리 살짝 사용감. 정품 증빙 사진 있어요.", image_url: IMG.bag },
      { by: "online2", product_name: "미니 레더 숄더백 (카멜)", price: 128000, condition: "new", size_info: "가로 22cm", description: "새 상품, 소가죽.", image_url: IMG.bag, product_url: "https://example.com/second-form/mini-bag" },
      { by: "online1", product_name: "90s 빈티지 숄더백 다크브라운", price: 285000, condition: "used_a", size_info: "가로 25cm", description: "상태 A, 더스트백 포함.", image_url: IMG.bag, product_url: "https://example.com/archive-room/vintage-bag" },
    ],
  },
  {
    by: "c2", category_id: "acc", title: "로고 작은 그레이 울 머플러", brand: "ACNE STUDIOS", size: null, budget_max: 180000,
    conditions: ["new", "used"], image_urls: [],
    body: "그레이 멜란지, 로고가 크게 보이지 않는 제품이면 좋겠어요.",
    proposals: [
      { by: "online1", product_name: "Acne Studios Canada 머플러 그레이", price: 175000, condition: "unused", size_info: "200×30cm", description: "미사용, 택 포함.", image_url: null, product_url: "https://example.com/archive-room/canada" },
      { by: "personal", product_name: "울 머플러 그레이 멜란지 (무로고)", price: 39000, condition: "used_a", size_info: "180×30cm", description: "브랜드 없지만 촉감 좋아요.", image_url: null },
    ],
  },
  {
    by: "c1", category_id: "dress", title: "가을 하객룩 미디 원피스", brand: null, size: "S–M", budget_max: 150000,
    conditions: ["new"], image_urls: [IMG.rack],
    body: "차분한 컬러(네이비, 브라운), 무릎 아래 기장. 다음 달 결혼식에 입을 거예요.",
    proposals: [
      { by: "online2", product_name: "플리츠 미디 원피스 네이비", price: 119000, condition: "new", size_info: "S / 총장 115cm", description: "구김 적은 소재.", image_url: IMG.rack, product_url: "https://example.com/second-form/pleats" },
      { by: "personal", product_name: "브라운 니트 원피스 (1회 착용)", price: 58000, condition: "used_a", size_info: "M", description: "한 번 입고 드라이했어요.", image_url: IMG.rack },
    ],
  },
  {
    by: "c1", category_id: "outer", title: "90s 블랙 레더 블루종, 어깨 48cm 내외", brand: null, size: "M–L", budget_max: 190000,
    conditions: ["used", "vintage"], image_urls: [IMG.leather],
    body: "너무 슬림하지 않은 핏. 사용감 적은 제품이면 좋겠어요.",
    proposals: [
      { by: "offline", product_name: "빈티지 레더 블루종 블랙", price: 155000, condition: "used_a", size_info: "L / 어깨 48cm", description: "성수 매장에 있어요. 직접 입어보고 결정하세요!", image_url: IMG.leather },
      { by: "online1", product_name: "90s Leather Blouson", price: 189000, condition: "used_a", size_info: "M / 어깨 47cm", description: "가죽 관리 완료.", image_url: IMG.leather, product_url: "https://example.com/archive-room/blouson" },
      { by: "personal", product_name: "레더 자켓 블랙 (보세)", price: 70000, condition: "used_b", size_info: "M", description: "소매에 약간 생활 기스.", image_url: IMG.leather },
    ],
  },
  {
    by: "c2", category_id: "top", title: "부드러운 그레이 모헤어 가디건", brand: null, size: "M", budget_max: 120000,
    conditions: ["new", "used"], image_urls: [],
    body: "까슬거리지 않는 소재. 오버핏도 괜찮아요.",
    proposals: [
      { by: "offline", product_name: "모헤어 블렌드 가디건 그레이", price: 98000, condition: "new", size_info: "Free", description: "매장 인기 상품, 3가지 컬러.", image_url: IMG.rack },
      { by: "online2", product_name: "소프트 니트 가디건", price: 74000, condition: "new", size_info: "M", description: "울 30% 블렌드.", image_url: null, product_url: "https://example.com/second-form/cardigan" },
    ],
  },
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

async function api(token, method, p, body) {
  const res = await fetch(`${URL_}/rest/v1/${p}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
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
  for (const r of REQUESTS) {
    const consumer = users[r.by];
    const existing = await api(consumer.token, "GET", `requests?select=id&consumer_id=eq.${consumer.id}&title=eq.${encodeURIComponent(r.title)}`);
    if (existing.length) {
      // 이미 있으면 사진만 이 파일 기준으로 맞춤
      const requestId = existing[0].id;
      await api(consumer.token, "PATCH", `requests?id=eq.${requestId}`, { image_urls: r.image_urls });
      for (const p of r.proposals) {
        const seller = users[p.by];
        await api(seller.token, "PATCH", `proposals?request_id=eq.${requestId}&seller_id=eq.${seller.id}&product_name=eq.${encodeURIComponent(p.product_name)}`, { image_url: p.image_url });
      }
      console.log(`  = 있음 (사진 동기화): ${r.title}`);
      continue;
    }
    const { proposals, ...fields } = r;
    const [created] = await api(consumer.token, "POST", "requests", { ...fields, by: undefined, consumer_id: consumer.id });
    for (const p of proposals) {
      const seller = users[p.by];
      await api(seller.token, "POST", "proposals", { ...p, by: undefined, request_id: created.id, seller_id: seller.id });
    }
    console.log(`  + ${r.title} (제안 ${proposals.length})`);
  }

  // 다른 소비자 글을 따라가는 예시 (N-3)
  const c2 = users.c2;
  const [denim] = await api(c2.token, "GET", `requests?select=id&title=eq.${encodeURIComponent(REQUESTS[1].title)}`);
  if (denim) {
    await fetch(`${URL_}/rest/v1/watches?on_conflict=user_id,request_id`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${c2.token}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ user_id: c2.id, request_id: denim.id, notify: true }),
    });
  }

  console.log(`완료. 계정 정보: ${path.relative(root, ACCOUNTS_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
