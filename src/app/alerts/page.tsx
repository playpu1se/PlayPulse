import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { notifications, subscriptions, unreadCount } from "@/lib/userdata";
import { cardsFor } from "@/lib/cached";
import { ago } from "@/lib/format";
import { AccountShell } from "@/components/AccountNav";
import { GameIcon } from "@/components/GameBits";
import { MarkReadButton } from "@/components/MarkReadButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "알림 — PlayPulse" };

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/alerts");
  const [items, unread, subIds] = await Promise.all([notifications(user.id), unreadCount(user.id), subscriptions(user.id)]);
  const cards = await cardsFor(subIds);
  const subs = subIds.map((i) => cards.get(i)).filter((g) => !!g);
  return (
    <AccountShell active="/alerts" unread={unread}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">알림</h1>
        {unread > 0 && <MarkReadButton />}
      </div>
      <p className="mb-4 text-[14px] text-ink-3">🔔를 켠 게임의 접속자가 하루 전보다 50% 넘게 늘거나 줄면 여기에 알려 드려요.</p>
      {items.length === 0 ? (
        <p className="card p-6 text-center text-[14px] text-ink-3">아직 알림이 없어요. 게임 화면에서 🔔를 켜 보세요.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-3 p-3">
              <span className={"mt-2 size-2 shrink-0 rounded-full " + (n.read ? "bg-transparent" : "bg-pulse")} aria-label={n.read ? "읽음" : "안 읽음"} />
              {n.universeId && <GameIcon url={n.iconUrl} name={n.gameName ?? "?"} size={36} />}
              <div className="min-w-0 flex-1">
                <p className="break-words text-[14px]">{n.message}</p>
                <p className="text-[12px] text-ink-3">
                  {n.universeId && <Link href={`/game/${n.universeId}`} className="font-semibold hover:underline">{n.gameName ?? "게임 보기"}</Link>}
                  {n.universeId && " · "}
                  {ago(n.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mb-2 mt-8 text-lg font-bold">알림을 켜 둔 게임</h2>
      {subs.length === 0 ? (
        <p className="text-[14px] text-ink-3">알림을 켠 게임이 없어요.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {subs.map((g) => (
            <li key={g.universeId}>
              <Link href={`/game/${g.universeId}`} className="card flex items-center gap-3 p-3 hover:shadow-md">
                <GameIcon url={g.iconUrl} name={g.name} size={36} />
                <span className="min-w-0 truncate text-[14px] font-semibold">🔔 {g.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
