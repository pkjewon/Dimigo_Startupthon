"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <form
      className="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
        router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
      }}
    >
      <input
        name="q"
        type="search"
        defaultValue={params.get("q") ?? ""}
        placeholder="찾는 옷, 브랜드로 요청글 검색"
        aria-label="요청글 검색"
      />
      <button type="submit" aria-label="검색">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>
      </button>
    </form>
  );
}
