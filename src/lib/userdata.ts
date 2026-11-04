// 로그인한 사람의 데이터: 관심 목록 · 내 게임 · 알림 구독 · 알림함 · 설정
import { getDb, now } from "./db";
import { fetchGames, placeToUniverse } from "./roblox";

export async function userLists(userId: number) {
  const db = await getDb();
  return (
    await db.all("SELECT l.id, l.name, l.created_at, COUNT(i.universe_id) n FROM lists l LEFT JOIN list_items i ON i.list_id = l.id WHERE l.user_id = ? GROUP BY l.id ORDER BY l.created_at", [userId])
  ).map((r) => ({ id: Number(r.id), name: String(r.name), count: Number(r.n) }));
}

export async function listOwned(userId: number, listId: number) {
  const r = await (await getDb()).get("SELECT id, name FROM lists WHERE id = ? AND user_id = ?", [listId, userId]);
  return r ? { id: Number(r.id), name: String(r.name) } : null;
}

export async function createList(userId: number, name: string): Promise<number> {
  const clean = name.trim().slice(0, 60) || "새 목록";
  const r = await (await getDb()).run("INSERT INTO lists (user_id, name, created_at) VALUES (?, ?, ?)", [userId, clean, now()]);
  return Number(r.lastInsertRowid);
}

export async function renameList(userId: number, listId: number, name: string) {
  await (await getDb()).run("UPDATE lists SET name = ? WHERE id = ? AND user_id = ?", [name.trim().slice(0, 60) || "새 목록", listId, userId]);
}

export async function deleteList(userId: number, listId: number) {
  if (!(await listOwned(userId, listId))) return;
  await (await getDb()).batch([
    { sql: "DELETE FROM list_items WHERE list_id = ?", args: [listId] },
    { sql: "DELETE FROM lists WHERE id = ?", args: [listId] },
  ]);
}

export async function listItems(listId: number): Promise<number[]> {
  return (await (await getDb()).all("SELECT universe_id FROM list_items WHERE list_id = ? ORDER BY added_at DESC", [listId])).map((r) => Number(r.universe_id));
}

export async function setInList(userId: number, listId: number, uid: number, inList: boolean) {
  if (!(await listOwned(userId, listId))) return;
  const db = await getDb();
  if (inList) await db.run("INSERT OR IGNORE INTO list_items (list_id, universe_id, added_at) VALUES (?, ?, ?)", [listId, uid, now()]);
  else await db.run("DELETE FROM list_items WHERE list_id = ? AND universe_id = ?", [listId, uid]);
}

export async function listsContaining(userId: number, uid: number): Promise<number[]> {
  return (
    await (await getDb()).all("SELECT l.id FROM lists l JOIN list_items i ON i.list_id = l.id WHERE l.user_id = ? AND i.universe_id = ?", [userId, uid])
  ).map((r) => Number(r.id));
}

export async function myGames(userId: number): Promise<number[]> {
  return (await (await getDb()).all("SELECT universe_id FROM my_games WHERE user_id = ? ORDER BY added_at", [userId])).map((r) => Number(r.universe_id));
}

export async function removeMyGame(userId: number, uid: number) {
  await (await getDb()).run("DELETE FROM my_games WHERE user_id = ? AND universe_id = ?", [userId, uid]);
}

/** 로블록스 링크·장소 id·유니버스 id 아무거나 받아서 게임 찾기. 처음 보는 게임이면 바로 한 번 수집. */
export async function resolveGame(input: string): Promise<number | null> {
  const s = input.trim();
  const m = s.match(/roblox\.com\/games\/(\d+)/);
  const num = m ? Number(m[1]) : /^\d+$/.test(s) ? Number(s) : null;
  if (!num) return null;
  const db = await getDb();
  const known = await db.get("SELECT universe_id FROM games WHERE universe_id = ? OR root_place_id = ?", [num, num]);
  if (known) return Number(known.universe_id);
  // 링크의 숫자는 보통 장소 id → 유니버스로 바꿔 봐요. 안 되면 유니버스 id 로 봐요.
  const uid = (m ? await placeToUniverse(num) : null) ?? (await placeToUniverse(num)) ?? num;
  const games = await fetchGames([uid]).catch(() => []);
  const g = games[0];
  if (!g) return null;
  const t = now();
  await db.batch([
    {
      sql: `INSERT OR IGNORE INTO games (universe_id, root_place_id, name, description, creator_id, creator_name, creator_type, genre, playing, visits, favorites, first_seen, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [g.id, g.rootPlaceId, g.name, g.description ?? null, g.creator?.id ?? null, g.creator?.name ?? null, g.creator?.type ?? null, g.genre ?? null, g.playing ?? 0, g.visits ?? 0, g.favoritedCount ?? 0, t, t],
    },
    { sql: "INSERT OR IGNORE INTO snapshots (universe_id, ts, playing, visits) VALUES (?, ?, ?, ?)", args: [g.id, t, g.playing ?? 0, g.visits ?? 0] },
  ]);
  return g.id;
}

export async function addMyGame(userId: number, input: string): Promise<{ uid?: number; error?: string }> {
  const uid = await resolveGame(input);
  if (!uid) return { error: "게임을 찾지 못했어요. 로블록스 게임 주소나 게임 id 를 넣어 주세요." };
  await (await getDb()).run("INSERT OR IGNORE INTO my_games (user_id, universe_id, added_at) VALUES (?, ?, ?)", [userId, uid, now()]);
  return { uid };
}

export async function isSubscribed(userId: number, uid: number): Promise<boolean> {
  return !!(await (await getDb()).get("SELECT 1 FROM subscriptions WHERE user_id = ? AND universe_id = ?", [userId, uid]));
}

export async function setSubscribed(userId: number, uid: number, on: boolean) {
  const db = await getDb();
  if (on) await db.run("INSERT OR IGNORE INTO subscriptions (user_id, universe_id, created_at) VALUES (?, ?, ?)", [userId, uid, now()]);
  else await db.run("DELETE FROM subscriptions WHERE user_id = ? AND universe_id = ?", [userId, uid]);
}

export async function subscriptions(userId: number): Promise<number[]> {
  return (await (await getDb()).all("SELECT universe_id FROM subscriptions WHERE user_id = ?", [userId])).map((r) => Number(r.universe_id));
}

export async function notifications(userId: number, limit = 100) {
  return (
    await (await getDb()).all("SELECT n.*, g.name game_name, g.icon_url FROM notifications n LEFT JOIN games g USING (universe_id) WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?", [userId, limit])
  ).map((r) => ({
    id: Number(r.id),
    universeId: r.universe_id == null ? null : Number(r.universe_id),
    gameName: (r.game_name as string) ?? null,
    iconUrl: (r.icon_url as string) ?? null,
    message: String(r.message),
    createdAt: Number(r.created_at),
    read: r.read_at != null,
  }));
}

export async function unreadCount(userId: number): Promise<number> {
  const r = await (await getDb()).get("SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at IS NULL", [userId]);
  return Number(r?.c ?? 0);
}

export async function markAllRead(userId: number) {
  await (await getDb()).run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", [now(), userId]);
}

export async function updateSettings(userId: number, s: { displayName?: string; currency?: "robux" | "usd" }) {
  const db = await getDb();
  if (s.displayName !== undefined) await db.run("UPDATE users SET display_name = ? WHERE id = ?", [s.displayName.trim().slice(0, 40) || null, userId]);
  if (s.currency) await db.run("UPDATE users SET currency = ? WHERE id = ?", [s.currency, userId]);
}
