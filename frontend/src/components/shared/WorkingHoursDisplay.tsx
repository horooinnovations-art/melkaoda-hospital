"use client";

import { Clock, CalendarDays, CalendarCheck } from "lucide-react";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import { cn } from "@/lib/utils";

interface WorkingHoursDisplayProps {
  className?: string;
  variant?: "dark" | "light" | "card";
}

export default function WorkingHoursDisplay({
  className,
  variant = "light",
}: WorkingHoursDisplayProps) {
  const { data: settings } = useGetSettingsQuery();

  const workingHours = (settings?.hours as string) || "24hrs";
  const visitingHours =
    (settings?.visiting_hours as string) ||
    "Daily: 02:30 – 06:30 and 07:30 – 11:30 LT";

  const isDark = variant === "dark";
  const isCard = variant === "card";

  return (
    <div
      className={cn(
        "flex flex-col gap-3.5",
        isCard &&
          "rounded-2xl border border-emerald-500/20 bg-emerald-950/90 p-5 text-white shadow-lg backdrop-blur-md",
        className
      )}
    >
      {/* Working Hours Row */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform hover:scale-105",
            isDark || isCard
              ? "border-emerald-500/40 bg-emerald-900/60 text-emerald-400"
              : "border-emerald-600/30 bg-emerald-50 text-emerald-700"
          )}
        >
          <Clock className="h-4 w-4" />
        </div>
        <span
          className={cn(
            "font-display text-sm sm:text-base font-bold tracking-tight",
            isDark || isCard ? "text-emerald-100" : "text-slate-900"
          )}
        >
          Every day {workingHours}
        </span>
      </div>

      {/* Visiting Hours Row */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform hover:scale-105",
            isDark || isCard
              ? "border-emerald-500/40 bg-emerald-900/60 text-emerald-400"
              : "border-emerald-600/30 bg-emerald-50 text-emerald-700"
          )}
        >
          <CalendarCheck className="h-4 w-4" />
        </div>
        <span
          className={cn(
            "font-display text-sm sm:text-base font-bold tracking-tight",
            isDark || isCard ? "text-emerald-100" : "text-slate-900"
          )}
        >
          <span className="font-semibold opacity-90">Visiting hours:</span>{" "}
          {visitingHours}
        </span>
      </div>
    </div>
  );
}
