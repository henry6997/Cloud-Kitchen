import { NextResponse } from "next/server";
import { getRepo, requireOwner } from "@blip/db/server";

export const dynamic = "force-dynamic";

/** Polled by the dashboard bell. Owner only, checked here as well as in the proxy. */
export async function GET() {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const items = await getRepo().listNotifications(20);
  return NextResponse.json({ items, unread: items.filter((n) => !n.isRead).length }, { headers: { "Cache-Control": "no-store" } });
}
