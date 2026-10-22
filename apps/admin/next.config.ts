import type { NextConfig } from "next";

// The Supabase integration on Vercel names these SUPABASE_URL / SUPABASE_ANON_KEY; accept both spellings.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : undefined;

const config: NextConfig = {
  env: { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon },
  transpilePackages: ["@blip/ui", "@blip/db"],
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  headers: async () => [
    {
      source: "/((?!_next/static|_next/image).*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Cache-Control", value: "private, no-store" },
      ],
    },
  ],
  images: { remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [] },
};
export default config;
