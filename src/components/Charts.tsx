"use client";
// 그래프 (recharts). 시각은 초 단위 ts.
import { Area, AreaChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact, money } from "@/lib/format";
import { useCurrency } from "./CurrencyContext";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

function tickTime(ts: number, span: number) {
  const d = new Date(ts * 1000);
  if (span <= 2 * 86400) return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function tooltipTime(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type Series = { key: string; label: string };
type Fmt = "count" | "money" | "pct" | "rank" | "minutes";

function useFmt(fmt: Fmt) {
  const { currency } = useCurrency();
  return (v: number) => {
    if (v == null || !isFinite(v)) return "—";
    if (fmt === "money") return money(v, currency);
    if (fmt === "pct") return (v * 100).toFixed(1) + "%";
    if (fmt === "rank") return "#" + Math.round(v);
    return compact(v);
  };
}

function Empty({ height }: { height: number }) {
  return (
    <div className="grid place-items-center rounded-lg bg-surface-2/60 text-[13px] text-ink-3" style={{ height }}>
      아직 점이 부족해요. 수집기가 30분마다 쌓고 있어요.
    </div>
  );
}

export function TimeChart({
  data,
  series,
  fmt = "count",
  height = 260,
  area = false,
  reversed = false,
}: {
  data: Record<string, number | null>[];
  series: Series[];
  fmt?: Fmt;
  height?: number;
  area?: boolean;
  reversed?: boolean;
}) {
  const f = useFmt(fmt);
  const valid = data.filter((d) => series.some((s) => d[s.key] != null));
  if (valid.length < 2) return <Empty height={height} />;
  const span = Number(valid[valid.length - 1].ts) - Number(valid[0].ts);
  const common = (
    <>
      <CartesianGrid stroke="var(--line)" vertical={false} />
      <XAxis dataKey="ts" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => tickTime(v, span)} stroke="var(--ink-3)" fontSize={11} tickLine={false} />
      <YAxis tickFormatter={f} stroke="var(--ink-3)" fontSize={11} width={58} tickLine={false} axisLine={false} reversed={reversed} domain={fmt === "pct" ? ["auto", "auto"] : undefined} />
      <Tooltip
        labelFormatter={(v) => tooltipTime(Number(v))}
        formatter={(v: number, name: string) => [f(v), name]}
        contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 12 }}
      />
      {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
    </>
  );
  return (
    <ResponsiveContainer width="100%" height={height}>
      {area ? (
        <AreaChart data={valid}>
          {common}
          {series.map((s, i) => (
            <Area key={s.key} dataKey={s.key} name={s.label} stroke={COLORS[i % 6]} fill={COLORS[i % 6]} fillOpacity={0.15} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={valid}>
          {common}
          {series.map((s, i) => (
            <Line key={s.key} dataKey={s.key} name={s.label} stroke={COLORS[i % 6]} strokeWidth={i === 0 ? 2.2 : 1.6} dot={false} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

/** 수익: 지난 값(실선) + 예측(점선) + 예측 범위(띠). day = 1970년부터 날 수 */
export function ForecastChart({
  history,
  forecast,
  height = 280,
}: {
  history: { day: number; value: number }[];
  forecast: { day: number; value: number; low: number; high: number }[];
  height?: number;
}) {
  const f = useFmt("money");
  if (history.length < 3) return <Empty height={height} />;
  const data = [
    ...history.map((h) => ({ ts: h.day * 86400, hist: h.value, fc: null as number | null, band: null as [number, number] | null })),
    ...forecast.map((p) => ({ ts: p.day * 86400, hist: null, fc: p.value, band: [p.low, p.high] as [number, number] })),
  ];
  const last = history[history.length - 1];
  data[history.length - 1].fc = last.value;
  data[history.length - 1].band = [last.value, last.value];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="ts" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => tickTime(v, 99 * 86400)} stroke="var(--ink-3)" fontSize={11} tickLine={false} />
        <YAxis tickFormatter={f} stroke="var(--ink-3)" fontSize={11} width={62} tickLine={false} axisLine={false} />
        <Tooltip
          labelFormatter={(v) => tooltipTime(Number(v))}
          formatter={(v: number | [number, number], name: string) => [Array.isArray(v) ? `${f(v[0])} ~ ${f(v[1])}` : f(v), name]}
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area dataKey="band" name="예측 범위" stroke="none" fill="var(--money)" fillOpacity={0.18} isAnimationActive={false} connectNulls />
        <Line dataKey="hist" name="일 수익(추정)" stroke="var(--money)" strokeWidth={2.4} dot={false} isAnimationActive={false} connectNulls />
        <Line dataKey="fc" name="예측" stroke="var(--money)" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
