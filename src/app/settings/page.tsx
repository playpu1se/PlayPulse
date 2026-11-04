import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/userdata";
import { AccountShell } from "@/components/AccountNav";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "설정 — PlayPulse" };

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/settings");
  const unread = await unreadCount(user.id);
  return (
    <AccountShell active="/settings" unread={unread}>
      <h1 className="mb-4 text-2xl font-bold">설정</h1>
      <SettingsForm email={user.email} name={user.displayName ?? ""} currency={user.currency} />
    </AccountShell>
  );
}
