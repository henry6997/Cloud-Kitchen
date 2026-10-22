import Link from "next/link";
import { formatPhone, inr } from "@blip/db";
import { getRepo } from "@blip/db/server";
import { formatDateTime } from "@/lib/ist";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const customers = (await getRepo().listCustomers()).sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""));
  const cols = { ["--cols" as string]: "minmax(0,1.4fr) minmax(0,1.2fr) minmax(0,1.4fr) 80px 110px 150px", ["--cols-m" as string]: "minmax(0,1fr) auto" };
  return (
    <section className="panel" aria-label="Customers">
      <div className="trow th" style={cols}><span>Name</span><span>Phone</span><span>Email</span><span className="r">Orders</span><span className="r">Spent</span><span>Last order</span></div>
      {customers.length === 0 ? (
        <div className="empty" style={{ padding: "40px 18px" }}><b>No customers yet</b>People who sign up in the app appear here.</div>
      ) : (
        customers.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`} className="trow" style={cols}>
            <span><b style={{ fontWeight: 500 }}>{c.fullName}</b></span>
            <span className="mut hide-m">{formatPhone(c.phone)}</span>
            <span className="mut hide-m" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</span>
            <span className="r hide-m">{c.orderCount}</span>
            <span className="r">{inr(c.spentPaise)}</span>
            <span className="mut hide-m">{c.lastOrderAt ? formatDateTime(c.lastOrderAt) : "—"}</span>
          </Link>
        ))
      )}
    </section>
  );
}
