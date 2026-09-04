"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsGroupedQuery,
  useGetMeQuery,
  type AdminRoleRecord,
} from "@/store/adminApi";
import AdminPagination from "@/components/admin/AdminPagination";
import { cn } from "@/lib/utils";

function apiError(err: unknown, fallback: string) {
  const e = err as { data?: { message?: string }; error?: string };
  return e?.data?.message || (typeof e?.error === "string" ? e.error : null) || fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function AdminRolesPage() {
  const { data: me } = useGetMeQuery();
  const isSuper = (me?.roles || []).includes("super_admin");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRoleRecord | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    permission_ids: [] as number[],
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetRolesQuery({
    page,
    perPage,
    search: search || undefined,
  });
  const { data: groupedData } = useGetPermissionsGroupedQuery();
  const [createRole, { isLoading: creating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: deleting }] = useDeleteRoleMutation();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const grouped = groupedData?.grouped;
  const modules = useMemo(
    () => groupedData?.modules ?? Object.keys(grouped || {}),
    [groupedData?.modules, grouped]
  );

  function openCreate() {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", permission_ids: [] });
    setDialogOpen(true);
  }

  function openEdit(role: AdminRoleRecord) {
    if (!isSuper && role.is_system) {
      toast.error("Only super admins can modify system roles");
      return;
    }
    setEditing(role);
    setForm({
      name: role.name,
      slug: role.slug,
      description: role.description || "",
      permission_ids: (role.permissions || []).map((p) => p.id),
    });
    setDialogOpen(true);
  }

  function togglePermission(id: number) {
    setForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(id)
        ? prev.permission_ids.filter((x) => x !== id)
        : [...prev.permission_ids, id],
    }));
  }

  function toggleModule(module: string, ids: number[]) {
    setForm((prev) => {
      const allSelected = ids.every((id) => prev.permission_ids.includes(id));
      if (allSelected) {
        return {
          ...prev,
          permission_ids: prev.permission_ids.filter((id) => !ids.includes(id)),
        };
      }
      return {
        ...prev,
        permission_ids: Array.from(new Set([...prev.permission_ids, ...ids])),
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim(),
        permission_ids: form.permission_ids,
      };
      if (!editing) {
        body.slug = form.slug.trim() || slugify(form.name);
      }

      if (editing) {
        await updateRole({ id: editing.id, body }).unwrap();
        toast.success("Role updated");
      } else {
        await createRole(body).unwrap();
        toast.success("Role created");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  async function handleDelete(role: AdminRoleRecord) {
    if (role.is_system) {
      toast.error("System roles cannot be deleted");
      return;
    }
    if ((role.users_count || 0) > 0) {
      toast.error("Cannot delete a role assigned to users");
      return;
    }
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await deleteRole(role.id).unwrap();
      toast.success("Role deleted");
    } catch (err) {
      toast.error(apiError(err, "Delete failed"));
    }
  }

  const saving = creating || updating;

  return (
    <div className="ld-page space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ld-kicker">Access control</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#111] sm:text-3xl">
            Roles
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#525252]">
            Define roles and attach permissions by module.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="shrink-0 border-2 border-[#111] bg-[#111] text-white"
        >
          <Plus className="h-4 w-4" />
          Add role
        </Button>
      </div>

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
                placeholder="Search roles…"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" className="border-2 border-[#111]">
              Search
            </Button>
          </form>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">
            {meta?.total ?? 0} total
          </p>
        </div>

        <div className={isFetching && !isLoading ? "opacity-70" : undefined}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#111]" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="font-display text-lg text-[#111]">Could not load roles</p>
              <p className="mt-1 max-w-sm text-sm text-[#525252]">
                {apiError(error, "Sign in again if your session expired, then retry.")}
              </p>
              <Button onClick={() => refetch()} variant="outline" className="mt-4 border-2 border-[#111]">
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="ld-empty m-3 text-sm">No roles found</p>
          ) : (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Users</th>
                    <th>Permissions</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <span className="ld-table__name">
                          {role.name}
                          {role.is_system ? " · System" : ""}
                        </span>
                        <span className="ld-table__sub font-mono">{role.slug}</span>
                        {role.description ? (
                          <span className="ld-table__sub line-clamp-1">{role.description}</span>
                        ) : null}
                      </td>
                      <td>{role.users_count ?? 0}</td>
                      <td>{role.permissions_count ?? role.permissions?.length ?? 0}</td>
                      <td>
                        <div className="ld-table__actions">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(role)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!role.is_system && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-700"
                              disabled={deleting}
                              onClick={() => handleDelete(role)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
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
          <div className="border-t-2 border-[#111] px-4 py-3">
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-slate-900">
              {editing ? "Edit Role" : "Add Role"}
            </DialogTitle>
            <DialogDescription>
              Assign permissions grouped by module.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editing?.is_system ? f.slug : slugify(name),
                    }));
                  }}
                  className="rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  required
                  value={form.slug}
                  disabled={Boolean(editing?.is_system)}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                  className="rounded-md font-mono text-sm"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="min-h-[80px] rounded-md"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Label>Permissions</Label>
                <p className="text-xs text-ink-muted">
                  {form.permission_ids.length} selected
                </p>
              </div>

              {modules.length === 0 ? (
                <p className="text-sm text-ink-muted">No permissions available yet.</p>
              ) : (
                <div className="space-y-4">
                  {modules.map((module) => {
                    const perms = grouped?.[module] || [];
                    const ids = perms.map((p) => p.id);
                    const selectedCount = ids.filter((id) =>
                      form.permission_ids.includes(id)
                    ).length;
                    const allSelected = ids.length > 0 && selectedCount === ids.length;
                    return (
                      <div
                        key={module}
                        className="rounded-md border border-slate-200 bg-stone/15 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-display text-base capitalize text-slate-900">
                              {module.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-ink-muted">
                              {selectedCount}/{ids.length} selected
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-md"
                            onClick={() => toggleModule(module, ids)}
                          >
                            {allSelected ? "Clear" : "Select all"}
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {perms.map((perm) => {
                            const checked = form.permission_ids.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={cn(
                                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition",
                                  checked
                                    ? "border-[rgba(21,128,61,0.35)] bg-[var(--hb-accent-soft)]"
                                    : "border-slate-200 bg-white/70"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={checked}
                                  onChange={() => togglePermission(perm.id)}
                                />
                                <span>
                                  <span className="block text-sm font-medium text-slate-900">
                                    {perm.name}
                                  </span>
                                  <span className="font-mono text-[11px] text-ink-muted">
                                    {perm.slug}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                {editing ? "Save changes" : "Create role"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
