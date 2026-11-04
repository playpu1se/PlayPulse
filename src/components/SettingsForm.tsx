"use client";
import { useActionState } from "react";
import { settingsAction } from "@/app/actions";

export function SettingsForm({ email, name, currency }: { email: string; name: string; currency: "robux" | "usd" }) {
  const [state, action, pending] = useActionState(settingsAction, undefined);
  return (
    <form action={action} className="card flex max-w-md flex-col gap-4 p-5">
      <label className="text-[13px] font-semibold">
        이메일
        <input value={email} readOnly className="input mt-1 bg-surface-2 font-normal text-ink-3" />
      </label>
      <label className="text-[13px] font-semibold">
        이름
        <input name="name" defaultValue={name} maxLength={40} className="input mt-1 font-normal" />
      </label>
      <fieldset>
        <legend className="text-[13px] font-semibold">수익을 보여 줄 단위</legend>
        <div className="mt-1 flex flex-col gap-1.5 text-[14px]">
          <label className="flex items-center gap-2"><input type="radio" name="currency" value="robux" defaultChecked={currency === "robux"} /> 로벅스 (R$)</label>
          <label className="flex items-center gap-2"><input type="radio" name="currency" value="usd" defaultChecked={currency === "usd"} /> 달러 ($)</label>
        </div>
      </fieldset>
      {state?.ok && <p className="text-[13px] text-up">{state.ok}</p>}
      {state?.error && <p className="text-[13px] text-down">{state.error}</p>}
      <button className="btn btn-primary justify-center" disabled={pending}>{pending ? "저장 중…" : "저장"}</button>
    </form>
  );
}
