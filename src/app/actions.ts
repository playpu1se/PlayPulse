"use server";
// 화면의 버튼·양식이 부르는 서버 동작. 로그인 필요한 것은 모두 currentUser() 로 확인해요.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, createUser, currentUser, endSession, startSession } from "@/lib/auth";
import * as ud from "@/lib/userdata";

export type FormState = { error?: string; ok?: string } | undefined;

// 로그인 뒤 돌아갈 주소는 우리 사이트 안(/...)만 허락해요
function safeNext(v: FormDataEntryValue | null): string {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/dashboard";
}

export async function signupAction(_: FormState, f: FormData): Promise<FormState> {
  const r = await createUser(String(f.get("email") ?? ""), String(f.get("password") ?? ""), String(f.get("name") ?? ""));
  if (r.error || !r.user) return { error: r.error };
  await startSession(r.user.id);
  redirect(safeNext(f.get("next")));
}

// 로그인 실패가 많으면 잠깐 막기 (서버 메모리 · 이메일별)
const fails = new Map<string, { n: number; until: number }>();
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

export async function loginAction(_: FormState, f: FormData): Promise<FormState> {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const rec = fails.get(email);
  if (rec && rec.until > Date.now()) return { error: "너무 많이 틀렸어요. 15분 뒤에 다시 해 주세요." };
  const u = await checkPassword(email, String(f.get("password") ?? ""));
  if (!u) {
    const n = (rec && rec.until > 0 && rec.until <= Date.now() ? 0 : (rec?.n ?? 0)) + 1;
    fails.set(email, { n, until: n >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
    return { error: "이메일이나 비밀번호가 맞지 않아요." };
  }
  fails.delete(email);
  await startSession(u.id);
  redirect(safeNext(f.get("next")));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

async function need() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function createListAction(f: FormData) {
  const u = await need();
  const id = await ud.createList(u.id, String(f.get("name") ?? ""));
  const uid = Number(f.get("universeId") ?? 0);
  if (uid) await ud.setInList(u.id, id, uid, true);
  revalidatePath("/lists");
  if (!uid) redirect(`/lists/${id}`);
  revalidatePath(`/game/${uid}`);
}

export async function renameListAction(f: FormData) {
  const u = await need();
  await ud.renameList(u.id, Number(f.get("listId")), String(f.get("name") ?? ""));
  revalidatePath("/lists");
}

export async function deleteListAction(f: FormData) {
  const u = await need();
  await ud.deleteList(u.id, Number(f.get("listId")));
  redirect("/lists");
}

export async function toggleListItemAction(listId: number, uid: number, on: boolean) {
  const u = await need();
  await ud.setInList(u.id, listId, uid, on);
  revalidatePath(`/lists/${listId}`);
  revalidatePath(`/game/${uid}`);
}

export async function addMyGameAction(_: FormState, f: FormData): Promise<FormState> {
  const u = await need();
  const r = await ud.addMyGame(u.id, String(f.get("game") ?? ""));
  if (r.error) return { error: r.error };
  revalidatePath("/dashboard");
  return { ok: "추가했어요. 다음 수집(최대 30분)부터 그래프가 쌓여요." };
}

export async function removeMyGameAction(f: FormData) {
  const u = await need();
  await ud.removeMyGame(u.id, Number(f.get("universeId")));
  revalidatePath("/dashboard");
}

export async function toggleSubscribeAction(uid: number, on: boolean) {
  const u = await need();
  await ud.setSubscribed(u.id, uid, on);
  revalidatePath(`/game/${uid}`);
  revalidatePath("/alerts");
}

export async function markAllReadAction() {
  const u = await need();
  await ud.markAllRead(u.id);
  revalidatePath("/alerts");
}

export async function settingsAction(_: FormState, f: FormData): Promise<FormState> {
  const u = await need();
  const cur = f.get("currency");
  await ud.updateSettings(u.id, { displayName: String(f.get("name") ?? ""), currency: cur === "usd" ? "usd" : "robux" });
  revalidatePath("/", "layout");
  return { ok: "저장했어요." };
}

export async function setCurrencyAction(currency: "robux" | "usd") {
  const u = await currentUser();
  if (u) await ud.updateSettings(u.id, { currency });
  revalidatePath("/", "layout");
}
