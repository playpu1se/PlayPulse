import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { signupAction } from "@/app/actions";
import { currentUser, signupOpen } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "가입하기 — PlayPulse" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
  if (await currentUser()) redirect(next);
  if (!(await signupOpen())) {
    return (
      <div className="card mx-auto mt-6 max-w-sm p-6 text-center">
        <h1 className="mb-2 text-xl font-bold">가입이 닫혀 있어요</h1>
        <p className="mb-4 text-[13px] text-ink-3">이 PlayPulse 는 한 사람만 쓰는 사이트예요.</p>
        <Link href="/login" className="btn btn-primary">로그인</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto mt-6 max-w-sm">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">가입하기</h1>
        <p className="mb-4 text-[13px] text-ink-3">내 게임을 모으고, 목록과 알림을 쓸 수 있어요. 모두 무료예요.</p>
        <AuthForm action={signupAction} next={next} signup />
      </div>
      <p className="mt-4 text-center text-[13px] text-ink-3">
        이미 가입했어요? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-pulse underline">로그인</Link>
      </p>
    </div>
  );
}
