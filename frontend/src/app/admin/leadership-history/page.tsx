"use client";

import AdminCrudPage from "@/components/admin/AdminCrudPage";
import { getResourceConfig } from "@/lib/adminResources";
import { Info } from "lucide-react";
import { compareTenureNewestFirst } from "@/lib/utils";

export default function AdminLeadershipHistoryPage() {
  const config = getResourceConfig("leadership-history");

  return (
    <AdminCrudPage
      config={config}
      sortRows={(rows) => [...rows].sort(compareTenureNewestFirst)}
      infoBanner={
        <div className="flex gap-3 rounded-md border border-[rgba(21,128,61,0.3)] bg-[var(--hb-accent-soft)] p-4 text-sm text-slate-900">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--hb-accent)]" />
          <div>
            <p className="font-medium">Most recent first</p>
            <p className="mt-1 text-slate-900/80">
              The serving leader is listed first, here and on the public site. A leader is
              serving when <strong>Tenure End</strong> is empty; the rest follow from the most
              recent <strong>tenure start</strong> back to the earliest. To mark a former leader as
              serving again, clear their Tenure End and save.
            </p>
          </div>
        </div>
      }
    />
  );
}
