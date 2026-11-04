"use client";
// 게임 상세 버튼: 알림 받기(🔔) · 목록에 넣기
import Link from "next/link";
import { useState, useTransition } from "react";
import { createListAction, toggleListItemAction, toggleSubscribeAction } from "@/app/actions";

type Props = { uid: number; loggedIn: boolean; subscribed: boolean; lists: { id: number; name: string }[]; inLists: number[] };

export function GameActions({ uid, loggedIn, subscribed, lists, inLists }: Props) {
  const [sub, setSub] = useState(subscribed);
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(new Set(inLists));
  const [, start] = useTransition();

  if (!loggedIn) {
    return (
      <Link href={`/login?next=/game/${uid}`} className="btn">
        로그인하고 목록·알림 쓰기
      </Link>
    );
  }

  return (
    <>
      <button
        className={"btn " + (sub ? "!border-pulse !bg-pulse-soft !text-pulse" : "")}
        onClick={() => {
          const next = !sub;
          setSub(next);
          start(() => toggleSubscribeAction(uid, next));
        }}
        title="접속자가 크게 바뀌면 알려 줘요"
      >
        {sub ? "🔔 알림 받는 중" : "🔔 알림 받기"}
      </button>
      <div className="relative">
        <button className="btn" onClick={() => setOpen((o) => !o)}>
          ☰ 목록에 넣기{mine.size ? ` (${mine.size})` : ""}
        </button>
        {open && (
          <div className="card absolute left-0 top-11 z-20 w-64 space-y-1 p-2 shadow-lg">
            {lists.length === 0 && <p className="px-2 py-1 text-[13px] text-ink-3">아직 목록이 없어요. 아래에서 만들어요.</p>}
            {lists.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={mine.has(l.id)}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setMine((s) => {
                      const n = new Set(s);
                      if (on) n.add(l.id);
                      else n.delete(l.id);
                      return n;
                    });
                    start(() => toggleListItemAction(l.id, uid, on));
                  }}
                />
                <span className="truncate">{l.name}</span>
              </label>
            ))}
            <form action={createListAction} className="flex gap-1.5 border-t border-line pt-2" onSubmit={() => setOpen(false)}>
              <input type="hidden" name="universeId" value={uid} />
              <input name="name" placeholder="새 목록 이름" className="input !py-1.5" required maxLength={60} />
              <button className="btn btn-primary shrink-0 whitespace-nowrap !px-3 !py-1.5">만들기</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
