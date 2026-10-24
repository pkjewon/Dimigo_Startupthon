import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const current = await getCurrentUser();
  if (current) redirect(roleHome(current.role));

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="eyebrow">JOIN</div>
      <h1 className="page-title">회원가입</h1>
      <p className="mt-2 text-xs text-muted">가입할 때 고른 역할은 나중에 바꿀 수 없어요.</p>
      <div className="panel mt-8">
        <SignupForm />
      </div>
      <p className="mt-5 text-center text-xs text-muted">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
          로그인
        </Link>
      </p>
    </div>
  );
}
