"use client";

import { Clock, CalendarCheck } from "lucide-react";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import { cn } from "@/lib/utils";

interface WorkingHoursDisplayProps {
  className?: string;
  /**
   * Retained for source compatibility. The three variants existed to switch
   * between emerald-on-white and emerald-on-emerald; both surfaces this renders
   * on are Nova charcoal now, so there is one treatment.
   */
  variant?: "dark" | "light" | "card";
}

export default function WorkingHoursDisplay({
  className,
}: WorkingHoursDisplayProps) {
  const { data: settings } = useGetSettingsQuery();

  const workingHours = (settings?.hours as string) || "24hrs";
  const visitingHours =
    (settings?.visiting_hours as string) ||
    "Daily: 02:30 – 06:30 and 07:30 – 11:30 LT";

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="nv-vrow">
        <span className="nv-vrow__ico" aria-hidden>
          <Clock />
        </span>
        <span>
          <span className="nv-vrow__key">Open</span>
          <span className="nv-vrow__val">Every day {workingHours}</span>
        </span>
      </div>

      <div className="nv-vrow">
        <span className="nv-vrow__ico" aria-hidden>
          <CalendarCheck />
        </span>
        <span>
          <span className="nv-vrow__key">Visiting hours</span>
          <span className="nv-vrow__val">{visitingHours}</span>
        </span>
      </div>
    </div>
  );
}
