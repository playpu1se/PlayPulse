import Link from "next/link";
import { notFound } from "next/navigation";
import { RankingList } from "@/components/GameBits";
import { Estimate } from "@/components/Money";
import { RANKINGS, ranking, type RankingKind } from "@/lib/cached";

export const dynamic = "force-dynamic";

export default async function RankingPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const meta = RANKINGS.find((r) => r.kind === kind);
  if (!meta) notFound();
  const items = await ranking(kind as RankingKind, 100);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {RANKINGS.map((r) => (
          <Link key={r.kind} href={`/rankings/${r.kind}`} className={"chip !py-1 " + (r.kind === kind ? "!bg-ink !text-bg" : "")}>
            {r.title}
          </Link>
        ))}
      </div>
      <div className="card p-4">
        <h1 className="flex items-center gap-2 text-[20px] font-bold">
          {meta.title} 100 {(kind === "earning" || kind === "rpv") && <Estimate />}
        </h1>
        <p className="mb-3 text-[13px] text-ink-3">{meta.desc}</p>
        <RankingList items={items} show={kind === "playing" ? "playing" : kind === "rpv" ? "rpv" : "revenue"} />
      </div>
    </div>
  );
}
