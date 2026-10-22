"use client";
import { useEffect, useState } from "react";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function b64ToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!VAPID || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID) }));
  const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
  return res.ok;
}

/** Asked only after the first order is placed, with a short reason. */
export function PushPrompt() {
  const [mode, setMode] = useState<"hidden" | "ask" | "install" | "done">("hidden");

  useEffect(() => {
    if (!VAPID || localStorage.getItem("blip.push.dismissed")) return;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (ios && !standalone) return setMode("install");
    if ("Notification" in window && Notification.permission === "default") setMode("ask");
  }, []);

  if (mode === "hidden" || mode === "done") return mode === "done" ? <p className="ok-msg" role="status">Order updates are on.</p> : null;
  const dismiss = () => {
    try {
      localStorage.setItem("blip.push.dismissed", "1");
    } catch {
      /* ignore */
    }
    setMode("hidden");
  };

  return (
    <div className="pwa" role="region" aria-label="Order updates">
      <p>
        {mode === "install"
          ? "Add Blip to your Home Screen (Share, then Add to Home Screen) to get order updates on iPhone."
          : "Get a quick alert when your food is on its way?"}
      </p>
      {mode === "ask" ? (
        <button type="button" className="btn sm primary" onClick={async () => setMode((await subscribeToPush()) ? "done" : "hidden")}>Turn on</button>
      ) : null}
      <button type="button" className="btn sm ghost" onClick={dismiss}>Not now</button>
    </div>
  );
}
