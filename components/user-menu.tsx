import Link from "next/link";
import { signOut } from "@/auth";
import type { Role } from "@/lib/db/schema";

const ROLE_LABEL: Record<Role, string> = {
  viewer: "Viewer",
  scheduler: "Scheduler",
  admin: "Admin",
  super_admin: "Super admin",
};

export function UserMenu({ name, role }: { name: string; role: Role }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-3">
      {(role === "admin" || role === "super_admin") && (
        <Link
          href="/admin"
          className="rounded-full border border-white/25 px-3.5 py-1.5 text-[13px] text-white/85 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
        >
          Admin
        </Link>
      )}
      <span className="text-[13px] text-white/70" title={ROLE_LABEL[role]}>
        {name}
      </span>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--quest-blue)] text-[13px] font-medium text-white">
        {initials || "?"}
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded-full border border-white/25 px-3.5 py-1.5 text-[13px] text-white/85 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
