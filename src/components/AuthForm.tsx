"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";

export function AuthForm({ action, next, signup }: { action: (s: FormState, f: FormData) => Promise<FormState>; next: string; signup?: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      {signup && (
        <label className="text-[13px] font-semibold">
          이름 (안 써도 돼요)
          <input name="name" className="input mt-1 font-normal" autoComplete="nickname" maxLength={40} />
        </label>
      )}
      <label className="text-[13px] font-semibold">
        이메일
        <input name="email" type="email" required className="input mt-1 font-normal" autoComplete="email" />
      </label>
      <label className="text-[13px] font-semibold">
        비밀번호
        <input name="password" type="password" required minLength={signup ? 8 : undefined} className="input mt-1 font-normal" autoComplete={signup ? "new-password" : "current-password"} />
        {signup && <span className="mt-1 block text-[12px] font-normal text-ink-3">8글자 이상으로 만들어 주세요.</span>}
      </label>
      {state?.error && <p className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-down" role="alert">{state.error}</p>}
      <button className="btn btn-primary justify-center" disabled={pending}>
        {pending ? "잠깐만요…" : signup ? "가입하기" : "로그인"}
      </button>
    </form>
  );
}
