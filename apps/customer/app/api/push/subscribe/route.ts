import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepo } from "@blip/db/server";
import { currentUser } from "@/lib/auth";

const schema = z.object({ endpoint: z.url().max(600), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  await getRepo().addPushSub(user.id, parsed.data.endpoint, parsed.data.keys);
  return NextResponse.json({ ok: true });
}
