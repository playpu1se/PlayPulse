import type { Metadata } from "next";
import { Noto_Sans_KR, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Logo } from "@/components/Logo";
import { HeaderControls } from "@/components/HeaderControls";
import { currentUser, isAdminEmail, signupOpen } from "@/lib/auth";
import { unreadCount } from "@/lib/userdata";
import { stats } from "@/lib/cached";
import { ago } from "@/lib/format";

const body = Noto_Sans_KR({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "700"] });
const head = Space_Grotesk({ variable: "--font-head", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "PlayPulse — 로블록스 게임 수익·접속자 분석",
  description: "로블록스 게임의 접속자·방문·추정 수익을 한눈에.",
};

export const dynamic = "force-dynamic";

const ADMIN_NAV = { href: "/how-we-estimate", label: "수익 계산법" };

const NAV = [
  { href: "/", label: "순위" },
  { href: "/search", label: "게임 찾기" },
  { href: "/trending", label: "급성장" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const admin = isAdminEmail(user?.email);
  const [unread, s, canSignup] = await Promise.all([user ? unreadCount(user.id) : 0, stats(), signupOpen()]);
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 저장된 테마를 그리기 전에 적용 (깜빡임 막기) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("pp_theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className={`${body.variable} ${head.variable} font-sans antialiased`}>
        <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
            <Link href="/" aria-label="PlayPulse 첫 화면">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {(admin ? [...NAV, ADMIN_NAV] : NAV).map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-[14px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              <HeaderControls user={user ? { name: user.displayName ?? user.email.split("@")[0], currency: user.currency } : null} unread={unread} canSignup={canSignup} />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
            {(admin ? [...NAV, ADMIN_NAV] : NAV).map((n) => (
              <Link key={n.href} href={n.href} className="shrink-0 rounded-lg px-3 py-1 text-[13px] font-medium text-ink-2 hover:bg-surface-2">
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-[12px] text-ink-3">
          <div className="border-t border-line pt-4">
            PlayPulse · 로블록스 공개 정보로 만든 분석이에요. 수익은 모두 추정이에요. · 마지막 수집 {ago(s.last)} · 추적 게임 {s.games.toLocaleString()}개
            <br />
            Roblox 와 관계없는 개인 프로젝트예요.
          </div>
        </footer>
      </body>
    </html>
  );
}
