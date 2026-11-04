// 화면용: 공개 데이터 계산 결과를 5분 동안 저장해 빠르게 보여 줘요 (수집은 30분마다라 늦어지지 않아요).
// 로그인한 사람의 개인 데이터(목록·알림·설정)는 여기서 저장하지 않아요. 수집 스크립트는 queries.ts 를 바로 써요.
import { unstable_cache } from "next/cache";
import { now } from "./db";
import * as q from "./queries";

export type { GameCard, Granularity, RankingKind, SearchSort, SeriesPoint } from "./queries";
export { RANKINGS } from "./queries";

export const DATA_TAG = "data";
const KEEP = { revalidate: 300, tags: [DATA_TAG] };

export const stats = unstable_cache(() => q.stats(), ["stats"], KEEP);
export const genres = unstable_cache(() => q.genres(), ["genres"], KEEP);
export const ranking = unstable_cache((kind: q.RankingKind, limit = 100) => q.ranking(kind, limit), ["ranking"], KEEP);
export const search = unstable_cache((o: q.SearchOpts) => q.search(o), ["search"], KEEP);
export const feed = unstable_cache((mode: "explosive" | "steady", limit = 60) => q.feed(mode, limit), ["feed"], KEEP);
export const gameDetail = unstable_cache((uid: number) => q.gameDetail(uid), ["gameDetail"], KEEP);
export const periods = unstable_cache((uid: number) => q.periods(uid), ["periods"], KEEP);
export const similarGames = unstable_cache((uid: number) => q.similarGames(uid), ["similarGames"], KEEP);
export const platformCheck = unstable_cache(() => q.platformCheck(), ["platformCheck"], KEEP);

/** days 일 전부터 (시작 시각은 저장 키가 되므로 매번 바뀌지 않게 넘기지 않아요) */
export const platformSeries = unstable_cache((days: number) => q.platformSeries(now() - days * 86400), ["platformSeries"], KEEP);
export const gameSeries = unstable_cache((uid: number, days: number, g: q.Granularity) => q.gameSeries(uid, now() - days * 86400, g), ["gameSeries"], KEEP);

const cardsList = unstable_cache(async (ids: number[]) => [...(await q.cardsFor(ids)).values()], ["cardsList"], KEEP);
/** cardsFor 와 같은 모양(Map)으로 돌려줘요 */
export async function cardsFor(ids: number[]): Promise<Map<number, q.GameCard>> {
  const list = await cardsList([...ids].sort((a, b) => a - b));
  return new Map(list.map((c) => [c.universeId, c]));
}
