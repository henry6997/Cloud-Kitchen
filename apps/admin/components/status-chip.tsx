import { STATUS_LABEL, type Order } from "@blip/db";

const STAGE: Record<Order["status"], string> = {
  placed: "s-new",
  accepted: "s-new",
  preparing: "s-prep",
  ready: "s-ready",
  out_for_delivery: "s-out",
  delivered: "s-done",
  picked_up: "s-done",
  cancelled: "s-bad",
};

/** Colour follows the stage: yellow needs action, blue cooking, violet ready, teal on the road, green done, red cancelled. */
export function StatusChip({ status }: { status: Order["status"] }) {
  return <span className={`chip ${STAGE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PayChip({ o }: { o: Pick<Order, "paymentMethod" | "paymentStatus"> }) {
  const label =
    o.paymentMethod === "cod"
      ? o.paymentStatus === "collected" ? "Cash collected" : "Cash to collect"
      : o.paymentStatus === "paid" ? "Paid online" : o.paymentStatus === "refunded" ? "Refunded" : o.paymentStatus === "failed" ? "Payment failed" : "Awaiting payment";
  const cls =
    o.paymentStatus === "collected" || o.paymentStatus === "paid" ? "s-done"
    : o.paymentStatus === "failed" ? "s-bad"
    : o.paymentMethod === "cod" && o.paymentStatus === "pending" ? "s-cash"
    : "s-idle";
  return <span className={`chip ${cls}`}>{label}</span>;
}
