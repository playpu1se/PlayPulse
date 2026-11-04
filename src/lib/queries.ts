// 화면이 쓰는 읽기 함수 모음. 수익 숫자는 모두 estimate.ts 로 계산해요.
import { getDb, now, type Arg, type Row } from "./db";
import { dailyRevenue, forecast, likeRatio, revenuePerVisit, revenueRange } from "./estimate";

export type GameCard = {
  universeId: number;
  rootPlaceId: number | null;
  name: string;
  creatorName: string | null;
  genre: string | null;
  iconUrl: string | null;
  playing: number;
  visits: number;
  likeRatio: number | null;
  earnRank: number | null;
  ccuRank: number | null;
  avgCcu24h: number;
  visitsPerDay: number | null;
  estDaily: number; // R$
  estMonthly: number; // R$ 30일
  rpv: number | null;
  trend: number | null; // 24시간 전 대비 접속자 변화율
};

const n = (v: unknown) => (v == null ? null : Number(v));

export async function latestRunTs(): Promise<number | null> {
  const r = await (await getDb()).get("SELECT MAX(ts) t FROM runs WHERE games > 0");
  return n(r?.t);
}

async function latestChartTs(sortId: string): Promise<number | null> {
  const r = await (await getDb()).get("SELECT MAX(ts) t FROM chart_ranks WHERE sort_id = ?", [sortId]);
  return n(r?.t);
}

/** 여러 게임의 카드 정보를 한 번에 (최근 24시간 기준 추정) */
export async function cardsFor(ids: number[]): Promise<Map<number, GameCard>> {
  const out = new Map<number, GameCard>();
  if (ids.length === 0) return out;
  const db = await getDb();
  const t = now();
  const ph = ids.map(() => "?").join(",");
  const earnTs = await latestChartTs("top-earning");
  const ccuTs = await latestChartTs("top-playing-now");
  const rows = await db.all(
    `SELECT g.*, s.avg_ccu, s.min_v, s.max_v, s.min_ts, s.max_ts,
        (SELECT rank FROM chart_ranks WHERE sort_id='top-earning' AND ts=? AND universe_id=g.universe_id) earn_rank,
        (SELECT rank FROM chart_ranks WHERE sort_id='top-playing-now' AND ts=? AND universe_id=g.universe_id) ccu_rank,
        (SELECT playing FROM snapshots WHERE universe_id=g.universe_id AND ts <= ? ORDER BY ts DESC LIMIT 1) old_playing,
        (SELECT playing FROM snapshots WHERE universe_id=g.universe_id ORDER BY ts ASC LIMIT 1) first_playing
       FROM games g LEFT JOIN (
         SELECT universe_id, AVG(playing) avg_ccu, MIN(visits) min_v, MAX(visits) max_v, MIN(ts) min_ts, MAX(ts) max_ts
         FROM snapshots WHERE ts > ? AND universe_id IN (${ph}) GROUP BY universe_id
       ) s USING (universe_id)
       WHERE g.universe_id IN (${ph})`,
    [earnTs ?? -1, ccuTs ?? -1, t - 86400, t - 86400, ...ids, ...ids],
  );
  for (const r of rows) {
    const avg = n(r.avg_ccu) ?? n(r.playing) ?? 0;
    const span = (n(r.max_ts) ?? 0) - (n(r.min_ts) ?? 0);
    const vpd = span >= 1800 ? (((n(r.max_v) ?? 0) - (n(r.min_v) ?? 0)) / span) * 86400 : null;
    const earn = n(r.earn_rank);
    const ccu = n(r.ccu_rank);
    const est = dailyRevenue(avg, ((r.genre_l1 as string) ?? (r.genre as string)) || null, earn, ccu);
    const old = n(r.old_playing) ?? n(r.first_playing);
    const playing = n(r.playing) ?? 0;
    out.set(Number(r.universe_id), {
      universeId: Number(r.universe_id),
      rootPlaceId: n(r.root_place_id),
      name: String(r.name),
      creatorName: (r.creator_name as string) ?? null,
      genre: (r.genre_l1 as string) ?? (r.genre as string) ?? null,
      iconUrl: (r.icon_url as string) ?? null,
      playing,
      visits: n(r.visits) ?? 0,
      likeRatio: likeRatio(n(r.up_votes), n(r.down_votes)),
      earnRank: earn,
      ccuRank: ccu,
      avgCcu24h: avg,
      visitsPerDay: vpd,
      estDaily: est,
      estMonthly: est * 30,
      rpv: revenuePerVisit(est, vpd),
      trend: old && old > 0 ? (playing - old) / old : null,
    });
  }
  return out;
}

export type RankingKind = "earning" | "playing" | "trending" | "rising" | "revisited" | "rpv";

export const RANKINGS: { kind: RankingKind; title: string; desc: string }[] = [
  { kind: "earning", title: "수익 순위", desc: "로블록스 공식 수익 순위 순서 · 금액은 우리 추정" },
  { kind: "playing", title: "지금 접속자 순위", desc: "지금 가장 많이 하는 게임" },
  { kind: "rpv", title: "방문당 수익", desc: "수익 순위 안 게임 중 한 번 방문에 가장 많이 버는 게임(추정)" },
  { kind: "trending", title: "급상승", desc: "로블록스 공식 급상승 차트" },
  { kind: "rising", title: "새로 뜨는 게임", desc: "로블록스 공식 「새로 뜨는」 차트" },
  { kind: "revisited", title: "다시 찾는 게임", desc: "플레이어가 자주 돌아오는 게임" },
];

const SORT_OF: Record<Exclude<RankingKind, "rpv">, string> = {
  earning: "top-earning",
  playing: "top-playing-now",
  trending: "top-trending",
  rising: "up-and-coming",
  revisited: "top-revisited",
};

export async function ranking(kind: RankingKind, limit = 100): Promise<GameCard[]> {
  const db = await getDb();
  const sortId = kind === "rpv" ? "top-earning" : SORT_OF[kind];
  const ts = await latestChartTs(sortId);
  if (ts == null) return [];
  const ids = (
    await db.all("SELECT universe_id FROM chart_ranks WHERE sort_id = ? AND ts = ? ORDER BY rank LIMIT ?", [sortId, ts, kind === "rpv" ? 500 : limit])
  ).map((r) => Number(r.universe_id));
  const cards = await cardsFor(ids);
  let list = ids.map((id) => cards.get(id)).filter((c): c is GameCard => !!c);
  if (kind === "rpv") list = list.filter((c) => c.rpv != null).sort((a, b) => (b.rpv ?? 0) - (a.rpv ?? 0)).slice(0, limit);
  return list;
}

export type SearchSort = "playing" | "revenue" | "visits" | "like" | "rpv" | "trend";
export type SearchOpts = { q?: string; genre?: string; minPlaying?: number; sort?: SearchSort; dir?: "asc" | "desc"; limit?: number; offset?: number };

export async function genres(): Promise<string[]> {
  return ((await (await getDb()).all("SELECT DISTINCT COALESCE(genre_l1, genre) genre FROM games WHERE COALESCE(genre_l1, genre) IS NOT NULL AND COALESCE(genre_l1, genre) NOT IN ('', 'All') ORDER BY 1"))).map((r) => String(r.genre));
}

export async function search(o: SearchOpts): Promise<{ total: number; items: GameCard[] }> {
  const db = await getDb();
  const where: string[] = [];
  const args: Arg[] = [];
  if (o.q?.trim()) {
    const q = o.q.trim();
    if (/^\d+$/.test(q)) {
      where.push("(universe_id = ? OR root_place_id = ?)");
      args.push(Number(q), Number(q));
    } else {
      where.push("(name LIKE ? OR creator_name LIKE ?)");
      args.push(`%${q}%`, `%${q}%`);
    }
  }
  if (o.genre) {
    where.push("COALESCE(genre_l1, genre) = ?");
    args.push(o.genre);
  }
  if (o.minPlaying) {
    where.push("playing >= ?");
    args.push(o.minPlaying);
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const ids = (await db.all(`SELECT universe_id FROM games ${w}`, args)).map((r) => Number(r.universe_id));
  const cards = [...(await cardsFor(ids)).values()];
  const key: Record<SearchSort, (c: GameCard) => number> = {
    playing: (c) => c.playing,
    revenue: (c) => c.estDaily,
    visits: (c) => c.visits,
    like: (c) => c.likeRatio ?? -1,
    rpv: (c) => c.rpv ?? -1,
    trend: (c) => c.trend ?? -99,
  };
  const k = key[o.sort ?? "playing"];
  const sign = o.dir === "asc" ? 1 : -1;
  cards.sort((a, b) => sign * (k(a) - k(b)));
  const off = o.offset ?? 0;
  return { total: cards.length, items: cards.slice(off, off + (o.limit ?? 48)) };
}

/** 급성장: 24시간 전(없으면 가장 오래된 기록)보다 접속자가 늘어난 게임 */
export async function feed(mode: "explosive" | "steady", limit = 60): Promise<GameCard[]> {
  const db = await getDb();
  const ids = (await db.all("SELECT universe_id FROM games WHERE playing >= 200")).map((r) => Number(r.universe_id));
  const cards = [...(await cardsFor(ids)).values()].filter((c) => c.trend != null && c.trend > 0);
  if (mode === "explosive") return cards.sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0)).slice(0, limit);
  // 꾸준한 성장: 늘긴 했지만 너무 튀지 않은(5~60%) 게임을 접속자 많은 순으로
  return cards
    .filter((c) => (c.trend ?? 0) >= 0.05 && (c.trend ?? 0) <= 0.6)
    .sort((a, b) => b.playing - a.playing)
    .slice(0, limit);
}

export type Granularity = "raw" | "hour" | "day" | "week";

export type SeriesPoint = {
  ts: number;
  playing: number | null;
  visits: number | null; // 그 칸 동안 늘어난 방문
  like: number | null;
  revenue: number | null; // 그 칸 기준 하루 수익 추정(R$/일)
  earnRank: number | null;
  ccuRank: number | null;
};

export async function gameSeries(uid: number, fromTs: number, g: Granularity): Promise<SeriesPoint[]> {
  const db = await getDb();
  const game = await db.get("SELECT COALESCE(genre_l1, genre) genre FROM games WHERE universe_id = ?", [uid]);
  const genre = (game?.genre as string) ?? null;
  const snaps = await db.all("SELECT ts, playing, visits, up_votes, down_votes FROM snapshots WHERE universe_id = ? AND ts >= ? ORDER BY ts", [uid, fromTs]);
  const ranks = await db.all("SELECT sort_id, ts, rank FROM chart_ranks WHERE universe_id = ? AND ts >= ? AND sort_id IN ('top-earning','top-playing-now')", [uid, fromTs]);
  const rankAt = new Map<string, number>();
  for (const r of ranks) rankAt.set(`${r.sort_id}:${r.ts}`, Number(r.rank));
  const size = g === "raw" ? 1 : g === "hour" ? 3600 : g === "day" ? 86400 : 7 * 86400;
  const buckets = new Map<number, Row[]>();
  for (const s of snaps) {
    const b = Math.floor(Number(s.ts) / size) * size;
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(s);
  }
  const out: SeriesPoint[] = [];
  let prevVisits: number | null = null;
  for (const [b, rows] of [...buckets.entries()].sort((a, c) => a[0] - c[0])) {
    const avg = rows.reduce((a, r) => a + Number(r.playing ?? 0), 0) / rows.length;
    const last = rows[rows.length - 1];
    const lastVisits = n(last.visits);
    const earn = rows.map((r) => rankAt.get(`top-earning:${r.ts}`)).find((x) => x != null) ?? null;
    const ccu = rows.map((r) => rankAt.get(`top-playing-now:${r.ts}`)).find((x) => x != null) ?? null;
    out.push({
      ts: b,
      playing: Math.round(avg),
      visits: prevVisits != null && lastVisits != null ? Math.max(0, lastVisits - prevVisits) : null,
      like: likeRatio(n(last.up_votes), n(last.down_votes)),
      revenue: dailyRevenue(avg, genre, earn, ccu),
      earnRank: earn,
      ccuRank: ccu,
    });
    prevVisits = lastVisits;
  }
  return out;
}

export type PeriodRow = {
  days: number;
  ready: boolean; // 그 기간만큼 데이터가 쌓였나
  coveredHours: number;
  avgCcu: number | null;
  visits: number | null;
  avgDaily: number | null;
  change: { avgCcu: number | null; visits: number | null; avgDaily: number | null };
};

async function periodStats(uid: number, genre: string | null, from: number, to: number) {
  const db = await getDb();
  const s = await db.get("SELECT AVG(playing) a, MIN(visits) v0, MAX(visits) v1, MIN(ts) t0, MAX(ts) t1, COUNT(*) c FROM snapshots WHERE universe_id = ? AND ts > ? AND ts <= ?", [uid, from, to]);
  if (!s || !Number(s.c)) return null;
  const earnAvg = await db.get("SELECT AVG(rank) r FROM chart_ranks WHERE universe_id = ? AND sort_id = 'top-earning' AND ts > ? AND ts <= ?", [uid, from, to]);
  const ccuAvg = await db.get("SELECT AVG(rank) r FROM chart_ranks WHERE universe_id = ? AND sort_id = 'top-playing-now' AND ts > ? AND ts <= ?", [uid, from, to]);
  const avg = Number(s.a);
  return {
    avgCcu: avg,
    visits: Number(s.v1) - Number(s.v0),
    hours: (Number(s.t1) - Number(s.t0)) / 3600,
    avgDaily: dailyRevenue(avg, genre, n(earnAvg?.r), n(ccuAvg?.r)),
  };
}

export async function periods(uid: number): Promise<PeriodRow[]> {
  const db = await getDb();
  const g = await db.get("SELECT COALESCE(genre_l1, genre) genre FROM games WHERE universe_id = ?", [uid]);
  const genre = (g?.genre as string) ?? null;
  const t = now();
  const pct = (a: number | null | undefined, b: number | null | undefined) => (a != null && b ? (a - b) / b : null);
  return Promise.all([7, 28, 91, 364].map(async (days) => {
    const [cur, prev] = await Promise.all([
      periodStats(uid, genre, t - days * 86400, t),
      periodStats(uid, genre, t - 2 * days * 86400, t - days * 86400),
    ]);
    const ready = !!cur && cur.hours >= days * 24 * 0.9;
    return {
      days,
      ready,
      coveredHours: cur?.hours ?? 0,
      avgCcu: cur?.avgCcu ?? null,
      visits: cur?.visits ?? null,
      avgDaily: cur?.avgDaily ?? null,
      change: {
        avgCcu: prev ? pct(cur?.avgCcu, prev.avgCcu) : null,
        visits: prev ? pct(cur?.visits, prev.visits) : null,
        avgDaily: prev ? pct(cur?.avgDaily, prev.avgDaily) : null,
      },
    };
  }));
}

export type GameDetail = {
  card: GameCard;
  description: string | null;
  creatorId: number | null;
  creatorType: string | null;
  favorites: number | null;
  createdRoblox: string | null;
  updatedRoblox: string | null;
  firstSeen: number;
  range: { low: number; high: number };
  forecast: { day: number; value: number; low: number; high: number }[];
  dailyHistory: { day: number; value: number }[];
};

export async function gameDetail(uid: number): Promise<GameDetail | null> {
  const db = await getDb();
  const r = await db.get("SELECT * FROM games WHERE universe_id = ?", [uid]);
  if (!r) return null;
  const card = (await cardsFor([uid])).get(uid)!;
  const daily = (await gameSeries(uid, now() - 60 * 86400, "day")).map((p) => ({ day: Math.floor(p.ts / 86400), value: p.revenue ?? 0 }));
  return {
    card,
    description: (r.description as string) ?? null,
    creatorId: n(r.creator_id),
    creatorType: (r.creator_type as string) ?? null,
    favorites: n(r.favorites),
    createdRoblox: (r.created_roblox as string) ?? null,
    updatedRoblox: (r.updated_roblox as string) ?? null,
    firstSeen: Number(r.first_seen),
    range: revenueRange(card.estDaily),
    forecast: forecast(daily),
    dailyHistory: daily,
  };
}

/** 비슷한 게임: 같은 장르에서 접속자가 비슷한 게임 */
export async function similarGames(uid: number, limit = 6): Promise<GameCard[]> {
  const db = await getDb();
  const g = await db.get("SELECT COALESCE(genre_l1, genre) genre, playing FROM games WHERE universe_id = ?", [uid]);
  if (!g) return [];
  const ids = (
    await db.all("SELECT universe_id FROM games WHERE COALESCE(genre_l1, genre) = ? AND universe_id != ? ORDER BY ABS(playing - ?) LIMIT ?", [String(g.genre ?? ""), uid, Number(g.playing ?? 0), limit])
  ).map((x) => Number(x.universe_id));
  const c = await cardsFor(ids);
  return ids.map((i) => c.get(i)).filter((x): x is GameCard => !!x);
}

/** 플랫폼 그래프: 수집할 때마다 추적 게임 접속자 합계 + 상위 게임 */
export async function platformSeries(fromTs: number, topN = 6) {
  const db = await getDb();
  const runs = await db.all("SELECT ts, total_playing FROM runs WHERE ts >= ? AND games > 0 ORDER BY ts", [fromTs]);
  const latest = await latestRunTs();
  const top = latest
    ? await db.all("SELECT s.universe_id, g.name FROM snapshots s JOIN games g USING (universe_id) WHERE s.ts = ? ORDER BY s.playing DESC LIMIT ?", [latest, topN])
    : [];
  const topIds = top.map((t) => Number(t.universe_id));
  const ph = topIds.map(() => "?").join(",") || "NULL";
  const snaps = await db.all(`SELECT universe_id, ts, playing FROM snapshots WHERE ts >= ? AND universe_id IN (${ph})`, [fromTs, ...topIds]);
  const byTs = new Map<number, Record<string, number>>();
  for (const r of runs) byTs.set(Number(r.ts), { ts: Number(r.ts), total: Number(r.total_playing) });
  for (const s of snaps) {
    const row = byTs.get(Number(s.ts));
    if (row) row[`g${s.universe_id}`] = Number(s.playing);
  }
  return { points: [...byTs.values()], games: top.map((t) => ({ key: `g${t.universe_id}`, name: String(t.name), universeId: Number(t.universe_id) })) };
}

export async function stats() {
  const db = await getDb();
  const r = (await db.get("SELECT COUNT(*) c, MIN(ts) t0, MAX(ts) t1 FROM runs WHERE games > 0"))!;
  const g = (await db.get("SELECT COUNT(*) c FROM games"))!;
  return { runs: Number(r.c), since: n(r.t0), last: n(r.t1), games: Number(g.c) };
}

/** 전체 합계 검사: 추적 게임의 추정 수익 합계를 로블록스 공식 실적(개발자 몫 전체)과 비교 */
export async function platformCheck() {
  const db = await getDb();
  const ids = (await db.all<{ universe_id: number }>("SELECT universe_id FROM games")).map((r) => Number(r.universe_id));
  const cards = [...(await cardsFor(ids)).values()];
  const daily = cards.reduce((a, c) => a + c.estDaily, 0);
  const hours = cards.reduce((a, c) => a + c.avgCcu24h, 0) * 24;
  return { games: cards.length, daily, hours, rph: hours > 0 ? daily / hours : null };
}
