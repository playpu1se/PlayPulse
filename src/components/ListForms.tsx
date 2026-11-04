"use client";
import { useState, useTransition } from "react";
import { deleteListAction, toggleListItemAction } from "@/app/actions";

export function DeleteListButton({ listId }: { listId: number }) {
  const [sure, setSure] = useState(false);
  if (!sure) return <button type="button" className="btn text-down" onClick={() => setSure(true)}>목록 지우기</button>;
  return (
    <form action={deleteListAction} className="flex items-center gap-2">
      <input type="hidden" name="listId" value={listId} />
      <span className="text-[13px] text-ink-2">정말 지울까요?</span>
      <button className="btn bg-down text-white">지우기</button>
      <button type="button" className="btn" onClick={() => setSure(false)}>아니요</button>
    </form>
  );
}

export function RemoveFromListButton({ listId, uid }: { listId: number; uid: number }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn w-full justify-center text-[12px]" disabled={pending} onClick={() => start(() => toggleListItemAction(listId, uid, false))}>
      {pending ? "빼는 중…" : "목록에서 빼기"}
    </button>
  );
}
