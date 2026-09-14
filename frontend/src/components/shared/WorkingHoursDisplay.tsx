"use client";

import { Clock, CalendarCheck } from "lucide-react";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import { cn, summarizeHours } from "@/lib/utils";

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

  /**
   * No invented defaults. These used to fall back to "24hrs" and to a
   * specific visiting window, so a hospital that had filled in neither
   * still published both — including times its doors were shut.
   */
  const workingHours = summarizeHours(settings?.hours as string | undefined);
  const visitingHours = (
    (settings?.visiting_hours as string) || ""
  ).trim();

  return (
    <div className={cn("grid gap-4", className)}>
      {workingHours && (
        <div className="nv-vrow">
          <span className="nv-vrow__ico" aria-hidden>
            <Clock />
          </span>
          <span>
            <span className="nv-vrow__key">Open</span>
            <span className="nv-vrow__val">{workingHours}</span>
          </span>
        </div>
      )}

      {visitingHours && (
        <div className="nv-vrow">
          <span className="nv-vrow__ico" aria-hidden>
            <CalendarCheck />
          </span>
          <span>
            <span className="nv-vrow__key">Visiting hours</span>
            <span className="nv-vrow__val">{visitingHours}</span>
          </span>
        </div>
      )}
    </div>
  );
}
