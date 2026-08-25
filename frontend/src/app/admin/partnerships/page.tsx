"use client";

import AdminCrudPage from "@/components/admin/AdminCrudPage";
import { getResourceConfig } from "@/lib/adminResources";

export default function PartnershipsAdminPage() {
  return <AdminCrudPage config={getResourceConfig("partnerships")} />;
}
