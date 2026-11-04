import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { myGames, unreadCount } from "@/lib/userdata";
import { cardsFor } from "@/lib/cached";
import { compact } from "@/lib/format";
import { AccountShell } from "@/components/AccountNav";
import { AddGameForm } from "@/components/AddGameForm";
import { GameIcon, Trend } from "@/components/GameBits";
import { Estimate, Money } from "@/components/Money";
import { removeMyGameAction } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "내 게임 — PlayPulse" };

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");
  const ids = await myGames(user.id);
  const [cards, unread] = await Promise.all([cardsFor(ids), unreadCount(user.id)]);
  const games = ids.map((id) => cards.get(id)).filter((g) => !!g);
  const total = games.reduce((s, g) => s + g.estMonthly, 0);
  return (
    <AccountShell active="/dashboard" unread={unread}>
      <h1 className="mb-4 text-2xl font-bold">내 게임</h1>
      <AddGameForm />
      {games.length > 0 && (
        <div className="card mt-4 flex flex-wrap items-baseline justify-between gap-2 bg-money-soft p-4">
          <div className="text-[13px] font-semibold text-money">내 게임 {games.length}개의 30일 추정 수익 합계 <Estimate /></div>
          <Money robux={total} className="text-2xl font-bold text-money" />
        </div>
      )}
      {games.length === 0 ? (
        <div className="card mt-4 p-6 text-center text-[14px] text-ink-2">
          <p className="font-semibold">아직 추가한 게임이 없어요.</p>
          <p className="mt-1 text-ink-3">내가 만들었거나 지켜보고 싶은 게임의 로블록스 주소를 위에 붙여 넣어 보세요.</p>
          <p className="mt-1 text-ink-3">추가하면 접속자와 추정 수익을 한곳에서 볼 수 있어요.</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {games.map((g) => (
            <li key={g.universeId} className="card p-4">
              <div className="flex items-center gap-3">
                <GameIcon url={g.iconUrl} name={g.name} size={48} />
                <div className="min-w-0 flex-1">
                  <Link href={`/game/${g.universeId}`} className="block truncate text-[15px] font-bold hover:underline">{g.name}</Link>
                  <div className="text-[12px] text-ink-3">{g.earnRank ? `수익 순위 #${g.earnRank}` : "수익 순위 밖"}</div>
                </div>
                <form action={removeMyGameAction}>
                  <input type="hidden" name="universeId" value={g.universeId} />
                  <button className="btn px-2.5 py-1 text-[12px]" aria-label={`${g.name} 빼기`}>빼기</button>
                </form>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px] sm:grid-cols-5">
                <Cell label="지금 접속"><span className="num font-semibold">{compact(g.playing)}</span></Cell>
                <Cell label="24시간 변화"><Trend v={g.trend} /></Cell>
                <Cell label={<>하루 수익 <Estimate /></>}><Money robux={g.estDaily} className="font-semibold text-money" /></Cell>
                <Cell label={<>30일 수익 <Estimate /></>}><Money robux={g.estMonthly} className="font-bold text-money" /></Cell>
                <Cell label="방문당 수익"><Money robux={g.rpv} precise className="font-semibold" /></Cell>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}

function Cell({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
