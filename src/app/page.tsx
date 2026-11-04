import Link from "next/link";
import { RankingList } from "@/components/GameBits";
import { Estimate } from "@/components/Money";
import { PlatformChart } from "@/components/PlatformChart";
import { compact, ago } from "@/lib/format";
import { platformSeries, RANKINGS, ranking, stats } from "@/lib/cached";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range = "1w" } = await searchParams;
  const days = range === "1d" ? 1 : range === "1m" ? 30 : range === "all" ? 3650 : 7;
  const [plat, s] = await Promise.all([platformSeries(days), stats()]);
  const last = plat.points[plat.points.length - 1];
  const lists = await Promise.all(RANKINGS.map(async (r) => ({ ...r, items: await ranking(r.kind, 100) })));

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight md:text-[34px]">
          로블록스가 <span className="text-pulse">얼마나 플레이되고</span>, <span className="text-money">얼마나 버는지</span>
        </h1>
        <p className="text-[15px] text-ink-2">
          공개 숫자를 30분마다 모아 접속자·방문·추정 수익을 보여 줘요. 잠긴 칸 없이 모두 무료예요.
        </p>
      </section>

      <section className="card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">추적 중인 게임 전체 접속자</h2>
            <p className="text-[12px] text-ink-3">
              인기 차트에 오른 게임 {s.games.toLocaleString()}개의 합계 · 마지막 수집 {ago(s.last)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="num font-display text-[24px] font-bold">{compact(last?.total ?? null)}</span>
            <div className="flex rounded-lg border border-line p-0.5 text-[12px]">
              {[
                ["1d", "하루"],
                ["1w", "1주"],
                ["1m", "1달"],
                ["all", "전체"],
              ].map(([k, l]) => (
                <Link key={k} href={`/?range=${k}`} className={"rounded-md px-2.5 py-1 font-semibold " + (range === k ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2")}>
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <PlatformChart points={plat.points} games={plat.games} />
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {lists.map((r) => (
          <div key={r.kind} className="card p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[16px] font-bold">
                {r.title} {(r.kind === "earning" || r.kind === "rpv") && <Estimate />}
              </h2>
              <Link href={`/rankings/${r.kind}`} className="text-[13px] font-semibold text-pulse hover:underline">
                100위까지 →
              </Link>
            </div>
            <p className="mb-2 text-[12px] text-ink-3">{r.desc}</p>
            <RankingList items={r.items} limit={10} show={r.kind === "playing" ? "playing" : r.kind === "rpv" ? "rpv" : "revenue"} />
          </div>
        ))}
      </section>
    </div>
  );
}
