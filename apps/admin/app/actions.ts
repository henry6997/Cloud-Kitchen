"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { bannerSchema, cancelSchema, categorySchema, firstError, loginSchema, nextStatus, productSchema, riderSchema, settingsSchema, type Order } from "@blip/db";
import { getRepo, notifyStatus, rateLimit, requireOwner, signIn, signOut } from "@blip/db/server";

export interface FormState {
  error?: string;
  message?: string;
}
export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/* ---------- session ---------- */

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(`admin-login:${ip}`, 6, 10 * 60_000);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };
  const res = await signIn("admin", parsed.data.email, parsed.data.password);
  if (!res.ok) return { error: res.error };
  const next = String(fd.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/");
}

export async function logoutAction(): Promise<void> {
  await signOut("admin");
  redirect("/login");
}

/* ---------- orders ---------- */

async function after(order: Order): Promise<void> {
  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  revalidatePath("/");
}

export async function advanceOrderAction(orderId: string): Promise<Result> {
  const owner = await requireOwner();
  const repo = getRepo();
  const order = await repo.getOrder(orderId);
  if (!order) return fail("Order not found");
  const next = nextStatus(order.type, order.status);
  if (!next) return fail("This order is already complete.");
  if (next === "out_for_delivery" && !order.riderName.trim()) return fail("Add the rider's name before sending it out.");
  try {
    const updated = await repo.updateOrderStatus(orderId, next, owner.id);
    await repo.markNotificationsRead(orderId);
    await notifyStatus(updated).catch(() => undefined);
    await after(updated);
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not update the order");
  }
}

export async function cancelOrderAction(orderId: string, reason: string): Promise<Result> {
  const owner = await requireOwner();
  const parsed = cancelSchema.safeParse({ reason });
  if (!parsed.success) return fail(firstError(parsed.error));
  try {
    const repo = getRepo();
    const updated = await repo.updateOrderStatus(orderId, "cancelled", owner.id, parsed.data.reason);
    await repo.markNotificationsRead(orderId);
    await notifyStatus(updated).catch(() => undefined);
    await after(updated);
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not cancel the order");
  }
}

export async function saveRiderAction(orderId: string, name: string, phone: string): Promise<Result> {
  await requireOwner();
  const parsed = riderSchema.safeParse({ riderName: name, riderPhone: phone });
  if (!parsed.success) return fail(firstError(parsed.error));
  const updated = await getRepo().setRider(orderId, parsed.data.riderName, parsed.data.riderPhone);
  await after(updated);
  return { ok: true };
}

export async function markCashCollectedAction(orderId: string): Promise<Result> {
  await requireOwner();
  const repo = getRepo();
  const order = await repo.getOrder(orderId);
  if (!order || order.paymentMethod !== "cod") return fail("This order isn't cash on delivery.");
  if (order.status === "cancelled") return fail("This order was cancelled.");
  await after(await repo.setPaymentStatus(orderId, "collected"));
  return { ok: true };
}

export async function markNotificationsReadAction(): Promise<void> {
  await requireOwner();
  await getRepo().markNotificationsRead();
  revalidatePath("/orders");
}

/* ---------- products ---------- */

export async function saveProductAction(raw: unknown): Promise<Result<{ id: string }>> {
  await requireOwner();
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const p = await getRepo().upsertProduct(parsed.data);
  revalidatePath("/products");
  return { ok: true, data: { id: p.id } };
}

export async function deleteProductAction(id: string): Promise<Result> {
  await requireOwner();
  await getRepo().deleteProduct(id);
  revalidatePath("/products");
  return { ok: true };
}

export async function setAvailabilityAction(ids: string[], isAvailable: boolean): Promise<Result> {
  await requireOwner();
  if (!ids.length) return { ok: true };
  await getRepo().setProductsAvailability(ids, isAvailable);
  revalidatePath("/products");
  return { ok: true };
}

/* ---------- categories ---------- */

export async function saveCategoryAction(raw: unknown): Promise<Result> {
  await requireOwner();
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  await getRepo().upsertCategory(parsed.data);
  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<Result> {
  await requireOwner();
  try {
    await getRepo().deleteCategory(id);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not delete");
  }
  revalidatePath("/categories");
  return { ok: true };
}

export async function reorderCategoriesAction(ids: string[]): Promise<Result> {
  await requireOwner();
  await getRepo().reorderCategories(ids);
  revalidatePath("/categories");
  return { ok: true };
}

/* ---------- banners ---------- */

export async function saveBannerAction(raw: unknown): Promise<Result> {
  await requireOwner();
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  await getRepo().upsertBanner(parsed.data);
  revalidatePath("/banners");
  return { ok: true };
}

export async function deleteBannerAction(id: string): Promise<Result> {
  await requireOwner();
  await getRepo().deleteBanner(id);
  revalidatePath("/banners");
  return { ok: true };
}

export async function reorderBannersAction(slot: "hero" | "strip", ids: string[]): Promise<Result> {
  await requireOwner();
  await getRepo().reorderBanners(slot, ids);
  revalidatePath("/banners");
  return { ok: true };
}

/* ---------- settings ---------- */

export async function saveSettingsAction(raw: unknown): Promise<Result> {
  await requireOwner();
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  await getRepo().updateSettings(parsed.data);
  revalidatePath("/settings");
  return { ok: true };
}

export async function markOrderSeenAction(orderId: string): Promise<void> {
  await requireOwner();
  await getRepo().markNotificationsRead(orderId);
}
