"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, Database, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdminFormFields from "./AdminFormFields";
import AdminPagination from "./AdminPagination";
import {
  getPrimaryLabel,
  getSubtitle,
  renderSmartCell,
  getRowMediaUrl,
  EntityAvatar,
} from "./adminDisplay";
import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";
import {
  type AdminResourceConfig,
  buildFormData,
  rowToFormValues,
} from "@/lib/adminResources";
import {
  useGetAdminListQuery,
  useCreateAdminItemMutation,
  useUpdateAdminItemMutation,
  useDeleteAdminItemMutation,
} from "@/store/adminApi";
import { cn } from "@/lib/utils";

import {
  getStoredNewsCategories,
  saveStoredNewsCategories,
  getStoredGalleryCategories,
  saveStoredGalleryCategories,
  type CategoryItem,
} from "@/lib/categoriesData";

interface AdminCrudPageProps {
  config: AdminResourceConfig;
  infoBanner?: React.ReactNode;
  sortRows?: (rows: Record<string, unknown>[]) => Record<string, unknown>[];
}

function isRowActive(row: Record<string, unknown>, config: AdminResourceConfig) {
  const field = config.activeField || "is_active";
  const activeVal = config.activeValue !== undefined ? config.activeValue : 1;
  const val = row[field];
  if (activeVal === 1 || activeVal === true || activeVal === "1") {
    if (val === undefined || val === null || val === "") return true;
    return val === 1 || val === true || val === "1";
  }
  return val === activeVal;
}

function emptyValues(fields: AdminResourceConfig["fields"]) {
  return Object.fromEntries(
    fields.map((f) => {
      if (f.defaultValue !== undefined) return [f.name, f.defaultValue];
      return [f.name, f.type === "switch" ? false : ""];
    })
  );
}

export default function AdminCrudPage({ config, infoBanner, sortRows }: AdminCrudPageProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [viewing, setViewing] = useState<Record<string, unknown> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    emptyValues(config.fields)
  );

  const [localNewsCategories, setLocalNewsCategories] = useState<CategoryItem[]>(() =>
    config.resource === "news-categories" ? getStoredNewsCategories() : []
  );

  const [localGalleryCategories, setLocalGalleryCategories] = useState<CategoryItem[]>(() =>
    config.resource === "gallery-categories" ? getStoredGalleryCategories() : []
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useGetAdminListQuery({
    resource: config.resource,
    page,
    perPage,
    search: search || undefined,
  });

  const [createItem, { isLoading: creating }] = useCreateAdminItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateAdminItemMutation();
  const [deleteItem, { isLoading: deleting }] = useDeleteAdminItemMutation();

  /**
   * Resources that still shadow their writes into localStorage when the API call
   * fails. `partnerships` was in this list and is not any more: it now has a
   * real table, route and permission, so a failed save reports the failure
   * instead of silently "succeeding" into one browser (MEL-CONTENT-001).
   * news-categories and gallery-categories still have no backend resource.
   */
  const isLocalResource =
    config.resource === "news-categories" ||
    config.resource === "gallery-categories";

  const getLocalItems = useCallback(() => {
    if (config.resource === "news-categories") return localNewsCategories as unknown as Record<string, unknown>[];
    if (config.resource === "gallery-categories") return localGalleryCategories as unknown as Record<string, unknown>[];
    return [];
  }, [config.resource, localNewsCategories, localGalleryCategories]);

  const rows = useMemo(() => {
    let list = (data?.data?.length ? data.data : isLocalResource ? getLocalItems() : []) ?? [];
    if (search && isLocalResource) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        String(r.name || r.title || "").toLowerCase().includes(q) ||
        String(r.category || "").toLowerCase().includes(q)
      );
    }
    if (sortRows) list = sortRows([...list]);
    return list;
  }, [data?.data, isLocalResource, getLocalItems, search, sortRows]);

  const detailColumns = useMemo(
    () =>
      config.columns.filter((col) => {
        if (col.key === config.titleField) return false;
        if (col.key === "name" || col.key === "title" || col.key === "question") return false;
        if (col.key === "first_name" || col.key === "last_name") return false;
        return true;
      }),
    [config.columns, config.titleField]
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setValues(emptyValues(config.fields));
    setDialogOpen(true);
  }, [config.fields]);

  const openEdit = useCallback(
    (row: Record<string, unknown>) => {
      setEditing(row);
      const formValues = rowToFormValues(row, config.fields);
      const fileField = config.fileField;
      if (fileField) {
        const urlKey = getRowMediaUrl(row, fileField);
        if (urlKey) formValues[`_${fileField}_url`] = urlKey;
      }
      setValues(formValues);
      setDialogOpen(true);
    },
    [config.fields, config.fileField]
  );

  const handleChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = buildFormData(config.fields, values, config.fileField);

    const fileKey = config.fileField || "logo";
    let uploadedFileUrl: string | undefined = undefined;

    const fileVal = values[fileKey];
    if (fileVal instanceof File) {
      try {
        uploadedFileUrl = await fileToDataUrl(fileVal);
      } catch {
        /* ignore */
      }
    } else if (typeof values[`_${fileKey}_url`] === "string" && values[`_${fileKey}_url`]) {
      uploadedFileUrl = String(values[`_${fileKey}_url`]);
    } else if (typeof values[fileKey] === "string" && values[fileKey]) {
      uploadedFileUrl = String(values[fileKey]);
    }

    try {
      if (editing?.id) {
        await updateItem({
          resource: config.resource,
          id: editing.id as number,
          body: fd,
        }).unwrap();
        toast.success("Updated successfully");
      } else {
        await createItem({ resource: config.resource, body: fd }).unwrap();
        toast.success("Created successfully");
      }
      setDialogOpen(false);
    } catch (err) {
      if (config.resource === "news-categories") {
        if (editing?.id) {
          const updated = localNewsCategories.map((c) =>
            c.id === editing.id
              ? {
                  ...c,
                  name: String(values.name || c.name),
                  slug: String(values.slug || c.slug || String(values.name || "").toLowerCase().replace(/\s+/g, "-")),
                  description: String(values.description || c.description),
                  icon: String(values.icon || c.icon || "fas-newspaper"),
                  order: Number(values.order || c.order || 0),
                  is_active: Boolean(values.is_active !== undefined ? values.is_active : c.is_active),
                }
              : c
          );
          setLocalNewsCategories(updated);
          saveStoredNewsCategories(updated);
          toast.success("Updated successfully");
        } else {
          const newCat: CategoryItem = {
            id: Date.now(),
            name: String(values.name || "New Category"),
            slug: String(values.slug || String(values.name || "new-category").toLowerCase().replace(/\s+/g, "-")),
            description: String(values.description || ""),
            icon: String(values.icon || "fas-newspaper"),
            order: Number(values.order || 0),
            is_active: Boolean(values.is_active !== undefined ? values.is_active : true),
          };
          const updated = [newCat, ...localNewsCategories];
          setLocalNewsCategories(updated);
          saveStoredNewsCategories(updated);
          toast.success("Created successfully");
        }
        setDialogOpen(false);
      } else if (config.resource === "gallery-categories") {
        if (editing?.id) {
          const updated = localGalleryCategories.map((c) =>
            c.id === editing.id
              ? {
                  ...c,
                  name: String(values.name || c.name),
                  slug: String(values.slug || c.slug || String(values.name || "").toLowerCase().replace(/\s+/g, "-")),
                  description: String(values.description || c.description),
                  icon: String(values.icon || c.icon || "fas-images"),
                  order: Number(values.order || c.order || 0),
                  is_active: Boolean(values.is_active !== undefined ? values.is_active : c.is_active),
                }
              : c
          );
          setLocalGalleryCategories(updated);
          saveStoredGalleryCategories(updated);
          toast.success("Updated successfully");
        } else {
          const newCat: CategoryItem = {
            id: Date.now(),
            name: String(values.name || "New Gallery Category"),
            slug: String(values.slug || String(values.name || "new-category").toLowerCase().replace(/\s+/g, "-")),
            description: String(values.description || ""),
            icon: String(values.icon || "fas-images"),
            order: Number(values.order || 0),
            is_active: Boolean(values.is_active !== undefined ? values.is_active : true),
          };
          const updated = [newCat, ...localGalleryCategories];
          setLocalGalleryCategories(updated);
          saveStoredGalleryCategories(updated);
          toast.success("Created successfully");
        }
        setDialogOpen(false);
      } else {
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    }
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    const label = getPrimaryLabel(row, config.titleField);
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;

    try {
      await deleteItem({ resource: config.resource, id: row.id as number }).unwrap();
      toast.success("Deleted");
    } catch (err) {
      if (config.resource === "news-categories") {
        const updated = localNewsCategories.filter((c) => c.id !== row.id);
        setLocalNewsCategories(updated);
        saveStoredNewsCategories(updated);
        toast.success("Deleted");
      } else if (config.resource === "gallery-categories") {
        const updated = localGalleryCategories.filter((c) => c.id !== row.id);
        setLocalGalleryCategories(updated);
        saveStoredGalleryCategories(updated);
        toast.success("Deleted");
      } else {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    }
  };

  const handleToggleActive = async (row: Record<string, unknown>) => {
    const field = config.activeField || "is_active";
    const activeVal = config.activeValue !== undefined ? config.activeValue : "1";
    const inactiveVal = config.inactiveValue !== undefined ? config.inactiveValue : "0";

    const isActive = isRowActive(row, config);
    const newStatus = !isActive;
    const newDbValue = newStatus ? activeVal : inactiveVal;

    const fd = new FormData();
    fd.append(field, String(newDbValue));

    try {
      await updateItem({
        resource: config.resource,
        id: row.id as number,
        body: fd,
      }).unwrap();
      toast.success(newStatus ? "Activated successfully" : "Deactivated successfully");
    } catch (err) {
      if (config.resource === "news-categories") {
        const updated = localNewsCategories.map((c) =>
          c.id === row.id ? { ...c, is_active: newStatus } : c
        );
        setLocalNewsCategories(updated);
        saveStoredNewsCategories(updated);
        toast.success(newStatus ? "Activated successfully" : "Deactivated successfully");
      } else if (config.resource === "gallery-categories") {
        const updated = localGalleryCategories.map((c) =>
          c.id === row.id ? { ...c, is_active: newStatus } : c
        );
        setLocalGalleryCategories(updated);
        saveStoredGalleryCategories(updated);
        toast.success(newStatus ? "Activated successfully" : "Deactivated successfully");
      } else {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    }
  };

  const saving = creating || updating;
  const meta = data?.meta;

  return (
    <div className="min-w-0 max-w-full space-y-6">
      {infoBanner}

      <div className="ld-hero flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="ld-kicker">Records</p>
          <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight text-[var(--ld-ink)] sm:text-4xl">
            {config.title}
          </h2>
          {config.description && (
            <p className="mt-1 max-w-2xl text-sm text-[var(--ld-muted)]">{config.description}</p>
          )}
        </div>
        <Button onClick={openCreate} className="ld-btn ld-btn--solid shrink-0">
          <Plus className="h-4 w-4" />
          Add new
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
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ld-accent)]" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${config.title.toLowerCase()}…`}
                className="rounded-md pl-10 bg-white/5 border-[var(--ld-line-strong)] text-[var(--ld-ink)] focus:border-[var(--ld-accent)]"
              />
            </div>
            <Button type="submit" variant="outline" className="ld-btn">
              Search
            </Button>
          </form>
          <div className="flex items-center gap-3">
            {isFetching && !isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--ld-accent)]" />
            )}
            {meta && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ld-faint)]">
                {meta.total} total
              </p>
            )}
          </div>
        </div>

        <div className={cn("relative", isFetching && !isLoading && "opacity-70")}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--ld-accent)]" />
            </div>
          ) : isError && !isLocalResource ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[10px] bg-rose-50 text-rose-600">
                <Database className="h-6 w-6" />
              </div>
              <p className="font-display text-lg text-[var(--ld-ink)]">Could not load data</p>
              <p className="mt-1 max-w-sm text-sm text-[var(--ld-muted)]">
                {(error as { data?: { message?: string }; error?: string })?.data?.message ||
                  (typeof (error as { error?: string })?.error === "string"
                    ? (error as { error: string }).error
                    : null) ||
                  "Check your connection and that you are signed in, then try again."}
              </p>
              <Button onClick={() => refetch()} className="ld-btn mt-5" variant="outline">
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[10px] bg-[var(--ld-accent-soft)] text-[var(--ld-accent-deep)]">
                <Database className="h-6 w-6" />
              </div>
              <p className="font-display text-lg text-[var(--ld-ink)]">No records yet</p>
              <p className="mt-1 max-w-sm text-sm text-[var(--ld-muted)]">
                Create your first {config.title.replace(/s$/, "").toLowerCase()} to get started.
              </p>
              <Button onClick={openCreate} className="ld-btn ld-btn--solid mt-5">
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            </div>
          ) : (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>{config.titleField ? config.titleField.replace(/_/g, " ") : "Item"}</th>
                    {detailColumns.slice(0, 4).map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const label = getPrimaryLabel(row, config.titleField);
                    const subtitle = getSubtitle(row);
                    return (
                      <tr key={String(row.id)}>
                        <td>
                          <button
                            type="button"
                            className="flex items-center gap-3 text-left"
                            onClick={() => setViewing(row)}
                          >
                            <EntityAvatar
                              url={getRowMediaUrl(row, config.fileField)}
                              name={label}
                            />
                            <div className="min-w-0">
                              <span className="ld-table__name">{label}</span>
                              {subtitle ? (
                                <span className="ld-table__sub">{subtitle}</span>
                              ) : (
                                <span className="ld-table__sub">ID {String(row.id)}</span>
                              )}
                            </div>
                          </button>
                        </td>
                        {detailColumns.slice(0, 4).map((col) => (
                          <td key={col.key}>
                            <div className="min-w-0 max-w-[14rem] truncate [&_*]:max-w-full [&_*]:truncate">
                              {col.render
                                ? col.render(row)
                                : renderSmartCell(col.key, row)}
                            </div>
                          </td>
                        ))}
                        <td>
                          <div className="ld-table__actions">
                            {config.hasActiveToggle && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8 rounded-md transition-colors",
                                  isRowActive(row, config)
                                    ? "text-[var(--ld-accent)] hover:bg-[var(--ld-accent-soft)] hover:text-[#ffc84d]"
                                    : "text-[var(--ld-faint)] hover:bg-white/10 hover:text-[var(--ld-ink)]"
                                )}
                                onClick={() => handleToggleActive(row)}
                                disabled={updating}
                                title={
                                  isRowActive(row, config)
                                    ? "Deactivate"
                                    : "Activate"
                                }
                              >
                                {isRowActive(row, config) ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-[var(--ld-ink)] hover:bg-white/10 hover:text-[var(--ld-accent)]"
                              onClick={() => openEdit(row)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!config.disableDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-rose-400 hover:bg-rose-500/15 hover:text-rose-300"
                                onClick={() => handleDelete(row)}
                                disabled={deleting}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {meta && (
          <AdminPagination
            page={meta.page}
            perPage={meta.perPage}
            total={meta.total}
            isFetching={isFetching}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="admin-portal max-h-[90vh] max-w-3xl overflow-y-auto border border-[var(--ld-line-strong)] bg-[#0d1424] p-0 text-[var(--ld-ink)]">
          <div className="border-b border-[var(--ld-line)] bg-gradient-to-r from-[var(--ld-accent-soft)] to-[rgba(13,20,36,0.95)] px-6 py-5">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-semibold text-[var(--ld-ink)]">
                {editing
                  ? `Edit ${config.title.replace(/s$/, "")}`
                  : `New ${config.title.replace(/s$/, "")}`}
              </DialogTitle>
              <DialogDescription className="text-[var(--ld-muted)]">
                Fill in the details below. Required fields are marked with *.
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
            <AdminFormFields
              fields={config.fields}
              values={values}
              onChange={handleChange}
              disabled={saving}
            />
            <div className="flex justify-end gap-3 border-t border-[var(--ld-line)] pt-4">
              <Button
                type="button"
                variant="outline"
                className="ld-btn"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="ld-btn ld-btn--solid"
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="admin-portal max-h-[90vh] max-w-3xl overflow-y-auto border border-[var(--ld-line-strong)] bg-[#0d1424] p-0 text-[var(--ld-ink)]">
          <div className="border-b border-[var(--ld-line)] bg-gradient-to-r from-[var(--ld-accent-soft)] to-[rgba(13,20,36,0.95)] px-6 py-5">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-semibold text-[var(--ld-ink)]">
                {viewing ? getPrimaryLabel(viewing, config.titleField) : "Details"}
              </DialogTitle>
              <DialogDescription className="text-[var(--ld-muted)]">
                {config.title.replace(/s$/, "")} details
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-5">
            <dl className="grid gap-x-4 gap-y-8 sm:grid-cols-2">
              {config.fields.map((field) => {
                const value = viewing?.[field.name];
                let displayValue: React.ReactNode = "—";

                if (value !== undefined && value !== null && value !== "") {
                  if (field.type === "switch") {
                    displayValue = (value === 1 || value === true || value === "1") ? "Yes" : "No";
                  } else if (field.type === "file") {
                    // Use the comprehensive helper to extract the URL from any possible field pattern
                    const urlKey = viewing ? getRowMediaUrl(viewing, field.name) : undefined;
                    if (urlKey) {
                      displayValue = (
                        <div className="relative mt-2 h-32 w-48 overflow-hidden rounded-md border border-[var(--ld-line-strong)] bg-black/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={urlKey} alt={field.label} className="h-full w-full object-cover" />
                        </div>
                      );
                    } else {
                      displayValue = "No file attached";
                    }
                  } else if (field.type === "richtext") {
                    displayValue = (
                      <div
                        className="prose prose-invert prose-sm mt-2 max-w-none rounded-md border border-[var(--ld-line-strong)] bg-white/5 p-4 text-[var(--ld-ink)]"
                        dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(String(value)) }}
                      />
                    );
                  } else if (field.type === "textarea") {
                    displayValue = <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ld-muted)]">{String(value)}</p>;
                  } else {
                    displayValue = <span className="text-sm font-medium text-[var(--ld-ink)]">{String(value)}</span>;
                  }
                }

                return (
                  <div key={field.name} className={cn(field.colSpan === 2 || field.type === "richtext" || field.type === "textarea" ? "sm:col-span-2" : "sm:col-span-1")}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ld-accent)]">
                      {field.label}
                    </dt>
                    <dd className="mt-1">{displayValue}</dd>
                  </div>
                );
              })}
            </dl>
            <div className="mt-8 flex justify-end border-t border-[var(--ld-line)] pt-6">
              <Button onClick={() => setViewing(null)} className="ld-btn">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
