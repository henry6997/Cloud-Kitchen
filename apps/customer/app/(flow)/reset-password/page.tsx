import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfigured } from "@blip/db/server";
import { BackButton } from "@/components/detail-view";

export const metadata = { title: "New password" };

async function setPassword(fd: FormData) {
  "use server";
  const password = String(fd.get("password") ?? "");
  if (password.length < 8 || password.length > 72 || !supabaseConfigured()) redirect("/reset-password?error=1");
  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (list) => list.forEach(({ name, value, options }) => store.set(name, value, options)) },
  });
  const { error } = await sb.auth.updateUser({ password });
  redirect(error ? "/reset-password?error=1" : "/account");
}

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="app app--detail">
      <header className="dtop"><BackButton fallback="/login" /><span className="ttl show">New password</span><span className="ib" style={{ visibility: "hidden" }} aria-hidden="true" /></header>
      <h1 className="page-title" style={{ marginTop: 18 }}>Choose a new password</h1>
      <form action={setPassword} className="card flat">
        <label className="field" style={{ marginTop: 0 }}>
          <span>New password</span>
          <input type="password" name="password" required minLength={8} maxLength={72} autoComplete="new-password" />
          <small>At least 8 characters.</small>
        </label>
        {error ? <p className="err" role="alert">That didn't work. Open the link from your email again and retry.</p> : null}
        <button type="submit" className="btn primary block" style={{ marginTop: 18 }}>Save password</button>
      </form>
    </main>
  );
}
