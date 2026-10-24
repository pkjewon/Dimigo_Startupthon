import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="eyebrow">WELCOME BACK</div>
      <h1 className="page-title">로그인</h1>
      <p className="mt-2 text-xs text-muted">요청을 올리거나 상품을 제안하려면 로그인해주세요.</p>
      <div className="panel mt-8">
        <LoginForm next={typeof next === "string" ? next : "/"} />
      </div>
      <p className="mt-5 text-center text-xs text-muted">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
          회원가입
        </Link>
      </p>
    </div>
  );
}
