// 서버 상태 확인: 살아 있나 · 마지막 수집이 언제였나
import { HEALTH_MAX_AGE_MIN } from "@/lib/config";
import { stats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await stats();
  const age = s.last ? Math.floor(Date.now() / 1000) - s.last : null;
  const ok = age != null && age < HEALTH_MAX_AGE_MIN * 60;
  return Response.json({ ok, lastRun: s.last, lastRunAgeSec: age, runs: s.runs, games: s.games }, { status: ok ? 200 : 503 });
}
