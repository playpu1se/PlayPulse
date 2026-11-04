"use client";
// 위 막대 오른쪽: 화폐 전환 · 테마 · 알림 · 로그인/계정
import Link from "next/link";
import { useEffect, useState } from "react";
import { logoutAction, setCurrencyAction } from "@/app/actions";
import { useCurrency } from "./CurrencyContext";

type Props = { user: { name: string; currency: "robux" | "usd" } | null; unread: number; canSignup?: boolean };

export function HeaderControls({ user, unread, canSignup = true }: Props) {
  const { currency, setCurrency } = useCurrency(user?.currency);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem("pp_theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);

  function cycleTheme() {
    const next = theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
    setTheme(next);
    try {
      if (next === "system") {
        localStorage.removeItem("pp_theme");
        delete document.documentElement.dataset.theme;
      } else {
        localStorage.setItem("pp_theme", next);
        document.documentElement.dataset.theme = next;
      }
    } catch {}
  }

  function toggleCurrency() {
    const next = currency === "robux" ? "usd" : "robux";
    setCurrency(next);
    if (user) void setCurrencyAction(next);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={toggleCurrency} className="btn !px-2.5 !py-1 text-[13px]" title="수익을 Robux 또는 달러로 보기">
        {currency === "robux" ? "R$" : "$"}
      </button>
      <button onClick={cycleTheme} className="btn !px-2.5 !py-1 text-[13px]" title="화면 밝기">
        {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️"}
      </button>
      {user ? (
        <>
          <Link href="/alerts" className="btn relative !px-2.5 !py-1 text-[13px]" title="알림">
            🔔
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-pulse px-1.5 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>
            )}
          </Link>
          <div className="relative">
            <button onClick={() => setOpen((o) => !o)} className="btn whitespace-nowrap !py-1 text-[13px]" title={user.name}>
              <span className="sm:hidden">👤</span>
              <span className="hidden max-w-[120px] truncate sm:inline">{user.name}</span> ▾
            </button>
            {open && (
              <div className="card absolute right-0 top-10 z-40 w-44 p-1.5 shadow-lg" onMouseLeave={() => setOpen(false)}>
                {[
                  ["/dashboard", "내 게임"],
                  ["/lists", "내 목록"],
                  ["/alerts", "알림"],
                  ["/settings", "설정"],
                ].map(([h, l]) => (
                  <Link key={h} href={h} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-[14px] hover:bg-surface-2">
                    {l}
                  </Link>
                ))}
                <form action={logoutAction}>
                  <button className="w-full rounded-lg px-3 py-2 text-left text-[14px] text-ink-2 hover:bg-surface-2">로그아웃</button>
                </form>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <Link href="/login" className="btn !py-1 text-[13px]">
            로그인
          </Link>
          {canSignup && (
            <Link href="/signup" className="btn btn-primary !py-1 text-[13px]">
              가입
            </Link>
          )}
        </>
      )}
    </div>
  );
}
