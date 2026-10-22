import type { Order, OrderStatus, OrderType } from "./types";

/** Forward-only status chains. Cancel is allowed from any state before the last one. */
const CHAINS: Record<OrderType, OrderStatus[]> = {
  delivery: ["placed", "accepted", "preparing", "ready", "out_for_delivery", "delivered"],
  pickup: ["placed", "accepted", "preparing", "ready", "picked_up"],
};

export const chainFor = (type: OrderType): OrderStatus[] => CHAINS[type];

export function nextStatus(type: OrderType, current: OrderStatus): OrderStatus | null {
  if (current === "cancelled") return null;
  const chain = CHAINS[type];
  const i = chain.indexOf(current);
  return i >= 0 && i < chain.length - 1 ? (chain[i + 1] ?? null) : null;
}

export const canCancel = (type: OrderType, current: OrderStatus): boolean => {
  if (current === "cancelled") return false;
  const chain = CHAINS[type];
  return chain.indexOf(current) < chain.length - 1;
};

export const isFinal = (type: OrderType, s: OrderStatus): boolean => s === "cancelled" || s === CHAINS[type][CHAINS[type].length - 1];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order placed",
  accepted: "Accepted by kitchen",
  preparing: "Being prepared",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  picked_up: "Picked up",
  cancelled: "Cancelled",
};

/** What the owner's primary button says for each next step. */
export const ACTION_LABEL: Record<OrderStatus, string> = {
  placed: "Place",
  accepted: "Accept order",
  preparing: "Start preparing",
  ready: "Mark ready",
  out_for_delivery: "Send out for delivery",
  delivered: "Mark delivered",
  picked_up: "Mark picked up",
  cancelled: "Cancel",
};

/** Online orders only count once payment succeeds. COD counts immediately. */
export const isConfirmed = (o: Pick<Order, "paymentMethod" | "paymentStatus">): boolean =>
  o.paymentMethod === "cod" || o.paymentStatus === "paid" || o.paymentStatus === "refunded";

export type OrderTab = "new" | "preparing" | "ready" | "out" | "completed" | "cancelled";

export function tabOf(o: Pick<Order, "status">): OrderTab {
  switch (o.status) {
    case "placed":
    case "accepted":
      return "new";
    case "preparing":
      return "preparing";
    case "ready":
      return "ready";
    case "out_for_delivery":
      return "out";
    case "delivered":
    case "picked_up":
      return "completed";
    default:
      return "cancelled";
  }
}
