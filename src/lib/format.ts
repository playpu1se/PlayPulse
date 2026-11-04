// 숫자·돈·날짜 모양 (화면 공통)
import { toUsd } from "./estimate";

export type Currency = "robux" | "usd";

export function compact(v: number | null | undefined, digits = 1): string {
  if (v == null || !isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(digits).replace(/\.0+$/, "") + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(digits).replace(/\.0+$/, "") + "M";
  if (a >= 1e3) return (v / 1e3).toFixed(digits).replace(/\.0+$/, "") + "K";
  return Math.round(v).toLocaleString("en-US");
}

export function money(robux: number | null | undefined, c: Currency, digits = 1): string {
  if (robux == null || !isFinite(robux)) return "—";
  if (c === "usd") return "$" + compact(toUsd(robux), digits);
  return compact(robux, digits) + " R$";
}

export function moneyPrecise(robux: number | null | undefined, c: Currency): string {
  if (robux == null || !isFinite(robux)) return "—";
  if (c === "usd") return "$" + toUsd(robux).toFixed(4);
  return robux.toFixed(2) + " R$";
}

export function pct(v: number | null | undefined, signed = true): string {
  if (v == null || !isFinite(v)) return "—";
  const s = (v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0);
  return (signed && v > 0 ? "+" : "") + s + "%";
}

export function dateKo(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function dateTimeKo(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ago(ts: number | null): string {
  if (!ts) return "아직 없음";
  const s = Math.floor(Date.now() / 1000) - ts;
  if (s < 90) return "방금";
  if (s < 3600) return `${Math.round(s / 60)}분 전`;
  if (s < 86400) return `${Math.round(s / 3600)}시간 전`;
  return `${Math.round(s / 86400)}일 전`;
}

export function robloxUrl(rootPlaceId: number | null | undefined): string | null {
  return rootPlaceId ? `https://www.roblox.com/games/${rootPlaceId}` : null;
}
