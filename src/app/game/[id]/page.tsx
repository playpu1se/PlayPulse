import Link from "next/link";
import { notFound } from "next/navigation";
import { GameIcon, RankingList, Trend } from "@/components/GameBits";
import { Estimate, Money } from "@/components/Money";
import { GameCharts } from "./GameCharts";
import { GameActions } from "./GameActions";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { now } from "@/lib/db";
import { compact, dateKo, pct, robloxUrl } from "@/lib/format";
import { gameDetail, gameSeries, periods, similarGames, type Granularity } from "@/lib/cached";
import { isSubscribed, listsContaining, userLists } from "@/lib/userdata";

export const dynamic = "force-dynamic";

const RANGES: Record<string, { days: number; g: Granularity; label: string }> = {
  "1d": { days: 1, g: "raw", label: "하루" },
  "7d": { days: 7, g: "hour", label: "1주" },
  "30d": { days: 30, g: "hour", label: "1달" },
  all: { days: 3650, g: "day", label: "전체" },
};

export default async function GamePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const { id } = await params;
  const { range = "7d" } = await searchParams;
  const uid = Number(id);
  const d = Number.isFinite(uid) ? await gameDetail(uid) : null;
  if (!d) notFound();
  const r = RANGES[range] ?? RANGES["7d"];
  const [series, per, similar, user] = await Promise.all([gameSeries(uid, r.days, r.g), periods(uid), similarGames(uid), currentUser()]);
  const admin = isAdminEmail(user?.email);
  const [subscribed, lists, inLists] = user ? await Promise.all([isSubscribed(user.id, uid), userLists(user.id), listsContaining(user.id, uid)]) : [false, [], []];
  const c = d.card;
  const url = robloxUrl(c.rootPlaceId);
  const since = Math.round((now() - d.firstSeen) / 3600);

  return (
    <div className="space-y-5">
      <Link href="/search" className="text-[13px] text-ink-3 hover:underline">
        ← 게임 찾기
      </Link>

      <section className="flex flex-col gap-4 md:flex-row md:items-start">
        <GameIcon url={c.iconUrl} name={c.name} size={96} />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="font-display text-[26px] font-bold leading-tight">{c.name}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
            {c.creatorName && <span className="chip">만든이 {c.creatorName}{d.creatorType === "Group" ? " (그룹)" : ""}</span>}
            {c.genre && <span className="chip">{c.genre}</span>}
            <span className="chip">{c.earnRank ? `수익 순위 #${c.earnRank}` : "수익 순위 밖"}</span>
            <span className="chip">{c.ccuRank ? `접속자 순위 #${c.ccuRank}` : "접속자 순위 밖"}</span>
            {d.createdRoblox && <span className="chip">만든 날 {d.createdRoblox.slice(0, 10)}</span>}
            {d.updatedRoblox && <span className="chip">업데이트 {d.updatedRoblox.slice(0, 10)}</span>}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {url && (
              <a href={url} target="_blank" rel="noreferrer" className="btn">
                로블록스에서 보기 ↗
              </a>
            )}
            <GameActions
              uid={uid}
              loggedIn={!!user}
              subscribed={subscribed}
              lists={lists}
              inLists={inLists}
            />
          </div>
        </div>
      </section>

      {/* 핵심: 수익 */}
      <section className="card overflow-hidden">
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          <Big label="하루 수익" tag>
            <Money robux={c.estDaily} className="text-[26px] font-bold text-money" />
            <div className="text-[12px] text-ink-3">
              범위 <Money robux={d.range.low} /> ~ <Money robux={d.range.high} />
            </div>
          </Big>
          <Big label="30일 수익" tag>
            <Money robux={c.estMonthly} className="text-[26px] font-bold text-money" />
            <div className="text-[12px] text-ink-3">지난 24시간 기준 × 30</div>
          </Big>
          <Big label="방문당 수익" tag>
            <Money robux={c.rpv} precise className="text-[22px] font-bold" />
            <div className="text-[12px] text-ink-3">하루 방문 {compact(c.visitsPerDay)}</div>
          </Big>
          <Big label="지금 접속자">
            <span className="num text-[26px] font-bold">{compact(c.playing)}</span>
            <div className="text-[12px] text-ink-3">
              24시간 평균 {compact(c.avgCcu24h)} · <Trend v={c.trend} />
            </div>
          </Big>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
          <span>총 방문 {compact(c.visits, 2)}</span>
          <span>즐겨찾기 {compact(d.favorites)}</span>
          <span>좋아요 {c.likeRatio == null ? "—" : Math.round(c.likeRatio * 100) + "%"}</span>
          <span>기록 시작 {dateKo(d.firstSeen)} ({since}시간치)</span>
          {admin && (
            <Link href="/how-we-estimate" className="ml-auto font-semibold text-pulse hover:underline">
            수익 계산법 →
          </Link>
          )}
        </div>
      </section>

      {/* 기간 표 */}
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-[14px]">
          <thead className="bg-surface-2 text-left text-[12px] text-ink-3">
            <tr>
              <th className="px-4 py-2 font-semibold">기간</th>
              <th className="px-4 py-2 font-semibold">평균 접속자</th>
              <th className="px-4 py-2 font-semibold">방문</th>
              <th className="px-4 py-2 font-semibold">
                하루 평균 수익 <Estimate />
              </th>
            </tr>
          </thead>
          <tbody>
            {per.map((p) => (
              <tr key={p.days} className="border-t border-line">
                <td className="px-4 py-2.5 font-semibold">
                  {p.days}일
                  {!p.ready && <div className="text-[11px] font-normal text-ink-3">모으는 중 · {Math.round(p.coveredHours)}시간치</div>}
                </td>
                <td className="num px-4 py-2.5">
                  {compact(p.avgCcu)} <Change v={p.change.avgCcu} />
                </td>
                <td className="num px-4 py-2.5">
                  {compact(p.visits)} <Change v={p.change.visits} />
                </td>
                <td className="px-4 py-2.5">
                  <Money robux={p.avgDaily} className="font-semibold text-money" /> <Change v={p.change.avgDaily} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 그래프 */}
      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-bold">그래프</h2>
          <div className="flex rounded-lg border border-line p-0.5 text-[12px]">
            {Object.entries(RANGES).map(([k, v]) => (
              <Link key={k} href={`/game/${uid}?range=${k}`} scroll={false} className={"rounded-md px-2.5 py-1 font-semibold " + (range === k ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2")}>
                {v.label}
              </Link>
            ))}
          </div>
        </div>
        <GameCharts series={series} history={d.dailyHistory} forecast={d.forecast} />
      </section>

      {d.description && (
        <section className="card p-4">
          <h2 className="mb-2 text-[16px] font-bold">게임 설명</h2>
          <p className="line-clamp-[12] whitespace-pre-line text-[14px] text-ink-2">{d.description}</p>
        </section>
      )}

      {similar.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-1 text-[16px] font-bold">비슷한 게임 비교</h2>
          <p className="mb-2 text-[12px] text-ink-3">같은 장르에서 접속자가 비슷한 게임</p>
          <RankingList items={similar} />
        </section>
      )}
    </div>
  );
}

function Big({ label, tag, children }: { label: string; tag?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1 bg-surface p-4">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">
        {label} {tag && <Estimate />}
      </div>
      {children}
    </div>
  );
}

function Change({ v }: { v: number | null }) {
  if (v == null) return null;
  return <span className={"num text-[12px] font-semibold " + (v >= 0 ? "text-up" : "text-down")}>{pct(v)}</span>;
}
