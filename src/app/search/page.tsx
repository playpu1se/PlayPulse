import Link from "next/link";
import { GameTile } from "@/components/GameBits";
import { genres, search, type SearchSort } from "@/lib/cached";

export const dynamic = "force-dynamic";

const SORTS: [SearchSort, string][] = [
  ["playing", "접속자"],
  ["revenue", "추정 수익"],
  ["rpv", "방문당 수익"],
  ["trend", "24시간 성장"],
  ["visits", "총 방문"],
  ["like", "좋아요 비율"],
];

const PER = 48;

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const sort = (SORTS.find(([k]) => k === sp.sort)?.[0] ?? "playing") as SearchSort;
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const genre = sp.genre ?? "";
  const min = Number(sp.min ?? 0) || 0;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [r, genreList] = await Promise.all([search({ q, sort, dir, genre: genre || undefined, minPlaying: min || undefined, limit: PER, offset: (page - 1) * PER }), genres()]);
  const pages = Math.max(1, Math.ceil(r.total / PER));
  const link = (p: number) => {
    const u = new URLSearchParams({ q, sort, dir, genre, min: String(min || ""), page: String(p) });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `/search?${u}`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold">게임 찾기</h1>
      <form className="card grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto_auto_auto]" action="/search">
        <input name="q" defaultValue={q} placeholder="게임 이름, 만든 사람, 또는 게임 id" className="input" />
        <select name="genre" defaultValue={genre} className="input md:w-40">
          <option value="">모든 장르</option>
          {genreList.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select name="min" defaultValue={String(min || "")} className="input md:w-36">
          <option value="">접속자 아무나</option>
          <option value="100">100명 이상</option>
          <option value="1000">1천 명 이상</option>
          <option value="10000">1만 명 이상</option>
        </select>
        <select name="sort" defaultValue={sort} className="input md:w-36">
          {SORTS.map(([k, l]) => (
            <option key={k} value={k}>
              {l} 순
            </option>
          ))}
        </select>
        <select name="dir" defaultValue={dir} className="input md:w-28">
          <option value="desc">큰 것부터</option>
          <option value="asc">작은 것부터</option>
        </select>
        <button className="btn btn-primary justify-center">찾기</button>
      </form>
      <p className="text-[13px] text-ink-3">
        {r.total.toLocaleString()}개 · 우리가 추적 중인 게임에서 찾아요. 없는 게임은 <Link href="/dashboard" className="underline">내 게임</Link>에 주소를 넣으면 추적을 시작해요.
      </p>
      {r.items.length === 0 ? (
        <div className="card p-10 text-center text-ink-3">맞는 게임이 없어요.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {r.items.map((g) => (
            <GameTile key={g.universeId} g={g} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {page > 1 && (
            <Link href={link(page - 1)} className="btn">
              ← 앞
            </Link>
          )}
          <span className="num text-[13px] text-ink-3">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link href={link(page + 1)} className="btn">
              다음 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
