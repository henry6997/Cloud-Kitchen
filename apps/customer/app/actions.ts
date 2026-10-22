"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addressSchema, createOrderSchema, firstError, loginSchema, profileSchema, resetSchema, signupSchema, type Address } from "@blip/db";
import {
  cashfreeConfigured,
  createGatewayOrder,
  getRepo,
  isDemoMode,
  placeOrder,
  rateLimit,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  confirmWithGateway,
  notifyStatus,
} from "@blip/db/server";
import { currentUser, SITE_URL } from "@/lib/auth";

export interface FormState {
  error?: string;
  message?: string;
}

const clientIp = async () => ((await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local");

/** Only same-site relative paths, never //host or /\host. */
const safeNext = (n: FormDataEntryValue | null): string => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/";
};

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const limit = rateLimit(`login:${await clientIp()}:${parsed.data.email}`, 8, 10 * 60_000);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };
  const res = await signIn("customer", parsed.data.email, parsed.data.password);
  if (!res.ok) return { error: res.error };
  redirect(safeNext(fd.get("next")));
}

export async function signupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({ fullName: fd.get("fullName"), email: fd.get("email"), phone: fd.get("phone"), password: fd.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const limit = rateLimit(`signup:${await clientIp()}`, 6, 60 * 60_000);
  if (!limit.ok) return { error: "Too many sign-ups from this device. Try again later." };
  const res = await signUp(parsed.data);
  if (!res.ok) return { error: res.error };
  if (res.message) return { message: res.message };
  redirect(safeNext(fd.get("next")));
}

export async function forgotAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({ email: fd.get("email") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!rateLimit(`reset:${await clientIp()}`, 5, 60 * 60_000).ok) return { error: "Too many requests. Try again later." };
  const res = await requestPasswordReset(parsed.data.email, `${SITE_URL}/auth/callback?next=/reset-password`);
  return res.ok ? { message: res.message } : { error: res.error };
}

export async function logoutAction(): Promise<void> {
  await signOut("customer");
  redirect("/");
}

/* ---------- account ---------- */

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const parsed = profileSchema.safeParse({ fullName: fd.get("fullName"), phone: fd.get("phone") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  await getRepo().updateProfile(user.id, parsed.data);
  revalidatePath("/account");
  return { message: "Saved" };
}

export type AddressResult = { ok: true; address: Address } | { ok: false; error: string };

export async function saveAddressAction(raw: unknown): Promise<AddressResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const address = await getRepo().saveAddress(user.id, parsed.data);
  revalidatePath("/account");
  revalidatePath("/checkout");
  return { ok: true, address };
}

export async function deleteAddressAction(id: string): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  await getRepo().deleteAddress(user.id, id);
  revalidatePath("/account");
  revalidatePath("/checkout");
}

/* ---------- ordering ---------- */

export type PlaceResult =
  | { ok: true; orderId: string; next: "tracking" | "demo-pay" | "cashfree"; sessionId?: string; mode?: "sandbox" | "production" }
  | { ok: false; error: string; needsLogin?: boolean; lineErrors?: { productId: string; message: string }[] };

export async function placeOrderAction(raw: unknown): Promise<PlaceResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Please sign in to place your order.", needsLogin: true };
  if (!rateLimit(`order:${user.id}`, 10, 10 * 60_000).ok) return { ok: false, error: "You're placing orders very quickly. Please wait a moment." };
  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (parsed.data.paymentMethod === "online" && !cashfreeConfigured() && !isDemoMode()) {
    return { ok: false, error: "Online payment isn't available right now. Choose cash on delivery." };
  }

  const res = await placeOrder(user.id, parsed.data);
  if (!res.ok) return res;
  const order = res.order;
  revalidatePath("/orders");

  if (order.paymentMethod === "cod") {
    await notifyStatus(order).catch(() => undefined);
    return { ok: true, orderId: order.id, next: "tracking" };
  }
  if (cashfreeConfigured()) {
    try {
      const g = await createGatewayOrder(order, user.email, SITE_URL);
      return { ok: true, orderId: order.id, next: "cashfree", sessionId: g.paymentSessionId, mode: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox" };
    } catch {
      return { ok: true, orderId: order.id, next: "tracking" }; // the order page offers "Pay now" again
    }
  }
  return { ok: true, orderId: order.id, next: "demo-pay" };
}

/** Retry payment on an existing online order that is not paid yet. */
export async function retryPaymentAction(orderId: string): Promise<PlaceResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Please sign in again.", needsLogin: true };
  const repo = getRepo();
  const order = await repo.getOrder(orderId);
  if (!order || order.userId !== user.id || order.paymentMethod !== "online" || order.status === "cancelled") return { ok: false, error: "This order can't be paid for." };
  if (order.paymentStatus === "paid") return { ok: true, orderId, next: "tracking" };
  if (order.paymentStatus === "failed") await repo.setPaymentStatus(orderId, "pending");
  if (cashfreeConfigured()) {
    try {
      const g = await createGatewayOrder(order, user.email, SITE_URL);
      return { ok: true, orderId, next: "cashfree", sessionId: g.paymentSessionId, mode: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox" };
    } catch {
      return { ok: false, error: "Couldn't reach the payment gateway. Try again in a moment." };
    }
  }
  return isDemoMode() ? { ok: true, orderId, next: "demo-pay" } : { ok: false, error: "Online payment isn't available right now." };
}

/** Demo gateway only (no Cashfree keys): lets the whole flow be tried locally. */
export async function demoPayAction(orderId: string, outcome: "success" | "fail"): Promise<void> {
  if (!isDemoMode()) return;
  const user = await currentUser();
  const repo = getRepo();
  const order = await repo.getOrder(orderId);
  if (!user || !order || order.userId !== user.id || order.paymentMethod !== "online") redirect("/orders");
  if (order.paymentStatus === "pending" || order.paymentStatus === "failed") {
    await repo.recordPayment({ orderId, gatewayOrderId: orderId, gatewayPaymentId: `demo_${Date.now()}`, amountPaise: order.totalPaise, status: outcome === "success" ? "SUCCESS" : "FAILED", raw: { demo: true } });
    const updated = await repo.setPaymentStatus(orderId, outcome === "success" ? "paid" : "failed");
    if (outcome === "success") await notifyStatus(updated).catch(() => undefined);
  }
  redirect(`/order/${orderId}?return=1`);
}

export async function verifyReturnAction(orderId: string): Promise<void> {
  await confirmWithGateway(orderId);
}

export interface ReorderLine {
  productId: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  optionIds: string[];
  optionsLabel: string;
  unitPaise: number;
  quantity: number;
}

/** Rebuilds a past order against today's menu; unavailable dishes are skipped. */
export async function reorderAction(orderId: string): Promise<{ lines: ReorderLine[]; skipped: string[] }> {
  const user = await currentUser();
  if (!user) return { lines: [], skipped: [] };
  const repo = getRepo();
  const order = await repo.getOrder(orderId);
  if (!order || order.userId !== user.id) return { lines: [], skipped: [] };
  const lines: ReorderLine[] = [];
  const skipped: string[] = [];
  for (const it of order.items) {
    const p = await repo.getProduct(it.productId);
    if (!p || !p.isAvailable) {
      skipped.push(it.name);
      continue;
    }
    const ids: string[] = [];
    let ok = true;
    for (const o of it.options) {
      const match = p.optionGroups.find((g) => g.name === o.group)?.options.find((x) => x.name === o.name && x.isAvailable);
      if (match) ids.push(match.id);
      else ok = false;
    }
    if (!ok) {
      skipped.push(it.name);
      continue;
    }
    const chosen = p.optionGroups.flatMap((g) => g.options.filter((o) => ids.includes(o.id)));
    lines.push({ productId: p.id, name: p.name, emoji: p.emoji, imageUrl: p.imageUrl, optionIds: ids, optionsLabel: chosen.map((o) => o.name).join(", "), unitPaise: p.pricePaise + chosen.reduce((a, o) => a + o.priceDeltaPaise, 0), quantity: it.quantity });
  }
  return { lines, skipped };
}
