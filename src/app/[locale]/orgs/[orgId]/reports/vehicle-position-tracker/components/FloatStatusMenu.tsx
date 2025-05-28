import { useTranslations } from "next-intl";
import { memo, useCallback, useMemo, useState } from "react";
import { FaTruckFront as FaTruckFrontIcon } from "react-icons/fa6";

import { Badge } from "@/components/atoms";
import { VehiclesByStatusResponse } from "@/types/vehicle";
import { ensureString, isFalse, isTrue } from "@/utils/string";
import { cn } from "@/utils/twcn";

type FloatMenuButtonType = "processing" | "free";
type FloatStatusMenuProps = {
  vehicles: VehiclesByStatusResponse[];
  className?: string;
  onClick: (_ids: number[] | null) => void;
};

const FloatStatusMenu = ({ vehicles, className, onClick }: FloatStatusMenuProps) => {
  const [selectedType, setSelectedType] = useState<FloatMenuButtonType | null>();
  const processingVehicles = useMemo(() => vehicles.filter((vehicle) => isFalse(vehicle.isFree)), [vehicles]);
  const freeVehicles = useMemo(() => vehicles.filter((vehicle) => isTrue(vehicle.isFree)), [vehicles]);
  const t = useTranslations();

  /**
   * A callback function that handles the click event for a specific type of button.
   * It toggles the selected type and triggers the onClick callback with the appropriate vehicle IDs.
   *
   * @param {FloatMenuButtonType} type - The type of button that was clicked.
   */
  const handleClick = useCallback(
    (type: FloatMenuButtonType) => () => {
      if (type === selectedType) {
        setSelectedType(null);
        onClick(null);
        return;
      }
      const ids =
        type === "processing"
          ? processingVehicles.map((vehicle) => Number(vehicle.id))
          : freeVehicles.map((vehicle) => Number(vehicle.id));
      onClick(ids);
      setSelectedType(type);
    },
    [freeVehicles, onClick, processingVehicles, selectedType]
  );

  return (
    <div className={className}>
      <div
        onClick={handleClick("processing")}
        className={cn(
          "absolute left-[23.5rem] top-3 z-40 flex w-max cursor-pointer items-center gap-x-2 rounded-lg bg-white px-3 py-2 text-sm shadow-md hover:bg-gray-100 hover:shadow-xl",
          {
            "bg-blue-100 hover:bg-blue-200": selectedType === "processing",
            "bg-white": selectedType !== "processing",
          }
        )}
      >
        <FaTruckFrontIcon className="h-3 w-3 flex-shrink-0 text-green-600" />
        <label className="relative cursor-pointer text-xs">
          <span className="text-gray-700">{t("report.vehicle_position_tracker.vehicle_status.processing")}</span>
        </label>
        <Badge
          className="absolute -right-4 -top-2 bg-blue-500 text-white"
          rounded
          label={ensureString(processingVehicles.length)}
        />
      </div>
      <div
        onClick={handleClick("free")}
        className={cn(
          "absolute left-60 top-3 z-40 flex w-max cursor-pointer items-center gap-x-2 rounded-lg px-3 py-2 text-sm shadow-md hover:bg-gray-100 hover:shadow-xl",
          {
            "bg-blue-100 hover:bg-blue-200": selectedType === "free",
            "bg-white": selectedType !== "free",
          }
        )}
      >
        <FaTruckFrontIcon className="h-3 w-3 flex-shrink-0 text-gray-700" />
        <label className="relative cursor-pointer text-xs">
          <span className="text-gray-500">{t("report.vehicle_position_tracker.vehicle_status.empty")}</span>
        </label>
        <Badge
          className="absolute -right-4 -top-2 bg-blue-500 text-white"
          rounded
          label={ensureString(freeVehicles.length)}
        />
      </div>
    </div>
  );
};

export default memo(FloatStatusMenu);
