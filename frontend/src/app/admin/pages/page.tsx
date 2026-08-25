"use client";

import AdminCrudPage from "@/components/admin/AdminCrudPage";
import { getResourceConfig } from "@/lib/adminResources";

export default function Page() {
  return <AdminCrudPage config={getResourceConfig("pages")} />;
}
