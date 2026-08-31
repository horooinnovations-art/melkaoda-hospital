"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";
import { getApiBase } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { AdminField, FieldOption } from "@/lib/adminResources";
import RichTextEditor from "@/components/admin/RichTextEditor";

interface AdminFormFieldsProps {
  fields: AdminField[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  disabled?: boolean;
}

function FileField({
  field,
  values,
  onChange,
  disabled,
}: {
  field: AdminField;
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const file = values[field.name] instanceof File ? (values[field.name] as File) : null;
  const existingUrl = values[`_${field.name}_url`]
    ? String(values[`_${field.name}_url`])
    : "";
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const resolvedExisting = existingUrl ? resolveMediaUrl(existingUrl) : undefined;
  const preview = objectUrl || resolvedExisting || null;
  // Keep in step with the extension whitelist in backend/src/services/media.js —
  // a picker that offers a format the upload filter rejects is a dead end the
  // editor only discovers after choosing the file.
  const accept =
    field.name === "media_file"
      ? "image/*,video/*"
      : "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";
  const isImagePreview =
    !!objectUrl ||
    (!!preview &&
      !/\.(pdf|docx?|txt|zip|rar)(\?|$)/i.test(preview) &&
      (preview.startsWith("data:image/") ||
        preview.startsWith("blob:") ||
        /\/storage\//i.test(preview) ||
        /\/uploads\//i.test(preview) ||
        /cloudinary/i.test(preview) ||
        /\.(jpe?g|png|gif|webp|svg|bmp|avif)/i.test(preview) ||
        !/\.[a-z0-9]{2,4}(\?|$)/i.test(preview)));

  return (
    <div className="space-y-3">
      <label
        htmlFor={field.name}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-gradient-to-br from-[var(--hb-accent-soft)] to-white px-4 py-6 transition hover:border-[rgba(21,128,61,0.35)] hover:bg-[var(--hb-accent-soft)]",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        {isImagePreview && preview ? (
          <div className="relative mb-3 h-28 w-28 overflow-hidden rounded-md ring-1 ring-slate-200">
            <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-white text-slate-900 shadow-sm ring-1 ring-slate-200">
            <Upload className="h-5 w-5" />
          </div>
        )}
        <p className="text-sm font-medium text-slate-900">
          {file ? file.name : "Click to upload a file"}
        </p>
        <p className="mt-1 text-xs text-ink-muted">Images, PDF, or Word documents</p>
        <Input
          id={field.name}
          type="file"
          accept={accept}
          onChange={(e) => {
            const next = e.target.files?.[0];
            if (next) onChange(field.name, next);
          }}
          disabled={disabled}
          className="absolute inset-0 h-full cursor-pointer opacity-0"
        />
      </label>
      {existingUrl && !file ? (
        <p className="flex items-center gap-2 truncate text-xs text-ink-muted">
          <ImageIcon className="h-3.5 w-3.5 shrink-0" />
          Current file attached
        </p>
      ) : null}
    </div>
  );
}

export default function AdminFormFields({
  fields,
  values,
  onChange,
  disabled,
}: AdminFormFieldsProps) {
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, FieldOption[]>>({});
  const fetchedUrls = useRef<Record<string, boolean>>({});

  useEffect(() => {
    fields.forEach((field) => {
      if (
        (field.type !== "select" && field.type !== "multiselect") ||
        !field.optionsUrl ||
        fetchedUrls.current[field.name]
      ) {
        return;
      }
      fetchedUrls.current[field.name] = true;
      const base = getApiBase().replace(/\/$/, "");
      const url = field.optionsUrl.startsWith("/")
        ? `${base}${field.optionsUrl}`
        : `${base}/${field.optionsUrl}`;
      fetch(url, {
        headers: {
          Accept: "application/json",
          ...(typeof window !== "undefined" && getToken()
            ? { Authorization: `Bearer ${getToken()}` }
            : {}),
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Unable to load options (${res.status})`);
          return res.json();
        })
        .then((json) => {
          if (json?.success && Array.isArray(json.data)) {
            setDynamicOptions((prev) => ({ ...prev, [field.name]: json.data }));
          }
        })
        .catch(() => {
          // Ignore option loading errors; fallback to any hardcoded options.
        });
    });
  }, [fields]);

  const fieldClass =
    "rounded-md border-slate-200 bg-white/90 focus-visible:ring-[rgba(21,128,61,0.25)]";

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.name}
          className={cn(
            "space-y-2",
            field.colSpan === 2 && "sm:col-span-2",
            field.type === "hidden" && "hidden"
          )}
        >
          {field.type === "hidden" ? (
            <input
              id={field.name}
              type="hidden"
              value={String(values[field.name] ?? "")}
              readOnly
            />
          ) : null}

          {field.type !== "switch" && field.type !== "hidden" && (
            <Label htmlFor={field.name} className="text-ink">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </Label>
          )}

          {field.type === "readonly" ? (
            <Input
              id={field.name}
              type={field.name === "id" || field.name.endsWith("_id") ? "number" : "text"}
              value={String(values[field.name] ?? "")}
              readOnly
              disabled
              placeholder={field.placeholder}
              className={cn(fieldClass, "bg-slate-100 text-ink-muted")}
            />
          ) : null}

          {field.type === "text" || field.type === "url" || field.type === "email" || field.type === "phone" ? (
            <Input
              id={field.name}
              type={field.type === "phone" ? "tel" : field.type}
              value={String(values[field.name] ?? "")}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={disabled}
              className={fieldClass}
            />
          ) : null}

          {field.type === "number" ? (
            <Input
              id={field.name}
              type="number"
              value={values[field.name] === "" ? "" : String(values[field.name] ?? "")}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={disabled}
              className={fieldClass}
            />
          ) : null}

          {field.type === "date" || field.type === "datetime" || field.type === "time" ? (
            <Input
              id={field.name}
              type={
                field.type === "datetime"
                  ? "datetime-local"
                  : field.type === "time"
                    ? "time"
                    : "date"
              }
              value={String(values[field.name] ?? "")}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={field.required}
              disabled={disabled}
              className={fieldClass}
            />
          ) : null}

          {field.type === "textarea" ? (
            <Textarea
              id={field.name}
              rows={field.rows ?? 4}
              value={String(values[field.name] ?? "")}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={disabled}
              className={cn(fieldClass, "min-h-[7rem]")}
            />
          ) : null}

          {field.type === "richtext" ? (
            <RichTextEditor
              id={field.name}
              value={String(values[field.name] ?? "")}
              onChange={(html) => onChange(field.name, html)}
              placeholder={field.placeholder}
              disabled={disabled}
              minHeight={field.rows && field.rows >= 8 ? "14rem" : "10rem"}
            />
          ) : null}

          {field.type === "textarea" ? (
            <Textarea
              id={field.name}
              rows={field.rows ?? 4}
              value={String(values[field.name] ?? "")}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={disabled}
              className={cn(fieldClass, "min-h-[7rem]")}
            />
          ) : null}

          {field.type === "richtext" ? (
            <RichTextEditor
              id={field.name}
              value={String(values[field.name] ?? "")}
              onChange={(html) => onChange(field.name, html)}
              placeholder={field.placeholder}
              disabled={disabled}
              minHeight={field.rows && field.rows >= 8 ? "14rem" : "10rem"}
            />
          ) : null}

          {field.type === "select" && (field.options || field.optionsUrl) ? (
            <Select
              value={String(values[field.name] ?? "")}
              onValueChange={(v) => onChange(field.name, v)}
              disabled={disabled}
            >
              <SelectTrigger id={field.name} className={cn("h-11", fieldClass)}>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(
                  (dynamicOptions[field.name] && dynamicOptions[field.name].length > 0
                    ? dynamicOptions[field.name]
                    : field.options) ?? []
                ).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {field.type === "multiselect" && (field.options || field.optionsUrl) ? (
            <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white/90 p-2">
              {(
                (dynamicOptions[field.name] && dynamicOptions[field.name].length > 0
                  ? dynamicOptions[field.name]
                  : field.options) ?? []
              ).length === 0 ? (
                <p className="px-2 py-3 text-sm text-ink-muted">No options available</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    (dynamicOptions[field.name] && dynamicOptions[field.name].length > 0
                      ? dynamicOptions[field.name]
                      : field.options) ?? []
                  ).map((opt) => {
                    const current = Array.isArray(values[field.name])
                      ? (values[field.name] as unknown[]).map(String)
                      : values[field.name]
                        ? [String(values[field.name])]
                        : [];
                    const checked = current.includes(String(opt.value));
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition",
                          checked
                            ? "border-[rgba(21,128,61,0.35)] bg-[var(--hb-accent-soft)] text-ink"
                            : "border-slate-100 bg-stone/20 text-ink-muted"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => {
                            const next = checked
                              ? current.filter((value) => value !== String(opt.value))
                              : [...current, String(opt.value)];
                            onChange(field.name, next);
                          }}
                        />
                        <span className="min-w-0 truncate">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {field.type === "switch" ? (
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-gradient-to-r from-[var(--hb-accent-soft)] to-white px-4 py-3.5">
              <Label htmlFor={field.name} className="cursor-pointer text-ink">
                {field.label}
              </Label>
              <Switch
                id={field.name}
                checked={!!values[field.name]}
                onCheckedChange={(v) => onChange(field.name, v)}
                disabled={disabled}
              />
            </div>
          ) : null}

          {field.type === "file" ? (
            <FileField
              field={field}
              values={values}
              onChange={onChange}
              disabled={disabled}
            />
          ) : null}

          {field.hint ? <p className="text-xs text-ink-muted">{field.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
