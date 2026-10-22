"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { BRAND } from "@blip/db";
import { forgotAction, loginAction, signupAction, type FormState } from "@/app/actions";
import { BackButton } from "./detail-view";

const initial: FormState = {};

function Status({ s }: { s: FormState }) {
  return (
    <>
      {s.error ? <p className="err" role="alert">{s.error}</p> : null}
      {s.message ? <p className="ok-msg" role="status">{s.message}</p> : null}
    </>
  );
}

export function LoginView({ next, initialMode }: { next: string; initialMode: "signin" | "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [signIn, signInAction, signingIn] = useActionState(loginAction, initial);
  const [signUp, signUpAction, signingUp] = useActionState(signupAction, initial);

  return (
    <main className="app app--detail">
      <header className="dtop">
        <BackButton fallback="/" />
        <span className="ttl show">{BRAND.name}</span>
        <span className="ib" style={{ visibility: "hidden" }} aria-hidden="true" />
      </header>

      <h1 className="page-title" style={{ marginTop: 18 }}>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p className="desc" style={{ marginTop: 4 }}>{mode === "signin" ? "Sign in to order and track your food." : "A few details so we can deliver to you."}</p>

      <div className="pills" role="group" aria-label="Sign in or create account">
        <button type="button" className="pill" aria-pressed={mode === "signin"} onClick={() => setMode("signin")}>Sign in</button>
        <button type="button" className="pill" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>Create account</button>
      </div>

      {mode === "signin" ? (
        <form action={signInAction} className="card flat" aria-label="Sign in">
          <input type="hidden" name="next" value={next} />
          <label className="field" style={{ marginTop: 0 }}>
            <span>Email</span>
            <input type="email" name="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <Status s={signIn} />
          <button type="submit" className="btn primary block" style={{ marginTop: 18 }} disabled={signingIn}>{signingIn ? "Signing in…" : "Sign in"}</button>
          <p style={{ textAlign: "center", margin: "10px 0 0" }}><Link className="link" href="/forgot">Forgot password?</Link></p>
        </form>
      ) : (
        <form action={signUpAction} className="card flat" aria-label="Create account">
          <input type="hidden" name="next" value={next} />
          <label className="field" style={{ marginTop: 0 }}>
            <span>Full name</span>
            <input type="text" name="fullName" autoComplete="name" required maxLength={60} />
          </label>
          <label className="field">
            <span>Mobile number</span>
            <input type="tel" name="phone" autoComplete="tel" inputMode="tel" required placeholder="98765 43210" />
            <small>We'll only use it for your order. +91 is added for you.</small>
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" name="password" autoComplete="new-password" required minLength={8} />
            <small>At least 8 characters.</small>
          </label>
          <Status s={signUp} />
          <button type="submit" className="btn primary block" style={{ marginTop: 18 }} disabled={signingUp}>{signingUp ? "Creating…" : "Create account"}</button>
        </form>
      )}
    </main>
  );
}

export function ForgotView() {
  const [state, action, pending] = useActionState(forgotAction, initial);
  return (
    <main className="app app--detail">
      <header className="dtop">
        <BackButton fallback="/login" />
        <span className="ttl show">Reset password</span>
        <span className="ib" style={{ visibility: "hidden" }} aria-hidden="true" />
      </header>
      <h1 className="page-title" style={{ marginTop: 18 }}>Forgot your password?</h1>
      <p className="desc" style={{ marginTop: 4 }}>Enter your email and we'll send a link to choose a new one.</p>
      <form action={action} className="card flat">
        <label className="field" style={{ marginTop: 0 }}>
          <span>Email</span>
          <input type="email" name="email" autoComplete="email" required placeholder="you@example.com" />
        </label>
        <Status s={state} />
        <button type="submit" className="btn primary block" style={{ marginTop: 18 }} disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
      </form>
    </main>
  );
}
