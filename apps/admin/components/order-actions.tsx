"use client";
import { useEffect, useState, useTransition } from "react";
import { ACTION_LABEL, canCancel, formatPhone, nextStatus, type Order } from "@blip/db";
import { useToast } from "@blip/ui";
import { advanceOrderAction, cancelOrderAction, markCashCollectedAction, markOrderSeenAction, saveRiderAction } from "@/app/actions";

export function OrderActions({ order }: { order: Order }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [rider, setRider] = useState({ name: order.riderName, phone: order.riderPhone ? formatPhone(order.riderPhone) : "" });

  useEffect(() => void markOrderSeenAction(order.id), [order.id]);
  useEffect(() => setRider({ name: order.riderName, phone: order.riderPhone ? formatPhone(order.riderPhone) : "" }), [order.riderName, order.riderPhone]);

  const next = nextStatus(order.type, order.status);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Something went wrong");
      toast(done);
      setCancelling(false);
    });

  return (
    <div className="stack">
      {next ? (
        <button type="button" className="btn primary block" style={{ minHeight: 52 }} disabled={pending} onClick={() => run(() => advanceOrderAction(order.id), "Order updated")}>
          {ACTION_LABEL[next]}
        </button>
      ) : null}
      {error ? <p className="err" role="alert">{error}</p> : null}

      {canCancel(order.type, order.status) ? (
        cancelling ? (
          <div className="og" style={{ marginTop: 0 }}>
            <label className="field" style={{ marginTop: 0 }}>
              <span>Reason for cancelling (the customer sees this)</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} autoFocus />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" className="btn danger" disabled={pending} onClick={() => run(() => cancelOrderAction(order.id, reason), "Order cancelled")}>Cancel order</button>
              <button type="button" className="btn ghost" onClick={() => setCancelling(false)}>Keep order</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn ghost block" onClick={() => setCancelling(true)}>Cancel order…</button>
        )
      ) : null}

      {order.type === "delivery" && order.status !== "cancelled" ? (
        <form
          className="og"
          style={{ marginTop: 16 }}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveRiderAction(order.id, rider.name, rider.phone), "Rider saved");
          }}
        >
          <b style={{ fontWeight: 500 }}>Rider</b>
          <p className="hint" style={{ margin: "2px 0 0" }}>Shown on the customer's tracking page.</p>
          <label className="field">
            <span>Name</span>
            <input value={rider.name} onChange={(e) => setRider({ ...rider, name: e.target.value })} maxLength={60} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={rider.phone} onChange={(e) => setRider({ ...rider, phone: e.target.value })} inputMode="tel" placeholder="98765 43210" />
          </label>
          <button type="submit" className="btn block" style={{ marginTop: 12 }} disabled={pending}>Save rider</button>
        </form>
      ) : null}
    </div>
  );
}

export function CashButton({ order }: { order: Order }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn block"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await markCashCollectedAction(order.id);
          toast(res.ok ? "Cash marked as collected" : res.error);
        })
      }
    >
      Mark cash collected
    </button>
  );
}

export function PrintButton() {
  return <button type="button" className="btn sm" onClick={() => window.print()}>Print ticket</button>;
}
