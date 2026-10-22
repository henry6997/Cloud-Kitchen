"use client";
import { useState, useTransition } from "react";
import { formatPhone, paiseToRupeesString, parseRupeesToPaise, type Settings } from "@blip/db";
import { Switch, useToast } from "@blip/ui";
import { saveSettingsAction } from "@/app/actions";

export function SettingsForm({ settings: s }: { settings: Settings }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    kitchenName: s.kitchenName,
    address: s.address,
    phone: formatPhone(s.phone),
    fee: paiseToRupeesString(s.deliveryFeePaise),
    free: paiseToRupeesString(s.freeDeliveryThresholdPaise),
    min: paiseToRupeesString(s.minOrderPaise),
    gst: String(s.gstPercent),
    pincodes: s.deliveryPincodes.join(", "),
    pickup: String(s.pickupEtaMinutes),
    eta: s.deliveryEtaText,
  });
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }));

  const save = () => {
    setError(null);
    const fee = parseRupeesToPaise(f.fee), free = parseRupeesToPaise(f.free), min = parseRupeesToPaise(f.min);
    if (fee === null || free === null || min === null) return setError("Enter amounts in rupees, like 30 or 399");
    // Postel's law: accept commas, spaces or new lines between pincodes.
    const pins = f.pincodes.split(/[\s,;]+/).filter(Boolean);
    start(async () => {
      const res = await saveSettingsAction({
        kitchenName: f.kitchenName,
        address: f.address,
        phone: f.phone,
        deliveryFeePaise: fee,
        freeDeliveryThresholdPaise: free,
        minOrderPaise: min,
        gstPercent: Number(f.gst) || 0,
        deliveryPincodes: pins,
        pickupEtaMinutes: Number(f.pickup) || 20,
        deliveryEtaText: f.eta,
        enforceKitchenHours: s.enforceKitchenHours,
      });
      if (!res.ok) return setError(res.error);
      toast("Settings saved");
    });
  };

  return (
    <form onSubmit={(e) => (e.preventDefault(), save())}>
      <div className="two">
        <div className="stack">
          <section className="panel">
            <h2 className="panel-h">Kitchen</h2>
            <div className="panel-b formgrid">
              <label className="field full" style={{ marginTop: 0 }}><span>Kitchen name</span><input value={f.kitchenName} onChange={(e) => set("kitchenName", e.target.value)} required maxLength={60} /></label>
              <label className="field full"><span>Address (shown for pickup)</span><textarea value={f.address} onChange={(e) => set("address", e.target.value)} maxLength={200} /></label>
              <label className="field"><span>Phone (for “Call kitchen”)</span><input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" required /></label>
              <label className="field"><span>Pickup ready in (minutes)</span><input value={f.pickup} onChange={(e) => set("pickup", e.target.value)} inputMode="numeric" /></label>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-h">Delivery</h2>
            <div className="panel-b formgrid">
              <label className="field"><span>Delivery fee (₹)</span><input value={f.fee} onChange={(e) => set("fee", e.target.value)} inputMode="decimal" required /></label>
              <label className="field"><span>Free delivery from (₹)</span><input value={f.free} onChange={(e) => set("free", e.target.value)} inputMode="decimal" required /></label>
              <label className="field"><span>Minimum order (₹)</span><input value={f.min} onChange={(e) => set("min", e.target.value)} inputMode="decimal" required /></label>
              <label className="field"><span>Delivery time shown to customers</span><input value={f.eta} onChange={(e) => set("eta", e.target.value)} maxLength={30} placeholder="30–40 min" /></label>
              <label className="field full"><span>Pincodes you deliver to</span><textarea value={f.pincodes} onChange={(e) => set("pincodes", e.target.value)} placeholder="560038, 560008" /><small>Separate with commas, spaces or new lines. Leave empty to deliver anywhere.</small></label>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <h2 className="panel-h">Tax</h2>
            <div className="panel-b">
              <label className="field" style={{ marginTop: 0 }}><span>GST (%) added to the items total</span><input value={f.gst} onChange={(e) => set("gst", e.target.value)} inputMode="decimal" /><small>Use 0 if you're not GST registered. Customers see it as its own line.</small></label>
            </div>
          </section>
          <section className="panel">
            <h2 className="panel-h">Kitchen hours</h2>
            <div className="panel-b">
              <div className="swrow">
                <span>Enforce opening hours<br /><small style={{ color: "var(--mute)" }}>Not active in this version. The setting is stored so hours can be added later.</small></span>
                <Switch checked={s.enforceKitchenHours} onCheckedChange={() => undefined} label="Enforce kitchen hours" disabled />
              </div>
            </div>
          </section>
        </div>
      </div>
      <div className="sticky-actions">
        {error ? <span className="err" role="alert" style={{ margin: "0 auto 0 0", alignSelf: "center" }}>{error}</span> : null}
        <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
      </div>
    </form>
  );
}
