import Link from "next/link";
import { GameTile } from "@/components/GameBits";
import { feed, ranking, stats } from "@/lib/cached";

export const dynamic = "force-dynamic";

export default async function TrendingPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode = "explosive" } = await searchParams;
  const m = mode === "steady" ? "steady" : mode === "new" ? "new" : "explosive";
  const s = await stats();
  const hours = s.since && s.last ? (s.last - s.since) / 3600 : 0;
  const items = m === "new" ? await ranking("rising", 60) : await feed(m, 60);
  const tabs: [string, string][] = [
    ["explosive", "폭발 성장"],
    ["steady", "꾸준한 성장"],
    ["new", "새로 뜨는 게임"],
  ];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold">급성장 게임</h1>
        <p className="text-[13px] text-ink-3">
          하루 전보다 접속자가 늘어난 게임이에요(접속자 200명 이상). 기록이 하루보다 짧으면 가장 오래된 기록과 비교해요 · 지금 기록 {hours.toFixed(1)}시간치
        </p>
      </div>
      <div className="flex gap-1.5">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/trending?mode=${k}`} className={"chip !py-1 !text-[13px] " + (m === k ? "!bg-ink !text-bg" : "")}>
            {l}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="card p-10 text-center text-ink-3">아직 비교할 기록이 부족해요. 수집이 몇 번 더 돌면 채워져요.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((g) => (
            <GameTile key={g.universeId} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}
