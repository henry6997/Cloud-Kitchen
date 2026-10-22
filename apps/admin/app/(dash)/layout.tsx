import { redirect } from "next/navigation";
import { getRepo, requireOwner } from "@blip/db/server";
import { Shell } from "@/components/shell";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner().catch(() => null);
  if (!owner) redirect("/login");
  const items = await getRepo().listNotifications(20);
  return (
    <Shell owner={{ name: owner.fullName || "Owner", email: owner.email }} initial={{ items, unread: items.filter((n) => !n.isRead).length }}>
      {children}
    </Shell>
  );
}
