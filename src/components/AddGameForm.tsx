"use client";
import { useActionState } from "react";
import { addMyGameAction } from "@/app/actions";

export function AddGameForm() {
  const [state, action, pending] = useActionState(addMyGameAction, undefined);
  return (
    <form action={action} className="card p-4">
      <label className="text-[13px] font-semibold" htmlFor="game">게임 추가하기</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input id="game" name="game" required className="input" placeholder="로블록스 게임 주소 또는 숫자 id" />
        <button className="btn btn-primary shrink-0 justify-center" disabled={pending}>{pending ? "찾는 중…" : "추가"}</button>
      </div>
      {state?.error && <p className="mt-2 text-[13px] text-down" role="alert">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-[13px] text-up">{state.ok}</p>}
    </form>
  );
}
