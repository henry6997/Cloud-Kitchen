import { createClient } from "@supabase/supabase-js";
import { createDemoRepo } from "./demo-repo";
import type { Repo } from "./repo";
import { supabaseConfigured } from "./session";
import { createSupabaseRepo } from "./supabase-repo";

let cached: Repo | undefined;

/** Supabase when the env vars exist, otherwise the file-backed demo store. */
export function getRepo(): Repo {
  if (cached) return cached;
  // The demo store ships a known owner login, so a deployed site must never fall back to it by accident.
  if (!supabaseConfigured() && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (or ALLOW_DEMO=1 for local demos).");
  }
  if (supabaseConfigured()) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    cached = createSupabaseRepo(sb);
  } else {
    cached = createDemoRepo();
  }
  return cached;
}

export const isDemoMode = (): boolean => !supabaseConfigured();

export { RepoError } from "./repo";
export type { Repo, NewOrderArgs } from "./repo";
export { rateLimit } from "./rate-limit";
export * from "./auth";
export * from "./orders";
export * from "./cashfree";
export * from "./push";
export { cookieName, supabaseConfigured } from "./session";
export { storeImage, readDemoUpload } from "./storage";
export type { AppName } from "./session";
export { DEMO_OWNER_EMAIL, DEMO_CUSTOMER_EMAIL } from "./seed";
