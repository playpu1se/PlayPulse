// 수집기 한 번 돌리기: 공식 차트 → 게임 숫자 → 좋아요 → 아이콘 → 스냅샷 → 알림
import { ALERT_CCU_CHANGE, CHARTS, COLLECT_EVERY_MIN } from "./config";
import { getDb, now, type Arg } from "./db";
import { fetchChart, fetchGames, fetchIcons, fetchVotes } from "./roblox";

export type CollectResult = { ts: number; games: number; totalPlaying: number; errors: string[] };

export async function collectOnce(log: (m: string) => void = () => {}): Promise<CollectResult> {
  const db = await getDb();
  const step = COLLECT_EVERY_MIN * 60;
  const ts = Math.floor(now() / step) * step;
  const errors: string[] = [];
  const ids = new Set<number>();
  const chartGenre = new Map<number, string>(); // 차트가 주는 새 장르(genreL1)가 더 정확해요

  // 1. 공식 차트 순위
  const rankSql = "INSERT OR REPLACE INTO chart_ranks (sort_id, ts, universe_id, rank) VALUES (?, ?, ?, ?)";
  for (const c of CHARTS) {
    try {
      const games = await fetchChart(c.id, c.pages);
      await db.batch(games.map((g, i) => ({ sql: rankSql, args: [c.id, ts, g.universeId, i + 1] })));
      games.forEach((g) => {
        ids.add(g.universeId);
        if (g.genreL1) chartGenre.set(g.universeId, g.genreL1);
      });
      log(`차트 ${c.id}: ${games.length}개`);
    } catch (e) {
      errors.push(`차트 ${c.id}: ${String(e)}`);
    }
  }

  // 2. 사용자가 따라가는 게임 + 최근 7일 안에 본 게임
  const extra = await db.all<{ universe_id: number }>(
    `SELECT universe_id FROM my_games UNION SELECT universe_id FROM list_items
     UNION SELECT universe_id FROM subscriptions UNION SELECT universe_id FROM games WHERE last_seen > ?`,
    [ts - 7 * 86400],
  );
  for (const r of extra) ids.add(Number(r.universe_id));
  const all = [...ids];

  // 3. 게임 숫자
  let games: Awaited<ReturnType<typeof fetchGames>> = [];
  try {
    games = await fetchGames(all);
  } catch (e) {
    errors.push(`게임: ${String(e)}`);
  }
  let votes = new Map<number, { up: number; down: number }>();
  try {
    votes = new Map((await fetchVotes(all)).map((v) => [v.id, { up: v.upVotes, down: v.downVotes }]));
  } catch (e) {
    errors.push(`좋아요: ${String(e)}`);
  }

  const upsertSql = `
    INSERT INTO games (universe_id, root_place_id, name, description, creator_id, creator_name, creator_type, genre, genre_l1,
      created_roblox, updated_roblox, playing, visits, favorites, up_votes, down_votes, first_seen, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(universe_id) DO UPDATE SET root_place_id=excluded.root_place_id, name=excluded.name, description=excluded.description,
      creator_id=excluded.creator_id, creator_name=excluded.creator_name, creator_type=excluded.creator_type, genre=excluded.genre,
      genre_l1=COALESCE(excluded.genre_l1, games.genre_l1), created_roblox=excluded.created_roblox, updated_roblox=excluded.updated_roblox,
      playing=excluded.playing, visits=excluded.visits, favorites=excluded.favorites, up_votes=excluded.up_votes,
      down_votes=excluded.down_votes, last_seen=excluded.last_seen`;
  const snapSql = "INSERT OR REPLACE INTO snapshots (universe_id, ts, playing, visits, up_votes, down_votes) VALUES (?, ?, ?, ?, ?, ?)";

  let total = 0;
  const stmts: { sql: string; args: Arg[] }[] = [];
  for (const g of games) {
    const v = votes.get(g.id);
    stmts.push({
      sql: upsertSql,
      args: [
        g.id, g.rootPlaceId, g.name, g.description ?? null, g.creator?.id ?? null, g.creator?.name ?? null, g.creator?.type ?? null,
        g.genre ?? null, chartGenre.get(g.id) ?? g.genre_l1 ?? null, g.created ?? null, g.updated ?? null, g.playing ?? 0, g.visits ?? 0,
        g.favoritedCount ?? 0, v?.up ?? null, v?.down ?? null, ts, ts,
      ],
    });
    stmts.push({ sql: snapSql, args: [g.id, ts, g.playing ?? 0, g.visits ?? 0, v?.up ?? null, v?.down ?? null] });
    total += g.playing ?? 0;
  }
  await db.batch(stmts);
  log(`게임 ${games.length}개 저장 · 접속자 합계 ${total.toLocaleString()}`);

  // 4. 아이콘 (없거나 하루 지난 것만)
  try {
    const need = await db.all<{ universe_id: number }>("SELECT universe_id FROM games WHERE icon_url IS NULL OR icon_checked_at IS NULL OR icon_checked_at < ?", [ts - 86400]);
    if (need.length) {
      const icons = await fetchIcons(need.map((r) => Number(r.universe_id)));
      await db.batch(icons.map((i) => ({ sql: "UPDATE games SET icon_url = ?, icon_checked_at = ? WHERE universe_id = ?", args: [i.imageUrl, ts, i.targetId] })));
      log(`아이콘 ${icons.length}개`);
    }
  } catch (e) {
    errors.push(`아이콘: ${String(e)}`);
  }

  // 5. 알림: 구독한 게임의 접속자가 하루 전보다 크게 바뀌면
  try {
    await makeAlerts(ts);
  } catch (e) {
    errors.push(`알림: ${String(e)}`);
  }

  // 같은 칸에 이미 더 많은 게임을 모은 기록이 있으면 덮지 않아요(바로 다시 돌다 429 난 경우)
  await db.run(
    `INSERT INTO runs (ts, games, total_playing, ok, note) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(ts) DO UPDATE SET games=excluded.games, total_playing=excluded.total_playing, ok=excluded.ok, note=excluded.note
     WHERE excluded.games >= runs.games`,
    [ts, games.length, total, errors.length ? 0 : 1, errors.join(" | ") || null],
  );
  try {
    await prune(ts);
  } catch (e) {
    log(`정리 실패: ${String(e)}`);
  }
  return { ts, games: games.length, totalPlaying: total, errors };
}

/** 오래된 기록 줄이기. 칸이 10분(600초) 단위라 정각 칸은 ts % 3600 == 0, 자정 칸은 ts % 86400 == 0.
 *  30일 넘은 건 시간당 정각 칸만, 365일 넘은 건 하루당 자정 칸만 남겨요. (그 정각 칸이 비었으면 그 시간 기록은 사라져요) */
export async function prune(ts: number) {
  const db = await getDb();
  const d30 = ts - 30 * 86400;
  const d365 = ts - 365 * 86400;
  await db.batch(
    ["snapshots", "chart_ranks"].flatMap((t) => [
      { sql: `DELETE FROM ${t} WHERE ts < ? AND ts % 3600 != 0`, args: [d30] },
      { sql: `DELETE FROM ${t} WHERE ts < ? AND ts % 86400 != 0`, args: [d365] },
    ]),
  );
}

async function makeAlerts(ts: number) {
  const db = await getDb();
  const subs = await db.all<{ user_id: number; universe_id: number; name: string; playing: number }>(
    "SELECT s.user_id, s.universe_id, g.name, g.playing FROM subscriptions s JOIN games g USING (universe_id)",
  );
  for (const s of subs) {
    const p = await db.get<{ playing: number }>("SELECT playing FROM snapshots WHERE universe_id = ? AND ts BETWEEN ? AND ? ORDER BY ts DESC LIMIT 1", [s.universe_id, ts - 26 * 3600, ts - 22 * 3600]);
    if (!p || !p.playing) continue;
    const change = (s.playing - p.playing) / p.playing;
    if (Math.abs(change) < ALERT_CCU_CHANGE) continue;
    if (await db.get("SELECT 1 FROM notifications WHERE user_id = ? AND universe_id = ? AND kind = 'ccu' AND created_at > ?", [s.user_id, s.universe_id, ts - 86400])) continue;
    const pct = Math.round(change * 100);
    await db.run("INSERT INTO notifications (user_id, universe_id, kind, message, created_at) VALUES (?, ?, 'ccu', ?, ?)", [
      s.user_id,
      s.universe_id,
      `${s.name} 접속자가 하루 전보다 ${pct > 0 ? "+" : ""}${pct}% 바뀌었어요 (${p.playing.toLocaleString()} → ${s.playing.toLocaleString()})`,
      ts,
    ]);
  }
}
