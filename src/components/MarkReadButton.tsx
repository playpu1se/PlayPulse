"use client";
import { useTransition } from "react";
import { markAllReadAction } from "@/app/actions";

export function MarkReadButton() {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn" disabled={pending} onClick={() => start(() => markAllReadAction())}>
      {pending ? "처리 중…" : "모두 읽음"}
    </button>
  );
}
