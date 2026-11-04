import Link from "next/link";

const ITEMS = [
  { href: "/dashboard", label: "내 게임" },
  { href: "/lists", label: "내 목록" },
  { href: "/alerts", label: "알림" },
  { href: "/settings", label: "설정" },
];

export function AccountNav({ active, unread = 0 }: { active: string; unread?: number }) {
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-line pb-2 md:mb-0 md:w-40 md:shrink-0 md:flex-col md:border-b-0 md:pb-0">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={"shrink-0 rounded-lg px-3 py-2 text-[14px] font-semibold " + (active === i.href ? "bg-pulse-soft text-pulse" : "text-ink-2 hover:bg-surface-2")}
        >
          {i.label}
          {i.href === "/alerts" && unread > 0 ? <span className="num ml-1.5 rounded-full bg-pulse px-1.5 text-[11px] text-white">{unread}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function AccountShell({ active, unread, children }: { active: string; unread?: number; children: React.ReactNode }) {
  return (
    <div className="md:flex md:gap-8">
      <AccountNav active={active} unread={unread} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
