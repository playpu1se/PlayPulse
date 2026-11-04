"use client";
// 게임 상세 그래프 탭: 참여 · 수익 · 순위
import { useState } from "react";
import { ForecastChart, TimeChart } from "@/components/Charts";
import type { SeriesPoint } from "@/lib/queries";

type Props = {
  series: SeriesPoint[];
  history: { day: number; value: number }[];
  forecast: { day: number; value: number; low: number; high: number }[];
};

const TABS = [
  ["money", "수익"],
  ["engage", "참여"],
  ["rank", "순위"],
] as const;

export function GameCharts({ series, history, forecast }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("money");
  const data = series as unknown as Record<string, number | null>[];
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-line">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={"-mb-px border-b-2 px-3 py-2 text-[14px] font-semibold " + (tab === k ? "border-pulse text-ink" : "border-transparent text-ink-3 hover:text-ink")}>
            {l}
          </button>
        ))}
      </div>
      {tab === "money" && (
        <div className="space-y-6">
          <Block title="하루 수익 추정 (그 시점 접속자 기준)">
            <TimeChart data={data} series={[{ key: "revenue", label: "R$/일" }]} fmt="money" area />
          </Block>
          <Block title="날짜별 수익과 14일 예측">
            <ForecastChart history={history} forecast={forecast} />
          </Block>
        </div>
      )}
      {tab === "engage" && (
        <div className="space-y-6">
          <Block title="접속자">
            <TimeChart data={data} series={[{ key: "playing", label: "접속자" }]} area />
          </Block>
          <Block title="방문 (칸마다 늘어난 수)">
            <TimeChart data={data} series={[{ key: "visits", label: "방문" }]} />
          </Block>
          <Block title="좋아요 비율">
            <TimeChart data={data} series={[{ key: "like", label: "좋아요" }]} fmt="pct" />
          </Block>
        </div>
      )}
      {tab === "rank" && (
        <div className="space-y-6">
          <Block title="로블록스 공식 차트 순위 (위로 갈수록 높아요)">
            <TimeChart
              data={data}
              series={[
                { key: "earnRank", label: "수익 순위" },
                { key: "ccuRank", label: "접속자 순위" },
              ]}
              fmt="rank"
              reversed
            />
          </Block>
        </div>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-semibold text-ink-2">{title}</h3>
      {children}
    </div>
  );
}
