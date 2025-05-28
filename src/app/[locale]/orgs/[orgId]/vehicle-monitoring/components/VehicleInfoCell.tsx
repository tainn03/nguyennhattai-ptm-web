"use client";

import { VehicleOwnerType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { memo } from "react";

type Resource = {
  id: number;
  owner: string;
  name: string;
  driver: string;
  ownerType: string;
};

const VehicleInfoCell = ({ resource }: { resource: Resource }) => {
  const t = useTranslations();
  return (
    <>
      {/* Owner Column */}
      <td className="sticky left-0 z-20 hidden min-w-[160px] max-w-[160px] border-y border-r bg-gray-50 px-4 py-2 text-sm text-gray-700 sm:table-cell">
        <div className="whitespace-normal font-medium">
          {resource.ownerType === VehicleOwnerType.ORGANIZATION
            ? t("vehicle_monitoring.organization")
            : t("vehicle_monitoring.subcontractor")}
        </div>
        {resource.ownerType !== VehicleOwnerType.ORGANIZATION && (
          <div className="whitespace-normal font-medium">{resource.owner}</div>
        )}
      </td>

      {/* Vehicle Information Column */}
      <td className="sticky left-0 z-20 max-w-[200px] border-y border-r bg-gray-50 px-4 py-2 text-sm text-gray-700 sm:left-[160px]">
        <div className="whitespace-nowrap font-medium">{resource.name}</div>
        <div className="whitespace-nowrap text-sm text-gray-600">{resource.driver}</div>
        <div className="block whitespace-normal text-xs font-medium sm:hidden">{resource.owner}</div>
      </td>
    </>
  );
};

export default memo(VehicleInfoCell);
