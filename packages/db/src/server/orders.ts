import type { CreateOrderInput } from "../schemas";
import { priceCart, type Pricing } from "../pricing";
import type { Order, OrderStatus } from "../types";
import { STATUS_LABEL } from "../status";
import { getRepo } from "./index";
import { sendPushToUser } from "./push";

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; error: string; lineErrors?: { productId: string; message: string }[] };

/**
 * Creates an order from scratch on the server: prices come from the database,
 * never from the browser. Returns the order, which is `placed` with payment pending.
 */
export async function placeOrder(userId: string, input: CreateOrderInput): Promise<PlaceOrderResult> {
  const repo = getRepo();
  const [products, settings, profile] = await Promise.all([repo.getProducts({ includeUnavailable: true }), repo.getSettings(), repo.getProfile(userId)]);
  if (!profile) return { ok: false, error: "Please sign in again." };

  const pricing: Pricing = priceCart({ lines: input.lines, products, settings, type: input.type });
  if (pricing.errors.length) return { ok: false, error: pricing.errors[0]!.message, lineErrors: pricing.errors };
  if (pricing.belowMinimum) return { ok: false, error: "Add a little more to reach the minimum order." };

  let address = null;
  if (input.type === "delivery") {
    const found = (await repo.listAddresses(userId)).find((a) => a.id === input.addressId);
    if (!found) return { ok: false, error: "Choose a delivery address." };
    if (settings.deliveryPincodes.length && !settings.deliveryPincodes.includes(found.pincode)) return { ok: false, error: `We don't deliver to ${found.pincode} yet. Try pickup or another address.` };
    address = { label: found.label, line1: found.line1, line2: found.line2, landmark: found.landmark, pincode: found.pincode };
  }

  const order = await repo.createOrder({
    userId,
    customerName: profile.fullName,
    customerPhone: profile.phone,
    type: input.type,
    paymentMethod: input.paymentMethod,
    note: input.note,
    address,
    pricing,
  });
  return { ok: true, order };
}

/** Customer-facing push copy for each status change. */
export function pushCopy(o: Pick<Order, "number">, status: OrderStatus): { title: string; body: string } {
  const bodies: Partial<Record<OrderStatus, string>> = {
    accepted: "The kitchen has accepted your order.",
    preparing: "Your food is being prepared.",
    ready: "Your order is ready.",
    out_for_delivery: "Your order is on its way.",
    delivered: "Delivered. Enjoy your meal!",
    picked_up: "Picked up. Enjoy your meal!",
    cancelled: "Your order was cancelled. Open the app for details.",
  };
  return { title: `Order #${o.number} · ${STATUS_LABEL[status]}`, body: bodies[status] ?? STATUS_LABEL[status] };
}

export async function notifyStatus(order: Order): Promise<void> {
  const { title, body } = pushCopy(order, order.status);
  await sendPushToUser(order.userId, { title, body, url: `/order/${order.id}` });
}
