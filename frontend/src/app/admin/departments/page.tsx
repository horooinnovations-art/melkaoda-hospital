"use client";

import AdminCrudPage from "@/components/admin/AdminCrudPage";
import { getResourceConfig } from "@/lib/adminResources";
import type { AdminResource } from "@/store/adminApi";

function makePage(resource: AdminResource) {
  return function AdminResourcePage() {
    return <AdminCrudPage config={getResourceConfig(resource)} />;
  };
}

export default makePage("departments");
