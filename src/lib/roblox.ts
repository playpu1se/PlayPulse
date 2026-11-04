// 로블록스 공개 API (로그인 없이 누구나 부를 수 있는 것만)

const UA = "PlayPulse/0.1 (local analytics)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PACE_MS = 350; // 차트·아이콘 요청 사이 쉬는 시간
const GAMES_PACE_MS = 2000; // games.roblox.com 은 짧은 시간 횟수 제한이 있어요(1.2초 간격이면 11번째에 429)

async function getJson<T>(url: string, tries = 5): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000) }); // 20초 안에 답 없으면 다시 시도
      if (res.status === 429) {
        last = new Error("HTTP 429");
        await sleep(10000 * (i + 1)); // 막히면 10초, 20초 … 기다려요
        continue;
      }
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return (await res.json()) as T;
    } catch (e) {
      last = e;
      await sleep(1500 * 2 ** i);
    }
  }
  throw last;
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export type ChartGame = { universeId: number; rootPlaceId: number; name: string; playerCount: number; genreL1?: string; isSponsored?: boolean };

const SESSION = "00000000-0000-4000-8000-000000000001";

/** 공식 차트 한 개를 pages 페이지까지. 순서 = 순위. 광고(스폰서) 칸은 빼요. */
export async function fetchChart(sortId: string, pages: number): Promise<ChartGame[]> {
  const out: ChartGame[] = [];
  let token = "";
  for (let p = 0; p < pages; p++) {
    if (p > 0) await sleep(PACE_MS);
    const url =
      `https://apis.roblox.com/explore-api/v1/get-sort-content?sessionId=${SESSION}&sortId=${encodeURIComponent(sortId)}` +
      `&device=computer&country=all` + (token ? `&pageToken=${encodeURIComponent(token)}` : "");
    const data = await getJson<{ games?: ChartGame[]; nextPageToken?: string }>(url);
    for (const g of data.games ?? []) if (!g.isSponsored) out.push(g);
    token = data.nextPageToken ?? "";
    if (!token) break;
  }
  return out;
}

export type RobloxGame = {
  id: number;
  rootPlaceId: number;
  name: string;
  description: string | null;
  creator: { id: number; name: string; type: string };
  playing: number;
  visits: number;
  favoritedCount: number;
  genre: string;
  genre_l1?: string;
  created: string;
  updated: string;
};

export async function fetchGames(ids: number[]): Promise<RobloxGame[]> {
  const out: RobloxGame[] = [];
  for (const part of chunks(ids, 50)) {
    await sleep(GAMES_PACE_MS);
    const d = await getJson<{ data: RobloxGame[] }>(`https://games.roblox.com/v1/games?universeIds=${part.join(",")}`);
    out.push(...d.data);
  }
  return out;
}

export async function fetchVotes(ids: number[]): Promise<{ id: number; upVotes: number; downVotes: number }[]> {
  const out: { id: number; upVotes: number; downVotes: number }[] = [];
  for (const part of chunks(ids, 50)) {
    await sleep(GAMES_PACE_MS);
    const d = await getJson<{ data: { id: number; upVotes: number; downVotes: number }[] }>(
      `https://games.roblox.com/v1/games/votes?universeIds=${part.join(",")}`,
    );
    out.push(...d.data);
  }
  return out;
}

export async function fetchIcons(ids: number[]): Promise<{ targetId: number; imageUrl: string | null }[]> {
  const out: { targetId: number; imageUrl: string | null }[] = [];
  for (const part of chunks(ids, 50)) {
    await sleep(PACE_MS);
    const d = await getJson<{ data: { targetId: number; imageUrl: string | null }[] }>(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${part.join(",")}&size=150x150&format=Png&isCircular=false`,
    );
    out.push(...d.data);
  }
  return out;
}

/** 장소(place) id → 유니버스(게임) id. 사용자가 로블록스 링크를 붙여 넣을 때 써요. */
export async function placeToUniverse(placeId: number): Promise<number | null> {
  try {
    const d = await getJson<{ universeId: number | null }>(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    return d.universeId ?? null;
  } catch {
    return null;
  }
}
