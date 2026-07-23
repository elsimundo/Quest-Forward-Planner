import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLES, type Role } from "@/lib/db/schema";

const ADMIN_NAV = [
  { href: "/admin/audit-log", label: "Audit log" },
  { href: "/admin/pending-sites", label: "Pending sites" },
  { href: "/admin/site-requirements", label: "Site requirements" },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Page-level gate only — a convenience redirect, not the security boundary. Every
  // mutation under /admin re-checks the current DB role independently via requireRole()
  // (SPEC.md §11), so a stale session claim here can at worst show a link that 403s.
  const session = await auth();
  const sessionRole = session?.user?.role;
  const role: Role = ROLES.includes(sessionRole as Role) ? (sessionRole as Role) : "viewer";
  if (role !== "admin" && role !== "super_admin") redirect("/");

  const nav = role === "super_admin" ? [...ADMIN_NAV, { href: "/admin/users", label: "Users & roles" }] : ADMIN_NAV;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-[62px] shrink-0 items-center justify-between bg-[var(--quest-navy)] px-6 shadow-[var(--shadow-header)]">
        <div className="flex items-baseline gap-2.5">
          <Link href="/" className="flex items-baseline gap-2.5">
            <span className="text-lg font-bold tracking-[0.14em] text-white">QUEST</span>
            <span className="h-[18px] w-px bg-white/35" />
            <span className="text-sm font-medium tracking-[0.02em]" style={{ color: "#e88f8f" }}>
              Admin
            </span>
          </Link>
        </div>
        <Link
          href="/"
          className="rounded-full border border-white/25 px-3.5 py-1.5 text-[13px] text-white/85 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
        >
          ← Back to planner
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-[220px] shrink-0 border-r bg-[var(--quest-surface-alt)] px-3 py-5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-[#333333] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="min-h-0 flex-1 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  );
}
