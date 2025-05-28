"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { memo } from "react";

import { cn } from "@/utils/twcn";

type VehicleMonitoringTableHeaderProps = {
  daysInView: string[];
  viewMode: "month" | "week";
};

const VehicleMonitoringTableHeader = ({ daysInView, viewMode }: VehicleMonitoringTableHeaderProps) => {
  const t = useTranslations();
  return (
    <thead>
      <tr>
        {/* Owner Column */}
        <th className="sticky left-0 top-0 z-30 hidden min-w-[160px] max-w-[160px] border-b border-r bg-gray-50 px-4 py-2 text-sm text-gray-700 sm:table-cell">
          {t("vehicle_monitoring.owner")}
        </th>
        {/* Vehicle Information Column */}
        <th className="sticky left-0 top-0 z-30 min-w-[160px] max-w-[160px] border-b border-r bg-gray-50 px-4 py-2 text-sm text-gray-700 sm:left-[160px]">
          {t("vehicle_monitoring.vehicle_info")}
        </th>
        {daysInView.map((day) => (
          <th
            key={day}
            className={cn("sticky top-0 z-20 border-b border-r bg-gray-50 px-4 py-2 text-sm text-gray-700", {
              "min-w-[200px]": viewMode === "month",
              "min-w-[146px]": viewMode === "week",
            })}
          >
            {format(new Date(day), t("common.format.fns.date"))}
          </th>
        ))}
      </tr>
    </thead>
  );
};

export default memo(VehicleMonitoringTableHeader);
