// 수익 추정 — 순수 계산만(DB·네트워크 없음). 설명 = 문서/수익-추정.md
import {
  DEFAULT_RPH,
  FORECAST_DAYS,
  GENRE_RPH,
  RANGE_HIGH,
  RANGE_LOW,
  RANK_FACTOR_EARN_ONLY,
  RANK_FACTOR_MAX,
  RANK_FACTOR_MIN,
  RANK_FACTOR_OUTSIDE,
  USD_PER_ROBUX,
} from "./config";

export type Point = { ts: number; playing: number | null; visits: number | null };

export function rphForGenre(genre: string | null | undefined): number {
  if (!genre) return DEFAULT_RPH;
  return GENRE_RPH[genre] ?? DEFAULT_RPH;
}

export function rankFactor(earnRank: number | null, ccuRank: number | null): number {
  if (earnRank == null) return RANK_FACTOR_OUTSIDE;
  if (ccuRank == null) return RANK_FACTOR_EARN_ONLY;
  const f = Math.sqrt(ccuRank / earnRank);
  return Math.min(RANK_FACTOR_MAX, Math.max(RANK_FACTOR_MIN, f));
}

/** 하루 수익(R$) 추정 */
export function dailyRevenue(avgCcu: number, genre: string | null | undefined, earnRank: number | null, ccuRank: number | null): number {
  return avgCcu * 24 * rphForGenre(genre) * rankFactor(earnRank, ccuRank);
}

export function revenueRange(daily: number): { low: number; high: number } {
  return { low: daily * RANGE_LOW, high: daily * RANGE_HIGH };
}

export function toUsd(robux: number): number {
  return robux * USD_PER_ROBUX;
}

/** 시간 가중 평균 접속자 (점 사이 간격만큼 무게) */
export function avgPlaying(points: Point[]): number | null {
  const p = points.filter((x) => x.playing != null).sort((a, b) => a.ts - b.ts);
  if (p.length === 0) return null;
  if (p.length === 1) return p[0].playing!;
  let area = 0;
  for (let i = 1; i < p.length; i++) area += ((p[i].playing! + p[i - 1].playing!) / 2) * (p[i].ts - p[i - 1].ts);
  const span = p[p.length - 1].ts - p[0].ts;
  return span > 0 ? area / span : p[0].playing!;
}

/** 하루 방문 수 = 총 방문 증가량 ÷ 날 수. 30분 미만이면 계산 안 함. */
export function visitsPerDay(points: Point[]): number | null {
  const p = points.filter((x) => x.visits != null).sort((a, b) => a.ts - b.ts);
  if (p.length < 2) return null;
  const span = p[p.length - 1].ts - p[0].ts;
  if (span < 1800) return null;
  const delta = p[p.length - 1].visits! - p[0].visits!;
  if (delta < 0) return null;
  return (delta / span) * 86400;
}

export function revenuePerVisit(daily: number, visitsDay: number | null): number | null {
  if (!visitsDay || visitsDay <= 0) return null;
  return daily / visitsDay;
}

/** 날짜별 값(하루 1개)에 직선을 맞춰 앞으로 days 일 예측. 범위는 날마다 넓어져요. */
export function forecast(
  daily: { day: number; value: number }[],
  days = FORECAST_DAYS,
): { day: number; value: number; low: number; high: number }[] {
  if (daily.length < 3) return [];
  const n = daily.length;
  const xs = daily.map((d) => d.day);
  const ys = daily.map((d) => d.value);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const icpt = my - slope * mx;
  const resid = Math.sqrt(ys.reduce((a, y, i) => a + (y - (icpt + slope * xs[i])) ** 2, 0) / n);
  const last = xs[n - 1];
  const out = [];
  for (let k = 1; k <= days; k++) {
    const day = last + k;
    const value = Math.max(0, icpt + slope * day);
    const spread = resid * Math.sqrt(1 + k / 2) + value * 0.05 * k ** 0.5;
    out.push({ day, value, low: Math.max(0, value - spread), high: value + spread });
  }
  return out;
}

export function likeRatio(up: number | null | undefined, down: number | null | undefined): number | null {
  if (up == null || down == null || up + down === 0) return null;
  return up / (up + down);
}
