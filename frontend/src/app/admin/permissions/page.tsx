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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  type AdminPermissionRecord,
} from "@/store/adminApi";
import AdminPagination from "@/components/admin/AdminPagination";

function apiError(err: unknown, fallback: string) {
  const e = err as { data?: { message?: string }; error?: string };
  return e?.data?.message || (typeof e?.error === "string" ? e.error : null) || fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

const FALLBACK_MODULES = [
  "users",
  "roles",
  "permissions",
  "doctors",
  "departments",
  "services",
  "appointments",
  "blog",
  "gallery",
  "settings",
];

export default function AdminPermissionsPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPermissionRecord | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    module: "users",
    description: "",
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetPermissionsQuery({
    page,
    perPage,
    search: search || undefined,
    module: moduleFilter !== "all" ? moduleFilter : undefined,
  });
  const [createPermission, { isLoading: creating }] = useCreatePermissionMutation();
  const [updatePermission, { isLoading: updating }] = useUpdatePermissionMutation();
  const [deletePermission, { isLoading: deleting }] = useDeletePermissionMutation();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const modules = useMemo(() => {
    const fromApi = data?.modules ?? [];
    return Array.from(new Set([...fromApi, ...FALLBACK_MODULES])).sort();
  }, [data?.modules]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", slug: "", module: "users", description: "" });
    setDialogOpen(true);
  }

  function openEdit(permission: AdminPermissionRecord) {
    setEditing(permission);
    setForm({
      name: permission.name,
      slug: permission.slug,
      module: permission.module || "users",
      description: permission.description || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        module: form.module.trim(),
        description: form.description.trim(),
      };

      if (editing) {
        await updatePermission({ id: editing.id, body }).unwrap();
        toast.success("Permission updated");
      } else {
        await createPermission(body).unwrap();
        toast.success("Permission created");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  async function handleDelete(permission: AdminPermissionRecord) {
    if ((permission.roles_count || 0) > 0) {
      toast.error("Cannot delete a permission assigned to roles");
      return;
    }
    if (!confirm(`Delete permission "${permission.name}"?`)) return;
    try {
      await deletePermission(permission.id).unwrap();
      toast.success("Permission deleted");
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
            Permissions
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#525252]">
            Fine-grained access permissions by module.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="shrink-0 border-2 border-[#111] bg-[#111] text-white"
        >
          <Plus className="h-4 w-4" />
          Add permission
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
                placeholder="Search name or slug…"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" className="border-2 border-[#111]">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={moduleFilter}
              onValueChange={(v) => {
                setModuleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[11rem] border-2 border-[#111]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(moduleFilter !== "all" || search) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setModuleFilter("all");
                  setSearch("");
                  setSearchInput("");
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">
              {meta?.total ?? 0} total
            </p>
          </div>
        </div>

        <div className={isFetching && !isLoading ? "opacity-70" : undefined}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#111]" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="font-display text-lg text-[#111]">Could not load permissions</p>
              <p className="mt-1 max-w-sm text-sm text-[#525252]">
                {apiError(error, "Sign in again if your session expired, then retry.")}
              </p>
              <Button onClick={() => refetch()} variant="outline" className="mt-4 border-2 border-[#111]">
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="ld-empty m-3 text-sm">No permissions found</p>
          ) : (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>Permission</th>
                    <th>Module</th>
                    <th>Roles</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((permission) => (
                    <tr key={permission.id}>
                      <td>
                        <span className="ld-table__name">{permission.name}</span>
                        <span className="ld-table__sub font-mono">{permission.slug}</span>
                        {permission.description ? (
                          <span className="ld-table__sub line-clamp-1">
                            {permission.description}
                          </span>
                        ) : null}
                      </td>
                      <td className="capitalize">{permission.module || "general"}</td>
                      <td>{permission.roles_count ?? 0}</td>
                      <td>
                        <div className="ld-table__actions">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(permission)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-700"
                            disabled={deleting || (permission.roles_count || 0) > 0}
                            onClick={() => handleDelete(permission)}
                            title={
                              (permission.roles_count || 0) > 0
                                ? "Assigned to roles — cannot delete"
                                : "Delete"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-slate-900">
              {editing ? "Edit Permission" : "Add Permission"}
            </DialogTitle>
            <DialogDescription>
              Permissions are scoped by module and referenced by roles.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
                    slug: editing ? f.slug : slugify(name),
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
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                className="rounded-md font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Module *</Label>
              <Select
                value={form.module}
                onValueChange={(v) => setForm((f) => ({ ...f, module: v }))}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="min-h-[80px] rounded-md"
              />
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
                {editing ? "Save changes" : "Create permission"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
