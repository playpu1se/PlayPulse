// 게임 아이콘 · 카드 · 순위 표
import Link from "next/link";
import type { GameCard } from "@/lib/queries";
import { compact, pct } from "@/lib/format";
import { Money } from "./Money";

export function GameIcon({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-[10px] bg-surface-2 object-cover" style={{ width: size, height: size }} loading="lazy" />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-[10px] bg-surface-2 font-bold text-ink-3" style={{ width: size, height: size }}>
      {name.slice(0, 1)}
    </span>
  );
}

export function Trend({ v }: { v: number | null }) {
  if (v == null) return <span className="text-ink-3">—</span>;
  return <span className={"num font-semibold " + (v > 0 ? "text-up" : v < 0 ? "text-down" : "text-ink-3")}>{pct(v)}</span>;
}

export function RankingList({ items, show = "revenue", limit }: { items: GameCard[]; show?: "revenue" | "playing" | "rpv"; limit?: number }) {
  const list = limit ? items.slice(0, limit) : items;
  if (list.length === 0) return <p className="py-6 text-center text-[14px] text-ink-3">아직 데이터를 모으는 중이에요.</p>;
  return (
    <ol className="divide-y divide-line">
      {list.map((g, i) => (
        <li key={g.universeId}>
          <Link href={`/game/${g.universeId}`} className="flex items-center gap-3 px-1 py-2.5 hover:bg-surface-2/60">
            <span className="num w-7 text-right text-[13px] font-bold text-ink-3">{i + 1}</span>
            <GameIcon url={g.iconUrl} name={g.name} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{g.name}</span>
              <span className="num block text-[12px] text-ink-3">
                접속 {compact(g.playing)} · 좋아요 {g.likeRatio == null ? "—" : Math.round(g.likeRatio * 100) + "%"}
              </span>
            </span>
            <span className="text-right">
              {show === "playing" ? (
                <span className="num block text-[14px] font-bold">{compact(g.playing)}</span>
              ) : show === "rpv" ? (
                <Money robux={g.rpv} precise className="block text-[14px] font-bold text-money" />
              ) : (
                <Money robux={g.estMonthly} className="block text-[14px] font-bold text-money" />
              )}
              <span className="block text-[11px] text-ink-3">{show === "playing" ? "지금 접속" : show === "rpv" ? "방문당" : "30일 추정"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function GameTile({ g }: { g: GameCard }) {
  return (
    <Link href={`/game/${g.universeId}`} className="card flex flex-col gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <GameIcon url={g.iconUrl} name={g.name} size={52} />
        <div className="min-w-0">
          <div className="line-clamp-2 text-[14px] font-semibold leading-snug">{g.name}</div>
          <div className="truncate text-[12px] text-ink-3">{g.creatorName ?? ""}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
        <Stat label="접속자" value={compact(g.playing)} />
        <Stat label="총 방문" value={compact(g.visits)} />
        <Stat label="좋아요" value={g.likeRatio == null ? "—" : Math.round(g.likeRatio * 100) + "%"} />
        <div>
          <div className="text-ink-3">24시간</div>
          <Trend v={g.trend} />
        </div>
      </div>
      <div className="flex items-baseline justify-between rounded-lg bg-money-soft px-2.5 py-1.5">
        <span className="text-[11px] font-semibold text-money">30일 추정 수익</span>
        <Money robux={g.estMonthly} className="text-[14px] font-bold text-money" />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-3">{label}</div>
      <div className="num font-semibold">{value}</div>
    </div>
  );
}
