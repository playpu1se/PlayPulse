// DB 창구. TURSO_DATABASE_URL 이 있으면 Turso(원격 libSQL, HTTP), 없으면 로컬 SQLite 파일(node:sqlite).
// 모든 호출이 async 라서 어느 쪽이든 같은 모양으로 써요.
import { createClient } from "@libsql/client/web";
import type { SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { DB_PATH } from "./config";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS games (
  universe_id INTEGER PRIMARY KEY,
  root_place_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  creator_id INTEGER,
  creator_name TEXT,
  creator_type TEXT,
  genre TEXT,
  genre_l1 TEXT,
  icon_url TEXT,
  icon_checked_at INTEGER,
  created_roblox TEXT,
  updated_roblox TEXT,
  playing INTEGER,
  visits INTEGER,
  favorites INTEGER,
  up_votes INTEGER,
  down_votes INTEGER,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS snapshots (
  universe_id INTEGER NOT NULL,
  ts INTEGER NOT NULL,
  playing INTEGER,
  visits INTEGER,
  up_votes INTEGER,
  down_votes INTEGER,
  PRIMARY KEY (universe_id, ts)
);
CREATE INDEX IF NOT EXISTS snapshots_ts ON snapshots(ts);
CREATE TABLE IF NOT EXISTS chart_ranks (
  sort_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  universe_id INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  PRIMARY KEY (sort_id, ts, universe_id)
);
CREATE INDEX IF NOT EXISTS chart_ranks_game ON chart_ranks(universe_id, sort_id, ts);
CREATE TABLE IF NOT EXISTS runs (
  ts INTEGER PRIMARY KEY,
  games INTEGER,
  total_playing INTEGER,
  ok INTEGER,
  note TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'robux',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS list_items (
  list_id INTEGER NOT NULL,
  universe_id INTEGER NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (list_id, universe_id)
);
CREATE TABLE IF NOT EXISTS my_games (
  user_id INTEGER NOT NULL,
  universe_id INTEGER NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, universe_id)
);
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id INTEGER NOT NULL,
  universe_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, universe_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  universe_id INTEGER,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);
`;

export type Arg = string | number | bigint | null;
export type Row = Record<string, unknown>;
export type RunResult = { changes: number; lastInsertRowid: number | null };

export interface Db {
  all<T = Row>(sql: string, args?: Arg[]): Promise<T[]>;
  get<T = Row>(sql: string, args?: Arg[]): Promise<T | undefined>;
  run(sql: string, args?: Arg[]): Promise<RunResult>;
  /** 한 번에 묶어서(원자적) 실행. 원격은 요청이 커지지 않게 BATCH_CHUNK 개씩 */
  batch(stmts: { sql: string; args?: Arg[] }[]): Promise<void>;
}

const BATCH_CHUNK = 200;

// 스키마를 문장 단위로 쪼개요 (문자열 안에 ; 가 없어서 단순 분리로 충분해요)
const SCHEMA_STMTS = SCHEMA.split(";")
  .map((x) => x.trim())
  .filter(Boolean);

// bigint → number (id·시각은 2^53 안이에요)
function plain(row: Row): Row {
  const o: Row = {};
  for (const k of Object.keys(row)) {
    const v = row[k];
    o[k] = typeof v === "bigint" ? Number(v) : v;
  }
  return o;
}

// node:sqlite 는 로컬에서만 불러와요 (서버(Vercel)에서는 Turso 만 써요)
async function localDb(): Promise<Db> {
  const { DatabaseSync } = await import("node:sqlite");
  const file = path.resolve(process.cwd(), DB_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  const bind = (a?: Arg[]) => (a ?? []) as SQLInputValue[];
  const run = (sql: string, args?: Arg[]): RunResult => {
    const r = raw.prepare(sql).run(...bind(args));
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  };
  return {
    async all<T>(sql: string, args?: Arg[]) {
      return raw.prepare(sql).all(...bind(args)).map((r) => plain(r as Row)) as T[];
    },
    async get<T>(sql: string, args?: Arg[]) {
      const r = raw.prepare(sql).get(...bind(args));
      return r ? (plain(r as Row) as T) : undefined;
    },
    async run(sql, args) {
      return run(sql, args);
    },
    async batch(stmts) {
      if (!stmts.length) return;
      raw.exec("BEGIN");
      try {
        for (const s of stmts) run(s.sql, s.args);
        raw.exec("COMMIT");
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

function remoteDb(url: string, authToken?: string): Db {
  const c = createClient({ url, authToken });
  const rows = (r: { columns: string[]; rows: ArrayLike<unknown>[] }): Row[] =>
    r.rows.map((row) => {
      const o: Row = {};
      r.columns.forEach((col, i) => (o[col] = row[i]));
      return plain(o);
    });
  return {
    async all<T>(sql: string, args?: Arg[]) {
      return rows(await c.execute({ sql, args: args ?? [] })) as T[];
    },
    async get<T>(sql: string, args?: Arg[]) {
      return rows(await c.execute({ sql, args: args ?? [] }))[0] as T | undefined;
    },
    async run(sql, args) {
      const r = await c.execute({ sql, args: args ?? [] });
      return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid == null ? null : Number(r.lastInsertRowid) };
    },
    async batch(stmts) {
      // 조각마다 원자적. 큰 수집은 조각 사이에서 실패하면 일부만 들어갈 수 있어요(다음 수집이 덮어써요).
      for (let i = 0; i < stmts.length; i += BATCH_CHUNK) {
        await c.batch(
          stmts.slice(i, i + BATCH_CHUNK).map((s) => ({ sql: s.sql, args: s.args ?? [] })),
          "write",
        );
      }
    },
  };
}

let dbPromise: Promise<Db> | null = null;

/** 프로세스당 한 번 연결하고 스키마를 만들어요 */
export function getDb(): Promise<Db> {
  dbPromise ??= (async () => {
    const url = process.env.TURSO_DATABASE_URL;
    const db = url ? remoteDb(url, process.env.TURSO_AUTH_TOKEN) : await localDb();
    await db.batch(SCHEMA_STMTS.map((sql) => ({ sql })));
    return db;
  })().catch((e) => {
    dbPromise = null; // 실패하면 다음에 다시 시도
    throw e;
  });
  return dbPromise;
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}
