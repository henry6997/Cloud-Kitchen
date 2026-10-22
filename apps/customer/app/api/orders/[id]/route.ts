import { NextResponse } from "next/server";
import { getRepo } from "@blip/db/server";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const order = await getRepo().getOrder(id);
  if (!order || order.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
}
