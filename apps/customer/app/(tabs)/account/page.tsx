import Link from "next/link";
import { getRepo } from "@blip/db/server";
import { AccountView } from "@/components/account-view";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) {
    return (
      <main className="app app--menu">
        <div className="head"><div className="hrow"><h1>Account</h1></div></div>
        <div className="list">
          <div className="empty">
            <span className="glyph" aria-hidden="true">◯</span>
            <b>Sign in to see your account</b>
            Save addresses, track orders and check out faster.
            <br />
            <Link className="ghost" href="/login?next=/account">Sign in</Link>
          </div>
        </div>
      </main>
    );
  }
  const addresses = await getRepo().listAddresses(user.id);
  return <AccountView name={user.fullName} email={user.email} phone={user.phone} addresses={addresses} pushAvailable={!!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />;
}
