import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listItems, listOwned, unreadCount } from "@/lib/userdata";
import { cardsFor } from "@/lib/cached";
import { AccountShell } from "@/components/AccountNav";
import { GameTile } from "@/components/GameBits";
import { DeleteListButton, RemoveFromListButton } from "@/components/ListForms";
import { renameListAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listId = Number(id);
  const user = await currentUser();
  if (!user) redirect(`/login?next=/lists/${id}`);
  const list = Number.isFinite(listId) ? await listOwned(user.id, listId) : null;
  if (!list) notFound();
  const ids = await listItems(list.id);
  const [cards, unread] = await Promise.all([cardsFor(ids), unreadCount(user.id)]);
  const games = ids.map((i) => cards.get(i)).filter((g) => !!g);
  return (
    <AccountShell active="/lists" unread={unread}>
      <Link href="/lists" className="text-[13px] text-ink-3 hover:underline">← 내 목록</Link>
      <h1 className="mb-4 mt-1 truncate text-2xl font-bold">{list.name}</h1>
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <form action={renameListAction} className="flex flex-1 gap-2">
          <input type="hidden" name="listId" value={list.id} />
          <input name="name" defaultValue={list.name} required maxLength={60} className="input" aria-label="목록 이름" />
          <button className="btn shrink-0">이름 바꾸기</button>
        </form>
        <DeleteListButton listId={list.id} />
      </div>
      {games.length === 0 ? (
        <p className="card mt-4 p-6 text-center text-[14px] text-ink-3">
          아직 비어 있어요. <Link href="/search" className="font-semibold text-pulse underline">게임 찾기</Link>에서 게임을 열고 이 목록에 넣어 보세요.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <li key={g.universeId} className="flex flex-col gap-2">
              <GameTile g={g} />
              <RemoveFromListButton listId={list.id} uid={g.universeId} />
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
