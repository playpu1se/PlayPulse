// 사용법: npm run collect        → 한 번
//        npm run collect:loop   → 10분마다 계속 (Ctrl+C 로 멈춤)
import { COLLECT_EVERY_MIN } from "../src/lib/config";
import { collectOnce } from "../src/lib/collect";

const loop = process.argv.includes("--loop");

async function run() {
  const t0 = Date.now();
  try {
    const r = await collectOnce((m) => console.log("  " + m));
    console.log(`[${new Date().toISOString()}] 끝 · 게임 ${r.games} · ${((Date.now() - t0) / 1000).toFixed(1)}초` + (r.errors.length ? ` · 오류 ${r.errors.join(" | ")}` : ""));
    await notifySite();
  } catch (e) {
    console.error("수집 실패:", e);
    if (!loop) process.exitCode = 1;
  }
}

// 사이트에 「새 데이터 왔어」 신호 → 5분 저장을 바로 지워요. SITE_URL·REVALIDATE_SECRET 이 있을 때만.
async function notifySite() {
  const site = process.env.SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!site || !secret) return;
  try {
    const res = await fetch(`${site.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(20000),
    });
    console.log(`  사이트 새로고침 신호: ${res.ok ? "성공" : "실패 " + res.status}`);
  } catch (e) {
    console.log("  사이트 새로고침 신호 실패:", String(e));
  }
}

void run().then(() => {
  if (loop) setInterval(run, COLLECT_EVERY_MIN * 60 * 1000);
  else process.exit(process.exitCode ?? 0); // 한 번만 돌고 확실히 끝내기(GitHub Actions)
});
