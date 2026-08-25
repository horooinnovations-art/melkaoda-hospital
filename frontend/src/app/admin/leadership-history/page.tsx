"use client";

import AdminCrudPage from "@/components/admin/AdminCrudPage";
import { getResourceConfig } from "@/lib/adminResources";
import { Info } from "lucide-react";

export default function AdminLeadershipHistoryPage() {
  const config = getResourceConfig("leadership-history");

  return (
    <AdminCrudPage
      config={config}
      sortRows={(rows) =>
        [...rows].sort((a, b) => {
          const aStart = a.tenure_start ? new Date(String(a.tenure_start)).getTime() : 0;
          const bStart = b.tenure_start ? new Date(String(b.tenure_start)).getTime() : 0;
          if (aStart !== bStart) return aStart - bStart;
          return Number(a.order ?? 0) - Number(b.order ?? 0);
        })
      }
      infoBanner={
        <div className="flex gap-3 rounded-md border border-[rgba(21,128,61,0.3)] bg-[var(--hb-accent-soft)] p-4 text-sm text-slate-900">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--hb-accent)]" />
          <div>
            <p className="font-medium">Chronological ordering</p>
            <p className="mt-1 text-slate-900/80">
              Leaders are displayed in tenure order on the public site. Assign earlier{" "}
              <strong>tenure start dates</strong> and lower <strong>display order</strong> values
              to leaders who served earlier. For example, a founding director from 1985 should have
              an earlier tenure start and lower order than a director from 2010.
            </p>
          </div>
        </div>
      }
    />
  );
}
