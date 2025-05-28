import {
  CheckIcon,
  ChevronDoubleLeftIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { VehicleTrackingStatus } from "@prisma/client";
import { debounce } from "lodash";
import { useTranslations } from "next-intl";
import { ChangeEvent, memo, useCallback, useEffect, useState } from "react";
import { BsSpeedometer2 as BsSpeedometer2Icon } from "react-icons/bs";
import { IconType } from "react-icons/lib";
import {
  MdSignalWifiStatusbar2Bar as MdSignalWifiStatusbar2BarIcon,
  MdSignalWifiStatusbar3Bar as MdSignalWifiStatusbar3BarIcon,
  MdSignalWifiStatusbar4Bar as MdSignalWifiStatusbar4BarIcon,
  MdSignalWifiStatusbarNotConnected as MdSignalWifiStatusbarNotConnectedIcon,
} from "react-icons/md";

import { TextField } from "@/components/molecules";
import { VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { cn } from "@/utils/twcn";

import ClickableVehicleItemSkeleton from "./ClickableVehicleItemSkeleton";

type VehicleAccordionProps = {
  vehicles: VehicleInfo[];
  loading?: boolean;
  onClick: (_id: number | null) => void;
  onCollapse?: () => void;
};

const ClickableVehicleList = ({ vehicles, loading, onClick, onCollapse }: VehicleAccordionProps) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState<string>("");
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleInfo[]>(vehicles);
  const t = useTranslations();

  const handleClick = useCallback(
    (id: number | null) => () => {
      if (equalId(selectedVehicleId, id)) {
        setSelectedVehicleId(null);
        onClick(null);
        return;
      } else {
        setSelectedVehicleId(id);
        onClick(id);
      }
    },
    [onClick, selectedVehicleId]
  );

  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
  }, []);

  const handleSearch = useCallback(() => {
    const filtered = vehicles.filter((vehicle) => {
      const fullName = getFullName(vehicle.driver?.firstName, vehicle.driver?.lastName);
      return (
        fullName.toLowerCase().includes(searchValue.toLowerCase()) ||
        vehicle.vehicleNumber.toLowerCase().includes(searchValue.toLowerCase())
      );
    });
    setFilteredVehicles(filtered);
    if (filtered.length === 1) {
      setSelectedVehicleId(Number(filtered[0].id));
      onClick(Number(filtered[0].id));
    }
  }, [onClick, searchValue, vehicles]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleKeyUp = useCallback(debounce(handleSearch, 500), [handleSearch]);

  const toggleMenu = useCallback(() => {
    onCollapse && onCollapse();
  }, [onCollapse]);

  useEffect(() => {
    setFilteredVehicles(vehicles);
  }, [vehicles]);

  const getCarStatus = useCallback(
    (carStatus?: VehicleTrackingStatus | null) => {
      let VehicleStatusTag: IconType;
      let statusLabel: string;
      let statusColor: string;

      switch (carStatus) {
        case VehicleTrackingStatus.ACTIVE:
          VehicleStatusTag = MdSignalWifiStatusbar4BarIcon;
          statusColor = "text-teal-600";
          statusLabel = t("report.vehicle_position_tracker.detail_last_status.active");
          break;
        case VehicleTrackingStatus.STOPPED:
          VehicleStatusTag = MdSignalWifiStatusbar3BarIcon;
          statusColor = "text-amber-600";
          statusLabel = t("report.vehicle_position_tracker.detail_last_status.stopped");
          break;
        case VehicleTrackingStatus.STOPPED_WITH_ENGINE_ON:
          VehicleStatusTag = MdSignalWifiStatusbar2BarIcon;
          statusColor = "text-indigo-600";
          statusLabel = t("report.vehicle_position_tracker.detail_last_status.stopped_with_engine_on");
          break;
        case VehicleTrackingStatus.NO_SIGNAL:
          statusLabel = t("report.vehicle_position_tracker.detail_last_status.no_signal");
          statusColor = "text-gray-600";
          VehicleStatusTag = MdSignalWifiStatusbarNotConnectedIcon;
          break;
        default:
          VehicleStatusTag = MdSignalWifiStatusbarNotConnectedIcon;
          statusColor = "text-gray-600";
          statusLabel = t("report.vehicle_position_tracker.detail_last_status.unknown");
      }

      return (
        <>
          <VehicleStatusTag className={cn("h-4 w-4 flex-shrink-0", statusColor)} />
          <span className={cn("text-xs", statusColor)}>{statusLabel}</span>
        </>
      );
    },
    [t]
  );

  return (
    <>
      <div className="absolute top-0 flex flex-nowrap items-center gap-x-3 px-2">
        <TextField
          className="text-sm"
          value={searchValue}
          icon={MagnifyingGlassIcon}
          placeholder={t("report.vehicle_position_tracker.vehicle_driver")}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
        />
        <span className="cursor-pointer rounded-md bg-slate-200 p-2 shadow-sm hover:bg-slate-200" onClick={toggleMenu}>
          <ChevronDoubleLeftIcon className="h-5 w-5 text-gray-600" />
        </span>
      </div>
      <div className="mt-12 overflow-y-auto py-2 text-sm text-gray-700">
        <ClickableVehicleItemSkeleton visible={loading} />
        {filteredVehicles.map((vehicle, index) => (
          <div
            key={index}
            onClick={handleClick(Number(vehicle.id))}
            className={cn(
              "relative flex cursor-pointer flex-col gap-y-2 border-b border-gray-300 p-2 transition hover:bg-teal-50",
              {
                "bg-teal-100": equalId(selectedVehicleId, vehicle.id),
              }
            )}
          >
            <div className="flex flex-nowrap justify-between">
              <div className="flex items-center gap-x-2">
                <TruckIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
                <span className="text-xs text-gray-500">{vehicle.vehicleNumber}</span>
              </div>
              <div className="flex items-center gap-x-2">
                <BsSpeedometer2Icon className="h-4 w-4 flex-shrink-0 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {t("report.vehicle_position_tracker.detail_last_status.speed", {
                    speed: vehicle.vehicleTracking?.speed ? ensureString(vehicle.vehicleTracking.speed) : "-",
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-x-2">
              <UserIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
              <span className="text-xs text-gray-500">
                {vehicle.driver?.firstName && vehicle.driver?.lastName
                  ? getFullName(vehicle.driver.firstName, vehicle.driver.lastName)
                  : "-"}
              </span>
            </div>

            <div className="flex items-center justify-center gap-x-2 bg-gray-50 py-2">
              {getCarStatus(vehicle.vehicleTracking?.carStatus)}
            </div>
            {equalId(selectedVehicleId, vehicle.id) && (
              <span className="absolute bottom-3 right-3 top-3 flex items-center">
                <CheckIcon className="h-4 w-4 text-blue-600" />
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default memo(ClickableVehicleList);
