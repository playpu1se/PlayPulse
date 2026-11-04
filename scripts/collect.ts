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
  } catch (e) {
    console.error("수집 실패:", e);
    if (!loop) process.exitCode = 1;
  }
}

void run().then(() => {
  if (loop) setInterval(run, COLLECT_EVERY_MIN * 60 * 1000);
  else process.exit(process.exitCode ?? 0); // 한 번만 돌고 확실히 끝내기(GitHub Actions)
});
