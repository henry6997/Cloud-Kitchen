import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import type { Role } from "../types";
import { loadDemo, saveDemo } from "./demo-repo";
import { verifyPassword, hashPassword } from "./password";
import { type AppName, cookieName, createSessionToken, readSessionToken, supabaseConfigured } from "./session";
import { getRepo } from "./index";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
}

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

const GENERIC = "Wrong email or password";

async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // called from a server component: the proxy refreshes the session instead
        }
      },
    },
  });
}

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 };

/** The signed-in user for this app, or null. Role always comes from the database. */
export async function getAuthUser(app: AppName): Promise<AuthUser | null> {
  if (supabaseConfigured()) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    const profile = await getRepo().getProfile(data.user.id);
    if (!profile) return null;
    return { id: profile.id, email: profile.email || data.user.email || "", fullName: profile.fullName, phone: profile.phone, role: profile.role };
  }
  const store = await cookies();
  const session = await readSessionToken(store.get(cookieName(app))?.value);
  if (!session) return null;
  const u = loadDemo().users.find((x) => x.id === session.uid);
  return u ? { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role } : null;
}

export async function signIn(app: AppName, email: string, password: string): Promise<AuthResult> {
  if (!supabaseConfigured() && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") {
    return { ok: false, error: "Sign-in is unavailable: the Supabase variables are missing on this deployment. Add them in Vercel and redeploy." };
  }
  if (supabaseConfigured()) {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      console.error("signIn failed:", error?.message);
      return { ok: false, error: error?.message.toLowerCase().includes("confirm") ? "Please verify your email first. Check your inbox." : GENERIC };
    }
    if (app === "admin") {
      const profile = await getRepo().getProfile(data.user.id);
      if (profile?.role !== "owner") {
        console.error("admin sign-in refused: profile missing or not owner for", data.user.id);
        await sb.auth.signOut();
        return { ok: false, error: GENERIC };
      }
    }
    return { ok: true };
  }
  const user = loadDemo().users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash)) || (app === "admin" && user.role !== "owner")) return { ok: false, error: GENERIC };
  const store = await cookies();
  store.set(cookieName(app), await createSessionToken({ uid: user.id, role: user.role }), cookieOpts);
  return { ok: true };
}

export async function signUp(input: { fullName: string; email: string; phone: string; password: string }): Promise<AuthResult> {
  if (supabaseConfigured()) {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName, phone: input.phone } },
    });
    if (error) return { ok: false, error: error.message };
    // With email confirmation on there is no session yet.
    if (!data.session) return { ok: true, message: "Check your email to verify your account, then sign in." };
    return { ok: true };
  }
  const db = loadDemo();
  if (db.users.some((u) => u.email === input.email)) return { ok: false, error: "An account with this email already exists" };
  const user = { id: randomUUID(), email: input.email, passwordHash: hashPassword(input.password), fullName: input.fullName, phone: input.phone, role: "customer" as const, createdAt: new Date().toISOString() };
  db.users.push(user);
  saveDemo(db);
  const store = await cookies();
  store.set(cookieName("customer"), await createSessionToken({ uid: user.id, role: "customer" }), cookieOpts);
  return { ok: true };
}

export async function signOut(app: AppName): Promise<void> {
  if (supabaseConfigured()) {
    const sb = await supabaseServer();
    await sb.auth.signOut();
    return;
  }
  (await cookies()).delete(cookieName(app));
}

export async function requestPasswordReset(email: string, redirectTo: string): Promise<AuthResult> {
  if (supabaseConfigured()) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    await sb.auth.resetPasswordForEmail(email, { redirectTo });
  }
  // Same answer whether or not the account exists.
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

/** Throws unless the caller is the owner. Call it first in every admin server action and API route. */
export async function requireOwner(): Promise<AuthUser> {
  const user = await getAuthUser("admin");
  if (!user || user.role !== "owner") throw new Error("Not authorised");
  return user;
}
