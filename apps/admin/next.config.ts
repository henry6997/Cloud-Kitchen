import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : undefined;

const config: NextConfig = {
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
