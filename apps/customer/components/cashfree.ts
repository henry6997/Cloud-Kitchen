interface CashfreeSdk {
  checkout: (opts: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_modal" }) => Promise<unknown>;
}
declare global {
  interface Window {
    Cashfree?: (opts: { mode: "sandbox" | "production" }) => CashfreeSdk;
  }
}

const SDK = "https://sdk.cashfree.com/js/v3/cashfree.js";

/** Loads Cashfree's hosted checkout script on demand and opens it for a server-created session. */
export async function openCashfree(sessionId: string, mode: "sandbox" | "production"): Promise<void> {
  if (!window.Cashfree) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SDK;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load the payment window"));
      document.head.appendChild(s);
    });
  }
  if (!window.Cashfree) throw new Error("Payment window unavailable");
  await window.Cashfree({ mode }).checkout({ paymentSessionId: sessionId, redirectTarget: "_self" });
}
