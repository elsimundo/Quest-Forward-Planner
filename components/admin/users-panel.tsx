"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createStaffUser, setUserRole, setUserActive } from "@/lib/actions/admin/users";
import { ROLES, type Role } from "@/lib/db/schema";

const ROLE_LABEL: Record<Role, string> = {
  viewer: "Viewer",
  scheduler: "Scheduler",
  admin: "Admin",
  super_admin: "Super admin",
};

type StaffUser = { id: number; name: string; email: string; role: Role; deletedAt: Date | null };

export function UsersPanel({ users, currentUserId }: { users: StaffUser[]; currentUserId: number }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="mt-5">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-full bg-[#1a3d69] px-4 py-2 text-[13px] font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          {creating ? "Cancel" : "+ Add staff"}
        </button>
      </div>

      {creating && <CreateUserForm onDone={() => setCreating(false)} />}

      <div className="mt-4 overflow-hidden rounded-xl border border-[#e6e6e6]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#f7f9fc] text-[11px] font-medium tracking-wider text-[#757575] uppercase">
            <tr>
              <th className="px-3.5 py-2.5">Name</th>
              <th className="px-3.5 py-2.5">Email</th>
              <th className="px-3.5 py-2.5">Role</th>
              <th className="px-3.5 py-2.5">Status</th>
              <th className="px-3.5 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    setPending(true);
    const result = await createStaffUser({ name, email, password, role });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Created ${name}`);
    router.refresh();
    onDone();
  }

  return (
    <div className="rounded-xl border border-[#e6e6e6] p-4">
      <div className="grid grid-cols-2 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Initial password (min. 8 chars)"
          type="password"
          className="rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-lg border border-[#e6e6e6] px-2.5 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-xs text-[#9a9a9a]">
        No email is sent — share the password with them directly. They can&apos;t reset it
        themselves yet.
      </p>
      <button
        onClick={handleCreate}
        disabled={pending || !name.trim() || !email.trim() || password.length < 8}
        className="mt-3 rounded-full bg-[#1a3d69] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
      >
        Create account
      </button>
    </div>
  );
}

function UserRow({ user, isSelf }: { user: StaffUser; isSelf: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const deactivated = !!user.deletedAt;

  async function handleRoleChange(role: Role) {
    setPending(true);
    const result = await setUserRole({ userId: user.id, role });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${user.name} is now ${ROLE_LABEL[role]}`);
    router.refresh();
  }

  async function handleToggleActive() {
    setPending(true);
    const result = await setUserActive({ userId: user.id, active: deactivated });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(deactivated ? `Reactivated ${user.name}` : `Deactivated ${user.name}`);
    router.refresh();
  }

  return (
    <tr className="border-t border-[#f7f9fc]" style={{ opacity: deactivated ? 0.55 : 1 }}>
      <td className="px-3.5 py-2.5 font-medium text-[#333333]">
        {user.name}
        {isSelf && <span className="ml-1.5 text-xs text-[#9a9a9a]">(you)</span>}
      </td>
      <td className="px-3.5 py-2.5 text-[#757575]">{user.email}</td>
      <td className="px-3.5 py-2.5">
        <select
          value={user.role}
          disabled={pending || isSelf}
          onChange={(e) => void handleRoleChange(e.target.value as Role)}
          className="rounded-lg border border-[#e6e6e6] px-2 py-1 text-[13px] outline-none focus:border-[#2b7bb9] disabled:opacity-60"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3.5 py-2.5 text-[#757575]">{deactivated ? "Deactivated" : "Active"}</td>
      <td className="px-3.5 py-2.5 text-right">
        {!isSelf && (
          <button
            onClick={handleToggleActive}
            disabled={pending}
            className="text-xs font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            style={{ color: deactivated ? "#2b7bb9" : "#b13a3a" }}
          >
            {deactivated ? "Reactivate" : "Deactivate"}
          </button>
        )}
      </td>
    </tr>
  );
}
