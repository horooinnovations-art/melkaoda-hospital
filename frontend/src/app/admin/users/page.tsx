"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Pencil, UserCheck, UserX, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetMeQuery,
  type AdminUserRecord,
  type AdminRoleRef,
} from "@/store/adminApi";
import AdminPagination from "@/components/admin/AdminPagination";
import { StatusBadge } from "@/components/admin/adminDisplay";
import { cn } from "@/lib/utils";
import { isPrivilegedSuperAdmin, userHasSuperRole } from "@/lib/permissions";

function apiError(err: unknown, fallback: string) {
  const e = err as { data?: { message?: string }; error?: string };
  return e?.data?.message || (typeof e?.error === "string" ? e.error : null) || fallback;
}

export default function AdminUsersPage() {
  const { data: me } = useGetMeQuery();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRecord | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    status: "active",
    role_ids: [] as number[],
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetUsersQuery({
    page,
    perPage,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
  });
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();

  const canManageSupers =
    Boolean(data?.can_manage_super_admins) || isPrivilegedSuperAdmin(me);

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const stats = data?.stats;
  const allRoles: AdminRoleRef[] = useMemo(() => {
    const roles = data?.roles ?? [];
    // Keep own Super Admin role visible (locked) when editing yourself without privilege.
    if (editing && userHasSuperRole(editing) && !canManageSupers) {
      const mine = (editing.roles || []).find((r) => r.slug === "super_admin");
      if (mine && !roles.some((r) => r.slug === "super_admin")) {
        return [...roles, { id: mine.id, name: mine.name, slug: mine.slug, is_system: true }];
      }
    }
    return roles;
  }, [data?.roles, editing, canManageSupers]);

  function canManageUser(user: AdminUserRecord) {
    if (Number(me?.id) === Number(user.id)) return true;
    if (!userHasSuperRole(user)) return true;
    return canManageSupers;
  }

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      status: "active",
      role_ids: [],
    });
    setDialogOpen(true);
  }

  function openEdit(user: AdminUserRecord) {
    if (!canManageUser(user)) {
      toast.error("Only privileged Super Administrators can manage other Super Admin accounts");
      return;
    }
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      status: user.status || "active",
      role_ids: (user.roles || []).map((r) => r.id),
    });
    setDialogOpen(true);
  }

  function toggleRole(roleId: number, slug: string) {
    if (slug === "super_admin" && !canManageSupers) return;
    setForm((prev) => {
      const has = prev.role_ids.includes(roleId);
      return {
        ...prev,
        role_ids: has
          ? prev.role_ids.filter((id) => id !== roleId)
          : [...prev.role_ids, roleId],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role_ids.length) {
      toast.error("At least one role is required");
      return;
    }
    const editingSelf = editing != null && Number(me?.id) === Number(editing.id);
    if (editingSelf && form.status !== "active") {
      toast.error("You cannot deactivate your own account");
      return;
    }
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: editingSelf ? "active" : form.status,
        role_ids: form.role_ids,
      };
      if (form.password) body.password = form.password;

      if (editing) {
        await updateUser({ id: editing.id, body }).unwrap();
        toast.success("User updated");
      } else {
        if (!form.password || form.password.length < 8) {
          toast.error("Password must be at least 8 characters");
          return;
        }
        body.password = form.password;
        await createUser(body).unwrap();
        toast.success("User created");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  async function handleToggleStatus(user: AdminUserRecord) {
    if (Number(me?.id) === Number(user.id)) {
      toast.error("You cannot deactivate your own account");
      return;
    }
    if (!canManageUser(user)) {
      toast.error("Only privileged Super Administrators can deactivate other Super Admin accounts");
      return;
    }
    const nextStatus = user.status === "active" ? "inactive" : "active";
    const label = nextStatus === "active" ? "activate" : "deactivate";
    if (!confirm(`${label === "activate" ? "Activate" : "Deactivate"} "${user.name}"?`)) return;
    try {
      await updateUser({
        id: user.id,
        body: {
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          status: nextStatus,
          role_ids: (user.roles || []).map((r) => r.id),
        },
      }).unwrap();
      toast.success(nextStatus === "active" ? "User activated" : "User deactivated");
    } catch (err) {
      toast.error(apiError(err, "Status update failed"));
    }
  }

  const saving = creating || updating;
  const editingSelf = editing != null && Number(me?.id) === Number(editing.id);

  const statCards = useMemo(
    () => [
      { label: "Total", value: stats?.total ?? 0 },
      { label: "Active", value: stats?.active ?? 0 },
      { label: "Inactive", value: stats?.inactive ?? 0 },
      { label: "Suspended", value: stats?.suspended ?? 0 },
    ],
    [stats]
  );

  return (
    <div className="ld-page space-y-5">
      <div className="ld-hero flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ld-kicker">Access control</p>
          <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight text-[var(--ld-ink)] sm:text-4xl">
            Users
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ld-muted)]">
            Staff accounts, status, and role assignments in a dense ledger view.
          </p>
        </div>
        <Button onClick={openCreate} className="ld-btn ld-btn--solid shrink-0">
          <Plus className="h-4 w-4" />
          Add user
        </Button>
      </div>

      <section
        aria-label="User counts"
        className="ld-kpi"
        style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
      >
        {statCards.map((card) => (
          <div key={card.label} className="ld-kpi__cell">
            <p className="ld-kpi__value">{card.value}</p>
            <p className="ld-kpi__label">{card.label}</p>
          </div>
        ))}
      </section>

      <section className="ld-panel">
        <div className="ld-panel__head">
          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
              setPage(1);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email, phone…"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" className="ld-btn">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[9.5rem]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[11rem]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {allRoles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(statusFilter !== "all" || roleFilter !== "all" || search) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStatusFilter("all");
                  setRoleFilter("all");
                  setSearch("");
                  setSearchInput("");
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ld-faint)]">
              {meta?.total ?? 0} total
            </p>
          </div>
        </div>

        <div className={isFetching && !isLoading ? "opacity-70" : undefined}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--ld-accent)]" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="font-display text-lg text-[var(--ld-ink)]">Could not load users</p>
              <p className="mt-1 max-w-sm text-sm text-[var(--ld-muted)]">
                {apiError(error, "Sign in again if your session expired, then retry.")}
              </p>
              <Button onClick={() => refetch()} variant="outline" className="ld-btn mt-4">
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="ld-empty m-3 text-sm">No users found</p>
          ) : (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Roles</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <span className="ld-table__name">{user.name}</span>
                        <span className="ld-table__sub">{user.email}</span>
                        {user.phone ? (
                          <span className="ld-table__sub">{user.phone}</span>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge value={user.status || "active"} />
                      </td>
                      <td>
                        <span className="text-sm text-[#525252]">
                          {(user.roles || []).map((r) => r.name).join(", ") || "—"}
                        </span>
                      </td>
                      <td>
                        <div className="ld-table__actions">
                          {canManageUser(user) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(user)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {Number(me?.id) !== Number(user.id) && canManageUser(user) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={updating}
                              title={
                                user.status === "active"
                                  ? "Deactivate user"
                                  : "Activate user"
                              }
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.status === "active" ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {meta && meta.total > 0 && (
          <div className="border-t border-[var(--ld-line)] px-4 py-3">
            <AdminPagination
              page={page}
              perPage={perPage}
              total={meta.total}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-slate-900">
              {editing ? "Edit User" : "Add User"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update account details and assigned roles."
                : "Create a staff account and assign one or more roles."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  disabled={editingSelf}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                {editingSelf ? (
                  <p className="text-xs text-ink-muted">
                    You cannot change your own status.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{editing ? "Password (leave blank to keep)" : "Password *"}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="rounded-md"
                  required={!editing}
                  minLength={editing ? undefined : 8}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Assign Roles *</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {allRoles.map((role) => {
                  const locked = role.slug === "super_admin" && !canManageSupers;
                  const checked = form.role_ids.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition",
                        checked
                          ? "border-[rgba(21,128,61,0.35)] bg-[var(--hb-accent-soft)]"
                          : "border-slate-200 bg-stone/20",
                        locked && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        disabled={locked}
                        onChange={() => toggleRole(role.id, role.slug)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-900">
                          {role.name}
                        </span>
                        {role.is_system && (
                          <span className="text-[11px] text-ink-muted">System Role</span>
                        )}
                        {role.slug === "super_admin" && !canManageSupers ? (
                          <span className="block text-[11px] text-ink-muted">
                            Only privileged admins can assign this role
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-md"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="rounded-md">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create user"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
