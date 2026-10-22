import { NextResponse } from "next/server";
import { applyPaymentEvent, verifyWebhookSignature } from "@blip/db/server";

export const dynamic = "force-dynamic";

/**
 * Cashfree posts payment results here. The signature is checked against the raw
 * body before anything is parsed, and replays are harmless (idempotent).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const ok = verifyWebhookSignature(raw, req.headers.get("x-webhook-timestamp"), req.headers.get("x-webhook-signature"));
  if (!ok) return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  try {
    const result = await applyPaymentEvent(JSON.parse(raw));
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ error: "Could not process" }, { status: 500 });
  }
}
