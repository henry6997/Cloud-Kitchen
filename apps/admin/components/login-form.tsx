"use client";
import { useActionState } from "react";
import { BRAND } from "@blip/db";
import { loginAction, type FormState } from "@/app/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <main className="logins">
      <div className="box">
        <div className="brand">{BRAND.name}</div>
        <h1 style={{ marginBottom: 6 }}>Kitchen dashboard</h1>
        <p className="desc" style={{ marginTop: 0 }}>Sign in with the owner account.</p>
        <form action={action} className="card flat">
          <input type="hidden" name="next" value={next} />
          <label className="field" style={{ marginTop: 0 }}>
            <span>Email</span>
            <input type="email" name="email" autoComplete="username" required autoFocus />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          {state.error ? <p className="err" role="alert">{state.error}</p> : null}
          <button type="submit" className="btn primary block" style={{ marginTop: 18 }} disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </main>
  );
}
