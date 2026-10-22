"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { formatPhone, type Address } from "@blip/db";
import { useToast } from "@blip/ui";
import { deleteAddressAction, logoutAction, updateProfileAction, type FormState } from "@/app/actions";
import { AddressSheet } from "./address-sheet";
import { subscribeToPush } from "./push-prompt";

type Theme = "system" | "light" | "dark";

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem("blip.theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {
      /* ignore */
    }
  }, []);
  const set = (t: Theme) => {
    setTheme(t);
    try {
      if (t === "system") (localStorage.removeItem("blip.theme"), document.documentElement.removeAttribute("data-theme"));
      else (localStorage.setItem("blip.theme", t), document.documentElement.setAttribute("data-theme", t));
    } catch {
      /* ignore */
    }
  };
  return [theme, set];
}

const initial: FormState = {};

export function AccountView({ name, email, phone, addresses: initialAddresses, pushAvailable }: { name: string; email: string; phone: string; addresses: Address[]; pushAvailable: boolean }) {
  const toast = useToast();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState<Address | null>(null);
  const [sheet, setSheet] = useState(false);
  const [theme, setTheme] = useTheme();
  const [profile, profileAction, saving] = useActionState(updateProfileAction, initial);
  const [pending, start] = useTransition();

  useEffect(() => setAddresses(initialAddresses), [initialAddresses]);

  const remove = (id: string) =>
    start(async () => {
      await deleteAddressAction(id);
      setAddresses((cur) => cur.filter((a) => a.id !== id));
      toast("Address removed");
    });

  return (
    <main className="app app--menu">
      <div className="head"><div className="hrow"><h1>Account</h1></div></div>
      <div className="list">
        <form action={profileAction} className="card flat" aria-label="Profile">
          <h2>Profile</h2>
          <label className="field">
            <span>Full name</span>
            <input name="fullName" defaultValue={name} required maxLength={60} autoComplete="name" />
          </label>
          <label className="field">
            <span>Mobile number</span>
            <input name="phone" defaultValue={formatPhone(phone)} required inputMode="tel" autoComplete="tel" />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={email} readOnly aria-readonly="true" />
          </label>
          {profile.error ? <p className="err" role="alert">{profile.error}</p> : null}
          {profile.message ? <p className="ok-msg" role="status">{profile.message}</p> : null}
          <button type="submit" className="btn block" style={{ marginTop: 16 }} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </form>

        <div className="card flat" id="addresses">
          <h2>Addresses <span>{addresses.length} saved</span></h2>
          {addresses.length === 0 ? <p className="hint" style={{ marginTop: 8 }}>Add where we should deliver.</p> : null}
          {addresses.map((a) => (
            <div key={a.id} className="crow">
              <div style={{ minWidth: 0 }}>
                <h3>{a.label} {a.isDefault ? <span className="chip" style={{ marginLeft: 6 }}>Default</span> : null}</h3>
                <p>{[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")} · {a.pincode}</p>
              </div>
              <span />
              <button type="button" className="rm" onClick={() => (setEditing(a), setSheet(true))}>Edit</button>
              <button type="button" className="rm" style={{ justifySelf: "end" }} onClick={() => remove(a.id)} disabled={pending}>Delete</button>
            </div>
          ))}
          <button type="button" className="more" onClick={() => (setEditing(null), setSheet(true))}>Add an address</button>
        </div>

        <fieldset className="card flat" style={{ marginLeft: 0, marginRight: 0 }}>
          <legend><h2 style={{ margin: 0 }}>Appearance</h2></legend>
          <div className="pills" role="group" aria-label="Theme">
            {(["system", "light", "dark"] as const).map((t) => (
              <button key={t} type="button" className="pill" style={{ flex: 1 }} aria-pressed={theme === t} onClick={() => setTheme(t)}>{t[0]?.toUpperCase()}{t.slice(1)}</button>
            ))}
          </div>
        </fieldset>

        {pushAvailable ? (
          <div className="card flat">
            <h2>Order updates</h2>
            <p className="hint" style={{ marginTop: 6 }}>Get an alert when your order is accepted, on its way, or delivered.</p>
            <button type="button" className="btn block" onClick={async () => toast((await subscribeToPush()) ? "Order updates are on" : "Notifications are blocked in your browser")}>Turn on notifications</button>
          </div>
        ) : null}

        <form action={logoutAction} style={{ marginTop: 20 }}>
          <button type="submit" className="btn danger block">Sign out</button>
        </form>
      </div>

      <AddressSheet
        open={sheet}
        onOpenChange={setSheet}
        initial={editing}
        onSaved={(a) => {
          setAddresses((cur) => [...cur.filter((x) => x.id !== a.id).map((x) => (a.isDefault ? { ...x, isDefault: false } : x)), a].sort((x, y) => Number(y.isDefault) - Number(x.isDefault)));
          toast("Address saved");
        }}
      />
    </main>
  );
}
