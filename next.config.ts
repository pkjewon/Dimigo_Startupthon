import type { NextConfig } from "next";

// cacheComponents 는 끔: 거의 모든 화면이 로그인 쿠키에 의존해서 매 요청 동적 렌더링이 맞음
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
