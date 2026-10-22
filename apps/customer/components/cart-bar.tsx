"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { inr } from "@blip/db";
import { GoalBar } from "@blip/ui";
import { useCart } from "./cart-provider";

/** Floating bar that appears after the first item and tracks progress to free delivery. */
export function CartBar() {
  const { count, subtotalPaise, freeAtPaise, ready } = useCart();
  const path = usePathname();
  if (!ready || count === 0 || path.startsWith("/order/") || path.startsWith("/account")) return null;
  const pct = Math.min(100, Math.round((subtotalPaise / freeAtPaise) * 100));
  return (
    <div className="cartbar">
      <div className="cb-top">
        <div>
          <b>{count} {count === 1 ? "item" : "items"}</b> <small>· {inr(subtotalPaise)}</small>
        </div>
        <Link className="cb-go" href="/cart">View cart</Link>
      </div>
      <GoalBar pct={pct} label={subtotalPaise >= freeAtPaise ? "Free delivery unlocked" : `Add ${inr(freeAtPaise - subtotalPaise)} more for free delivery`} />
    </div>
  );
}
