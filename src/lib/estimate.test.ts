import { describe, expect, it } from "vitest";
import { avgPlaying, dailyRevenue, forecast, rankFactor, revenuePerVisit, visitsPerDay } from "./estimate";

describe("수익 추정", () => {
  it("순위 보정은 범위 안으로 잘려요", () => {
    expect(rankFactor(1, 10000)).toBe(2.5);
    expect(rankFactor(400, 1)).toBe(0.5);
    expect(rankFactor(10, 40)).toBeCloseTo(2);
    expect(rankFactor(null, 5)).toBe(0.8);
    expect(rankFactor(5, null)).toBe(1.2);
  });

  it("일 수익 = 접속자 × 24 × 장르 단가 × 보정", () => {
    expect(dailyRevenue(1000, "RPG", null, null)).toBeCloseTo(1000 * 24 * 8 * 0.8);
    expect(dailyRevenue(1000, "없는장르", 10, 40)).toBeCloseTo(1000 * 24 * 6 * 2);
  });

  it("평균 접속자는 시간 가중", () => {
    expect(avgPlaying([{ ts: 0, playing: 100, visits: 0 }, { ts: 100, playing: 300, visits: 0 }])).toBe(200);
    expect(avgPlaying([])).toBeNull();
  });

  it("하루 방문 수와 방문당 수익", () => {
    const v = visitsPerDay([{ ts: 0, playing: 1, visits: 1000 }, { ts: 3600, playing: 1, visits: 2000 }]);
    expect(v).toBe(24000);
    expect(revenuePerVisit(48000, v)).toBe(2);
    expect(visitsPerDay([{ ts: 0, playing: 1, visits: 1 }, { ts: 60, playing: 1, visits: 5 }])).toBeNull();
  });

  it("예측은 3일 이상일 때만, 범위는 점점 넓어져요", () => {
    expect(forecast([{ day: 0, value: 1 }])).toEqual([]);
    const f = forecast([0, 1, 2, 3, 4].map((d) => ({ day: d, value: 100 + d * 10 })), 3);
    expect(f[0].value).toBeCloseTo(150);
    expect(f[2].high - f[2].low).toBeGreaterThan(f[0].high - f[0].low);
  });
});
