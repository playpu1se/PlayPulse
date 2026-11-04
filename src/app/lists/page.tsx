import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { unreadCount, userLists } from "@/lib/userdata";
import { AccountShell } from "@/components/AccountNav";
import { createListAction } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "내 목록 — PlayPulse" };

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/lists");
  const [lists, unread] = await Promise.all([userLists(user.id), unreadCount(user.id)]);
  return (
    <AccountShell active="/lists" unread={unread}>
      <h1 className="mb-1 text-2xl font-bold">내 목록</h1>
      <p className="mb-4 text-[14px] text-ink-3">마음에 드는 게임을 폴더처럼 모아 둘 수 있어요. 게임 화면에서 목록에 넣어요.</p>
      <form action={createListAction} className="card flex flex-col gap-2 p-4 sm:flex-row">
        <input name="name" required maxLength={60} className="input" placeholder="새 목록 이름 (예: 요즘 뜨는 게임)" aria-label="새 목록 이름" />
        <button className="btn btn-primary shrink-0 justify-center">목록 만들기</button>
      </form>
      {lists.length === 0 ? (
        <p className="card mt-4 p-6 text-center text-[14px] text-ink-3">아직 목록이 없어요. 위에서 하나 만들어 보세요.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {lists.map((l) => (
            <li key={l.id}>
              <Link href={`/lists/${l.id}`} className="card block p-4 hover:shadow-md">
                <div className="truncate text-[15px] font-bold">{l.name}</div>
                <div className="num text-[13px] text-ink-3">게임 {l.count}개</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
