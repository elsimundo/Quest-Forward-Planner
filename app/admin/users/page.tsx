import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllUsers } from "@/lib/db/admin-queries";
import { UsersPanel } from "@/components/admin/users-panel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // "Users & roles" is super_admin only — a tier above the admin+ gate the layout already
  // applies (SPEC.md §7: assigning roles is the one thing that stays behind its own gate).
  const session = await auth();
  if (session?.user?.role !== "super_admin") redirect("/admin");

  const users = await getAllUsers();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#333333]">Users & roles</h1>
      <p className="mt-1 text-[13px] text-[#757575]">
        Add staff, change roles, and deactivate accounts. Every role change is logged
        (who, from what, to what, when).
      </p>

      <UsersPanel users={users} currentUserId={Number(session.user.id)} />
    </div>
  );
}
