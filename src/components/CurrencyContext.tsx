"use client";
// 화폐(R$ / $) 고르기. 로그인 안 했으면 이 브라우저에만 기억해요.
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Currency } from "@/lib/format";

const KEY = "pp_currency";
const listeners = new Set<() => void>();

function read(): Currency {
  try {
    return localStorage.getItem(KEY) === "usd" ? "usd" : "robux";
  } catch {
    return "robux";
  }
}

function write(c: Currency) {
  try {
    localStorage.setItem(KEY, c);
  } catch {}
  listeners.forEach((l) => l());
}

export function useCurrency(serverDefault?: Currency) {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => serverDefault ?? "robux",
  );
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    // 로그인한 사람의 저장값을 처음 한 번 브라우저에 맞춰요
    if (!seeded && serverDefault) {
      try {
        if (!localStorage.getItem(KEY)) write(serverDefault);
      } catch {}
      setSeeded(true);
    }
  }, [seeded, serverDefault]);
  return { currency: value, setCurrency: write };
}
