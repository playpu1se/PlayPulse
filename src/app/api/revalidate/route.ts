// 수집이 끝나면 수집기가 불러요: 저장해 둔 공개 데이터(5분 캐시)를 바로 지워 새 숫자가 보이게 해요.
// 비밀값(REVALIDATE_SECRET)이 맞아야만 해요.
import { revalidateTag } from "next/cache";
import { DATA_TAG } from "@/lib/cached";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  revalidateTag(DATA_TAG);
  return Response.json({ ok: true });
}
