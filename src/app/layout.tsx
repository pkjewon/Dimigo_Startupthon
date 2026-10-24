import type { Metadata } from "next";
import { Header } from "@/components/header";
import { SERVICE_NAME, SERVICE_TAGLINE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: SERVICE_NAME,
  description: SERVICE_TAGLINE,
};

// 폰트는 시안처럼 Google Fonts 링크로 로드 (next/font 는 빌드 때 한글 폰트 수백 개 파일을 받아와서 자주 실패함)
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;600;700;800&family=Noto+Sans+KR:wght@400;500;700&display=swap";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="page-main flex-1">
          {children}
          <footer className="footer">
            <span>© 2026 {SERVICE_NAME}</span>
            <span>DIMIGO STARTUPTHON PROTOTYPE</span>
            <span>REQUEST · DISCOVER · VISIT</span>
          </footer>
        </main>
      </body>
    </html>
  );
}
