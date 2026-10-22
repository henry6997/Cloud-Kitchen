import type { NextRequest } from "next/server";
import { guard } from "@blip/db/guard";

/** Everything except /login needs the owner role. Server actions and API routes check again. */
export async function proxy(req: NextRequest) {
  return guard(req, { app: "admin", loginPath: "/login", requireOwner: true, isProtected: (p) => p !== "/login" });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|banners/|media/).*)"],
};
