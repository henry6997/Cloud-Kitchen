import type { NextRequest } from "next/server";
import { guard } from "@blip/db/guard";

/** Keeps the Supabase session fresh and sends signed-out visitors to /login for private pages. */
export async function proxy(req: NextRequest) {
  return guard(req, {
    app: "customer",
    loginPath: "/login",
    isProtected: (p) => p === "/checkout" || p.startsWith("/order/") || p.startsWith("/api/orders"),
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|banners/|images/|icons/|api/cashfree).*)"],
};
