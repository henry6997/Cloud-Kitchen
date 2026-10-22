import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { type AppName, cookieName, readSessionToken, supabaseConfigured } from "./session";

interface GuardOptions {
  app: AppName;
  loginPath: string;
  /** True for paths that need a signed-in user. */
  isProtected: (pathname: string) => boolean;
  /** Admin: only role = owner gets through. */
  requireOwner?: boolean;
}

/**
 * Edge-safe request guard used by each app's proxy. Admin access is checked here
 * and again in every server action and route handler (see requireOwner).
 */
export async function guard(req: NextRequest, opts: GuardOptions): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  let res = NextResponse.next({ request: req });
  let authed = false;

  if (supabaseConfigured()) {
    const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) req.cookies.set(name, value);
          res = NextResponse.next({ request: req });
          for (const { name, value, options } of list) res.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await sb.auth.getUser();
    if (data.user) {
      if (opts.requireOwner) {
        const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle<{ role: string }>();
        authed = profile?.role === "owner";
      } else authed = true;
    }
  } else {
    const session = await readSessionToken(req.cookies.get(cookieName(opts.app))?.value);
    authed = !!session && (!opts.requireOwner || session.role === "owner");
  }

  if (opts.isProtected(pathname) && !authed) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = opts.loginPath;
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (authed && pathname === opts.loginPath) {
    const url = req.nextUrl.clone();
    const next = req.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return res;
}
