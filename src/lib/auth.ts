// 이메일 + 비밀번호 로그인. 비밀번호는 scrypt 로 섞어서만 저장해요.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, now } from "./db";

export const SESSION_COOKIE = "pp_session";
const SESSION_DAYS = 30;

export type User = { id: number; email: string; displayName: string | null; currency: "robux" | "usd" };

function hash(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function validEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** 혼자 쓰기 모드(PLAYPULSE_SINGLE_USER=1)면 첫 계정 하나만 가입할 수 있어요 */
export async function signupOpen(): Promise<boolean> {
  if (process.env.PLAYPULSE_SINGLE_USER !== "1") return true;
  const r = await (await getDb()).get("SELECT COUNT(*) c FROM users");
  return Number(r?.c ?? 0) === 0;
}

export async function createUser(email: string, password: string, displayName?: string): Promise<{ user?: User; error?: string }> {
  if (!(await signupOpen())) return { error: "이 사이트는 가입이 닫혀 있어요." };
  email = email.trim().toLowerCase();
  if (!validEmail(email)) return { error: "이메일 모양이 맞지 않아요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이에요." };
  const db = await getDb();
  if (await db.get("SELECT 1 FROM users WHERE email = ?", [email])) return { error: "이미 가입한 이메일이에요." };
  const salt = crypto.randomBytes(16).toString("hex");
  const r = await db.run("INSERT INTO users (email, display_name, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)", [email, displayName?.trim() || null, hash(password, salt), salt, now()]);
  return { user: { id: Number(r.lastInsertRowid), email, displayName: displayName?.trim() || null, currency: "robux" } };
}

export async function checkPassword(email: string, password: string): Promise<User | null> {
  const r = await (await getDb()).get("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  if (!r) return null;
  const a = Buffer.from(hash(password, String(r.salt)), "hex");
  const b = Buffer.from(String(r.pass_hash), "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return toUser(r);
}

function toUser(r: Record<string, unknown>): User {
  return { id: Number(r.id), email: String(r.email), displayName: (r.display_name as string) ?? null, currency: r.currency === "usd" ? "usd" : "robux" };
}

export async function startSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  await (await getDb()).run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [token, userId, now() + SESSION_DAYS * 86400]);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400, secure: process.env.NODE_ENV === "production" });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await (await getDb()).run("DELETE FROM sessions WHERE token = ?", [token]);
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const r = await (await getDb()).get("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?", [token, now()]);
  return r ? toUser(r) : null;
}

/** 관리자 = ADMIN_EMAILS(쉼표로 여러 개)에 적힌 이메일. 값은 서버 비밀 설정에만 둬요(저장소에 X). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export async function currentAdmin(): Promise<User | null> {
  const u = await currentUser();
  return u && isAdminEmail(u.email) ? u : null;
}
