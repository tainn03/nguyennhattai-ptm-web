"use client";

import { ChevronDoubleDownIcon, ChevronDoubleRightIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { OrderTripStatusType } from "@prisma/client";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/atoms";
import { MapContainer } from "@/components/molecules";
import { useDriverReportsTripStatusWithTypeAndName, useLatestVehicleLocation, useVehiclesForTracking } from "@/hooks";
import { DriverReportInfo } from "@/types/strapi";
import { LatestVehicleLocationResponse } from "@/types/vehicle";
import { OrgPageProps, withOrg } from "@/utils/client";
import { endOfDayToISOString, startOfDayToISOString } from "@/utils/date";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { cn } from "@/utils/twcn";

type LatLngTuple = [number, number, number?];
const DEFAULT_CENTER: LatLngTuple = [21.0285, 105.8542]; // Default center, e.g: Hanoi
const MapBoundsUpdater = dynamic(() => import("./components/MapBoundsUpdater"), { ssr: false });
const ClickableVehicleList = dynamic(() => import("./components/ClickableVehicleList"), { ssr: false });
const MapMarker = dynamic(() => import("@/components/organisms/MapMarker/MapMarker"), { ssr: false });

export default withOrg(
  ({ orgId }: OrgPageProps) => {
    const t = useTranslations();
    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => window.innerWidth < 960);
    const [isCollapsedNotice, setIsCollapsedNotice] = useState<boolean>(() => window.innerWidth < 960);
    const { vehicles, isLoading: isVehicleLoading } = useVehiclesForTracking({ organizationId: orgId });
    const [filteredLocations, setFilteredLocations] = useState<LatestVehicleLocationResponse[]>([]);
    const { locations, isLoading } = useLatestVehicleLocation({
      organizationId: orgId,
      startDate: startOfDayToISOString(new Date()),
      endDate: endOfDayToISOString(new Date()),
    });
    const { isLoading: isLoadingDriverReports, driverReports } = useDriverReportsTripStatusWithTypeAndName({
      organizationId: orgId,
    });

    // const { detail, isLoading: isLoadingDetail } = useDetailLatestVehicleLocation({ ...paramDetail });

    /**
     * Handles the click event for a vehicle.
     *
     * @param {number | null} id - The id of the vehicle to filter locations by. If null, resets the filter to show all locations.
     */
    const handleVehicleClick = useCallback(
      (id: number | null) => {
        if (id === null) {
          setFilteredLocations(locations);
          return;
        }

        const newLocations = [...locations];
        const newFilteredLocations = newLocations.filter((location) => equalId(location.id, id));
        setFilteredLocations(newFilteredLocations);
      },
      [locations]
    );

    /**
     * Handles the click event for the menu button to filter locations based on provided IDs.
     *
     * @param {number[] | null} ids - An array of location IDs to filter by, or null to reset the filter.
     */
    const _handleMenuButtonClick = useCallback(
      (ids: number[] | null) => {
        if (ids === null) {
          setFilteredLocations(locations);
          return;
        }
        const newLocations = [...locations];
        const newFilteredLocations = newLocations.filter((location) => ids.includes(Number(location.id)));
        setFilteredLocations(newFilteredLocations);
      },
      [locations]
    );

    /**
     * Handles the collapse event for the vehicle list.
     */
    const handleCollapse = useCallback(() => {
      setIsCollapsed((prev) => !prev);
    }, []);

    /**
     * Handles the collapse event for the notice list.
     */
    const handleCollapseNotice = useCallback(() => {
      setIsCollapsedNotice((prev) => !prev);
    }, []);

    useEffect(() => {
      if (!isLoading && locations.length > 0) {
        setFilteredLocations(locations);
      }
    }, [isLoading, locations]);

    return (
      <div>
        <div className="flex w-full flex-col gap-x-4 gap-y-6">
          <div className="relative flex w-full">
            <div
              className={cn(
                "absolute bottom-0 left-0 top-0 h-[calc(100vh-64px)] min-w-[14rem] flex-shrink-0 bg-white pt-4 transition-all duration-300",
                {
                  "z-0 translate-x-[-100%]": isCollapsed,
                  "z-40 translate-x-0": !isCollapsed,
                }
              )}
            >
              <div className="relative flex h-full w-full flex-col gap-y-2 overflow-hidden">
                <ClickableVehicleList
                  vehicles={vehicles}
                  onClick={handleVehicleClick}
                  onCollapse={handleCollapse}
                  loading={isVehicleLoading}
                />
              </div>
            </div>

            <span
              className={cn(
                "absolute left-4 top-3 z-[100] cursor-pointer rounded-full bg-slate-200 p-2 shadow-xl transition-all duration-500 hover:bg-slate-300",
                {
                  "z-0 translate-x-[-100%]": !isCollapsed,
                  "z-40 translate-x-0": isCollapsed,
                }
              )}
              onClick={handleCollapse}
            >
              <ChevronDoubleRightIcon className="h-5 w-5 text-gray-500" />
            </span>

            <div className="relative flex h-[calc(100vh-64px)] flex-1 flex-shrink-0 flex-col overflow-hidden">
              {/* <FloatStatusMenu
              className={cn("hidden [&_div]:transition-all [&_div]:duration-500", {
                "[&_div]:translate-x-[-150%]": isCollapsed,
                "[&_div]:translate-x-0": !isCollapsed,
              })}
              vehicles={vehicles}
              onClick={handleMenuButtonClick}
            /> */}
              {!isLoading && filteredLocations.length === 0 && (
                <div className="absolute left-1/2 top-1/2 z-40 m-auto -translate-x-1/2 -translate-y-1/2 rounded-md bg-gray-900 px-3 py-4 text-sm text-white opacity-50">
                  {t("report.vehicle_position_tracker.location_not_found")}
                </div>
              )}
              <MapContainer className="w-full" style={{ height: "100%" }} center={DEFAULT_CENTER} zoom={12}>
                <MapBoundsUpdater locations={filteredLocations} />
                {filteredLocations.map((vehicle) => (
                  <MapMarker key={vehicle.id} vehicle={vehicle} />
                ))}
              </MapContainer>
              {!isLoadingDriverReports && (
                <>
                  <div
                    className={cn("absolute bottom-0 flex-shrink-0 bg-white px-1 py-1 transition-all duration-300", {
                      "z-0 translate-x-[-100%]": isCollapsedNotice,
                      "z-40 translate-x-0": !isCollapsedNotice,
                      "left-0 w-screen": isCollapsed,
                      "left-[14rem] w-[calc(100%-14rem)]": !isCollapsed,
                    })}
                  >
                    <div className="relative flex w-full flex-row flex-wrap gap-2 overflow-auto">
                      {driverReports.map((report: DriverReportInfo) => (
                        <Badge
                          key={report.id}
                          className={cn("!text-white", {
                            "bg-blue-500":
                              report?.type === OrderTripStatusType.NEW ||
                              !report?.type ||
                              report?.type === OrderTripStatusType.CONFIRMED,
                            "bg-purple-500": report?.type === OrderTripStatusType.PENDING_CONFIRMATION,
                            "bg-yellow-500": report?.type === OrderTripStatusType.WAITING_FOR_PICKUP,
                            "bg-zinc-500": report?.type === OrderTripStatusType.WAREHOUSE_GOING_TO_PICKUP,
                            "bg-cyan-500": report?.type === OrderTripStatusType.WAREHOUSE_PICKED_UP,
                            "bg-pink-500": report?.type === OrderTripStatusType.WAITING_FOR_DELIVERY,
                            "bg-teal-500": report?.type === OrderTripStatusType.DELIVERED,
                            "bg-green-500": report?.type === OrderTripStatusType.COMPLETED,
                            "bg-red-500": report?.type === OrderTripStatusType.CANCELED,
                          })}
                          label={ensureString(report?.name)}
                        />
                      ))}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "absolute bottom-8 right-1 z-40 cursor-pointer rounded-full bg-slate-200 p-2 shadow-xl transition-all duration-500 hover:bg-slate-300",
                      {
                        "translate-y-[80%]": isCollapsedNotice,
                        "translate-y-0": !isCollapsedNotice,
                      }
                    )}
                    onClick={handleCollapseNotice}
                  >
                    {!isCollapsedNotice ? (
                      <ChevronDoubleDownIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <InformationCircleIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
  {
    resource: "vehicle-position-tracker",
    action: ["find"],
  }
);
