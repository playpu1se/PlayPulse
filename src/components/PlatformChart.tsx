"use client";
// 첫 화면 큰 그래프: 합계(면) + 상위 게임(선), 게임 이름 눌러 켜고 끄기
import { useState } from "react";
import { TimeChart } from "./Charts";

export function PlatformChart({ points, games }: { points: Record<string, number>[]; games: { key: string; name: string }[] }) {
  const [on, setOn] = useState<Set<string>>(new Set(["total"]));
  const all = [{ key: "total", name: "전체 합계" }, ...games];
  const series = all.filter((g) => on.has(g.key)).map((g) => ({ key: g.key, label: g.name }));
  function toggle(k: string) {
    setOn((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      if (n.size === 0) n.add("total");
      return n;
    });
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {all.map((g) => (
          <button
            key={g.key}
            onClick={() => toggle(g.key)}
            className={"max-w-[220px] truncate rounded-full border px-2.5 py-0.5 text-[12px] font-semibold " + (on.has(g.key) ? "border-ink bg-ink text-bg" : "border-line text-ink-2 hover:bg-surface-2")}
          >
            {g.name}
          </button>
        ))}
      </div>
      <TimeChart data={points} series={series} area={series.length === 1} height={280} />
    </div>
  );
}
