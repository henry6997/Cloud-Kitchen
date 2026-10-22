import { createHmac, timingSafeEqual } from "node:crypto";
import type { Order } from "../types";
import { getRepo } from "./index";
import { notifyStatus } from "./orders";

const base = () => (process.env.CASHFREE_ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg");
const headers = () => ({
  "x-client-id": process.env.CASHFREE_APP_ID ?? "",
  "x-client-secret": process.env.CASHFREE_SECRET_KEY ?? "",
  "x-api-version": "2023-08-01",
  "content-type": "application/json",
});

export const cashfreeConfigured = (): boolean => Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);

export interface GatewaySession {
  gatewayOrderId: string;
  paymentSessionId: string;
}

/** Server creates the Cashfree order; the browser only receives the session id. */
export async function createGatewayOrder(order: Order, email: string, siteUrl: string): Promise<GatewaySession> {
  // A retry reuses the open Cashfree order instead of failing on a duplicate id.
  const existing = await fetch(`${base()}/orders/${order.id}`, { headers: headers() });
  if (existing.ok) {
    const e = (await existing.json()) as { order_id: string; order_status?: string; payment_session_id?: string };
    if (e.order_status === "ACTIVE" && e.payment_session_id) return { gatewayOrderId: e.order_id, paymentSessionId: e.payment_session_id };
  }
  const res = await fetch(`${base()}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: order.id,
      order_amount: Number((order.totalPaise / 100).toFixed(2)),
      order_currency: "INR",
      customer_details: { customer_id: order.userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50), customer_phone: order.customerPhone.replace("+91", ""), customer_name: order.customerName, customer_email: email },
      order_meta: { return_url: `${siteUrl}/order/${order.id}?return=1`, notify_url: `${siteUrl}/api/cashfree/webhook` },
    }),
  });
  if (!res.ok) throw new Error(`Cashfree order failed (${res.status})`);
  const json = (await res.json()) as { cf_order_id?: string | number; order_id: string; payment_session_id: string };
  await getRepo().recordPayment({ orderId: order.id, gatewayOrderId: json.order_id, gatewayPaymentId: "", amountPaise: order.totalPaise, status: "created", raw: json });
  return { gatewayOrderId: json.order_id, paymentSessionId: json.payment_session_id };
}

/** Cashfree signs `timestamp + rawBody` with the secret key (HMAC-SHA256, base64). */
export function verifyWebhookSignature(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret || !timestamp || !signature) return false;
  const expected = createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface WebhookPayload {
  type?: string;
  data?: { order?: { order_id?: string; order_amount?: number }; payment?: { cf_payment_id?: string | number; payment_status?: string; payment_amount?: number } };
}

/** Idempotent: replays of the same webhook leave the order untouched. */
export async function applyPaymentEvent(payload: WebhookPayload): Promise<"paid" | "failed" | "ignored"> {
  const repo = getRepo();
  const orderId = payload.data?.order?.order_id;
  const pay = payload.data?.payment;
  if (!orderId || !pay) return "ignored";
  const order = await repo.getOrder(orderId);
  if (!order || order.paymentMethod !== "online") return "ignored";

  const status = (pay.payment_status ?? "").toUpperCase();
  await repo.recordPayment({ orderId, gatewayOrderId: orderId, gatewayPaymentId: String(pay.cf_payment_id ?? ""), amountPaise: Math.round((pay.payment_amount ?? 0) * 100), status, raw: payload });

  if (status === "SUCCESS") {
    if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") return "paid";
    if (Math.round((pay.payment_amount ?? 0) * 100) !== order.totalPaise) return "ignored"; // never trust a mismatched amount
    const updated = await repo.setPaymentStatus(orderId, "paid");
    await notifyStatus(updated).catch(() => undefined);
    return "paid";
  }
  if (status === "FAILED" || status === "USER_DROPPED") {
    if (order.paymentStatus === "pending") await repo.setPaymentStatus(orderId, "failed");
    return "failed";
  }
  return "ignored";
}

/** Safety net when the customer returns before the webhook lands. */
export async function confirmWithGateway(orderId: string): Promise<void> {
  if (!cashfreeConfigured()) return;
  const res = await fetch(`${base()}/orders/${orderId}`, { headers: headers() });
  if (!res.ok) return;
  const json = (await res.json()) as { order_status?: string; order_amount?: number };
  if (json.order_status === "PAID") {
    const order = await getRepo().getOrder(orderId);
    if (order && order.paymentStatus === "pending" && Math.round((json.order_amount ?? 0) * 100) === order.totalPaise) await getRepo().setPaymentStatus(orderId, "paid");
  }
}
