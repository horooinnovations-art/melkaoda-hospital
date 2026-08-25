"use client";

import { useSearchParams } from "next/navigation";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import { getImageFromItem } from "@/lib/media";
import type { Doctor } from "@/lib/types";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import { ClinicianRow } from "@/components/shared/PeopleProfiles";
import PublicPagination from "@/components/shared/PublicPagination";

import { isPublicItemActive } from "@/lib/utils";

export default function DoctorsList() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams?.get("page")) || 1);
  const perPage = 12;

  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "doctors",
    page,
    perPage,
  });

  if (isLoading) return <GridSkeleton count={8} />;

  const rawDoctors = (data?.data ?? []) as Doctor[];
  const doctors = rawDoctors.filter((doc) =>
    isPublicItemActive(doc as unknown as Record<string, unknown>)
  );
  const total = doctors.length;

  if (isError || doctors.length === 0) {
    return <EmptyState title="Doctor profiles coming soon" />;
  }

  return (
    <PageTransition>
      <div className="g-clinic-list space-y-8">
        <div className="g-clinic-list__head">
          <p className="g-clinic-list__label">Clinical directory</p>
          <p className="g-clinic-list__count">
            {total} specialist{total === 1 ? "" : "s"}
          </p>
        </div>
        <ul className="g-clinic-list__rows">
          {doctors.map((doc, i) => {
            const image = getImageFromItem(
              doc as unknown as Record<string, unknown>
            );
            const name = `${doc.title ? `${doc.title} ` : ""}${doc.first_name} ${doc.last_name}`;
            const department = (
              doc as { department?: { name?: string } }
            ).department?.name;
            return (
              <li key={doc.id}>
                <ClinicianRow
                  href={`/doctors/${doc.slug}`}
                  name={name}
                  designation={doc.designation || undefined}
                  department={department}
                  image={image}
                  index={i}
                />
              </li>
            );
          })}
        </ul>

        {/* Public Pagination Bar */}
        <PublicPagination
          currentPage={page}
          totalItems={total}
          perPage={perPage}
          basePath="/doctors"
        />
      </div>
    </PageTransition>
  );
}
