"use client";
import { useState, useTransition } from "react";
import type { Address } from "@blip/db";
import { Sheet } from "@blip/ui";
import { saveAddressAction } from "@/app/actions";

export function AddressSheet({ open, onOpenChange, initial, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: Address | null; onSaved: (a: Address) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (fd: FormData) => {
    setError(null);
    start(async () => {
      const res = await saveAddressAction({
        id: initial?.id,
        label: fd.get("label"),
        line1: fd.get("line1"),
        line2: fd.get("line2") ?? "",
        landmark: fd.get("landmark") ?? "",
        pincode: fd.get("pincode"),
        isDefault: fd.get("isDefault") === "on",
      });
      if (!res.ok) return setError(res.error);
      onSaved(res.address);
      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={initial ? "Edit address" : "Add an address"}>
      <form action={submit} key={initial?.id ?? "new"}>
        <label className="field">
          <span>Label</span>
          <input name="label" defaultValue={initial?.label ?? ""} placeholder="Home, Work…" required maxLength={20} list="addr-labels" />
          <datalist id="addr-labels"><option value="Home" /><option value="Work" /><option value="Other" /></datalist>
        </label>
        <label className="field">
          <span>Flat, building, street</span>
          <input name="line1" defaultValue={initial?.line1 ?? ""} required maxLength={120} autoComplete="address-line1" />
        </label>
        <label className="field">
          <span>Area (optional)</span>
          <input name="line2" defaultValue={initial?.line2 ?? ""} maxLength={120} autoComplete="address-line2" />
        </label>
        <label className="field">
          <span>Landmark (optional)</span>
          <input name="landmark" defaultValue={initial?.landmark ?? ""} maxLength={80} />
        </label>
        <label className="field">
          <span>Pincode</span>
          <input name="pincode" defaultValue={initial?.pincode ?? ""} required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="postal-code" />
        </label>
        <label className="opt" style={{ marginTop: 6 }}>
          <input type="checkbox" name="isDefault" defaultChecked={initial?.isDefault ?? false} />
          <span className="ot">Use as my default address</span>
        </label>
        {error ? <p className="err" role="alert">{error}</p> : null}
        <button type="submit" className="btn primary block" style={{ marginTop: 14 }} disabled={pending}>{pending ? "Saving…" : "Save address"}</button>
      </form>
    </Sheet>
  );
}
