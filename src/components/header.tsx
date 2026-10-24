import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES, SERVICE_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "./notification-bell";
import { SearchBox } from "./search-box";

export async function Header() {
  const user = await getCurrentUser();

  let unread = 0;
  if (user) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    unread = count ?? 0;
  }

  return (
    <>
      <div className="announcement">
        <b>REVERSE MARKET</b>
        <span>—</span>
        <span>POST WHAT YOU WANT. SELLERS COME TO YOU.</span>
      </div>
      <header className="site-header">
        <div className="header-main">
          <Link href="/" className="brand" aria-label={`${SERVICE_NAME} 홈`}>
            <span className="brand-mark">{SERVICE_NAME[0]}</span>
            <span>
              <span className="brand-name">{SERVICE_NAME}</span>
              <span className="brand-sub">FIND WHAT YOU FEEL</span>
            </span>
          </Link>

          <Suspense fallback={<div className="search" />}>
            <SearchBox />
          </Suspense>

          <div className="header-actions">
            {user?.role === "consumer" && (
              <Link href="/requests/new" className="text-action">
                요청하기
              </Link>
            )}
            {user?.role === "seller" && (
              <Link href="/seller/dashboard" className="text-action">
                대시보드
              </Link>
            )}
            {user ? (
              <>
                <Link href="/dm" className="icon-action" aria-label="메시지">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 5h16v11H9l-5 4V5Z" />
                  </svg>
                </Link>
                <NotificationBell userId={user.id} initialCount={unread} />
                <Link
                  href={user.role === "seller" ? "/seller/dashboard" : "/me"}
                  className="text-action text-muted"
                  title={user.role === "seller" ? "대시보드" : "마이페이지"}
                >
                  {user.nickname}
                </Link>
                <form action={logout}>
                  <button className="text-action">로그아웃</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-action !inline">
                  로그인
                </Link>
                <Link href="/signup" className="text-action">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
        <nav className="category-strip" aria-label="카테고리">
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={`/?category=${c.id}`} className="category">
              <strong>{c.name}</strong>
              <span>{c.hint}</span>
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
