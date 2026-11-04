// PlayPulse 로고: 빨간 둥근 네모 + 흰 플레이 삼각형 + 그 앞을 지나는 맥박 선
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--pulse)" />
      <path d="M12 8v16l12.5-8z" fill="#fff" opacity="0.35" />
      <path d="M4 17h6l2.4-6 3.6 12 3-8.5 1.6 2.5H28" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-[19px] font-bold tracking-tight">
        Play<span className="text-pulse">Pulse</span>
      </span>
    </span>
  );
}
