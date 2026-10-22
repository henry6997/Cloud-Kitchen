import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Browser Supabase client for Realtime, or null in demo mode (the apps poll instead). */
let client: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createBrowserClient(url, key) : null;
  return client;
}
