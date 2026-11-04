import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/app/actions";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "로그인 — PlayPulse" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
  if (await currentUser()) redirect(next);
  return (
    <div className="mx-auto mt-6 max-w-sm">
      <div className="card p-6">
        <h1 className="mb-4 text-xl font-bold">로그인</h1>
        <AuthForm action={loginAction} next={next} />
      </div>
      <p className="mt-4 text-center text-[13px] text-ink-3">
        처음이에요? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-pulse underline">가입하기</Link>
      </p>
    </div>
  );
}
