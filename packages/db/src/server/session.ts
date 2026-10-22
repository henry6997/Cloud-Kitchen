/** Signed session cookie used in demo mode. Web Crypto only, so it also runs in the proxy. */
export interface SessionPayload {
  uid: string;
  role: "customer" | "owner";
  exp: number;
}

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string): string => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

const secret = (): string => process.env.SESSION_SECRET ?? "dev-only-session-secret-change-me";

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function createSessionToken(p: Omit<SessionPayload, "exp">, maxAgeSeconds = 60 * 60 * 24 * 14): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ...p, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds })));
  return `${body}.${await sign(body)}`;
}

export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await sign(body);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const p = JSON.parse(fromB64url(body)) as SessionPayload;
    return p.exp > Math.floor(Date.now() / 1000) ? p : null;
  } catch {
    return null;
  }
}

export type AppName = "customer" | "admin";
export const cookieName = (app: AppName): string => (app === "admin" ? "blip_a" : "blip_c");

export const supabaseConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
