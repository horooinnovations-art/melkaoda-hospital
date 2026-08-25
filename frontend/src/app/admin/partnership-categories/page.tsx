"use client";

import AdminCrudPage from "@/components/admin/AdminCrudPage";
import { getResourceConfig } from "@/lib/adminResources";

export default function PartnershipCategoriesAdminPage() {
  return <AdminCrudPage config={getResourceConfig("partnership-categories")} />;
}
