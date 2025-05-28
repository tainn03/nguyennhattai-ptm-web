"use client";

import { OrderTripStatusType } from "@prisma/client";
import clsx from "clsx";
import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ReportCalculationDateFlag } from "@/constants/organizationSettingExtended";
import { AnyObject } from "@/types";
import { OrderTripInfo } from "@/types/strapi";
import { calculateDateDifferenceInDays, getClientTimezone, parseDate } from "@/utils/date";

import { TimelineDateCellEvent } from ".";

export type TimelineDateCellProps = {
  orderTrips: Partial<OrderTripInfo>[];
  orderTripDate: string;
  vehicleId: number;
  vehicleNumber: string;
  statusStyles: AnyObject;
  loading?: boolean;
  detailLoading?: boolean;
  vehicleMonitoringDisplayDate?: string;
  onShowMore?: (orderTripDate: string, vehicleNumber: string, orderTripIds: number[]) => void;
};

const TimelineDateCell = ({
  orderTrips,
  loading,
  detailLoading,
  orderTripDate,
  vehicleId,
  vehicleNumber,
  statusStyles,
  vehicleMonitoringDisplayDate,
  onShowMore,
}: TimelineDateCellProps) => {
  const t = useTranslations();
  const [cellHeight, setCellHeight] = useState(1);

  const cellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCellHeight(cellRef.current?.offsetHeight || 1);
    const handleWindowResize = () => {
      setCellHeight(cellRef.current?.offsetHeight || 1);
    };
    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, []);

  // Filter order in the same day as the selected date
  const timelineDate = useMemo(() => parseDate(orderTripDate, "DD-MM-YYYY"), [orderTripDate]);

  const orderTripList = useMemo(() => {
    const vehicleMonitoringDisplayDateFlag = vehicleMonitoringDisplayDate as ReportCalculationDateFlag;
    return orderTrips.filter((item) => {
      // Get statuses and pickup date from the item object
      const statuses = item.statuses;
      let dateCompare = vehicleMonitoringDisplayDateFlag ? item[vehicleMonitoringDisplayDateFlag] : item.pickupDate;

      // Check if statuses exist and if the length is greater than 3
      if (
        statuses &&
        statuses?.length > 3 &&
        vehicleMonitoringDisplayDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
      ) {
        // Find the first status with type 'WAITING_FOR_PICKUP'
        const firstWaitingForPickup = statuses.find(
          (itemStatus) => itemStatus.type === OrderTripStatusType.WAITING_FOR_PICKUP
        );

        // If such status is found, update dateCompare to its createdAt date
        if (firstWaitingForPickup?.createdAt) {
          dateCompare = firstWaitingForPickup.createdAt;
        }
      }

      // Parse the date obtained from the previous step into a standardized format
      let dateCompareTimeZone = null;
      if (dateCompare) {
        const clientTimezone = getClientTimezone();
        const stringDateTimeZone = formatInTimeZone(dateCompare, clientTimezone, "yyyy/MM/dd HH:mm:ss");
        dateCompareTimeZone = parseDate(stringDateTimeZone, "YYYY-MM-DD");
      }

      const dataOrderTripDate = parseDate(dateCompareTimeZone, "YYYY-MM-DD");

      // Check if dataOrderTripDate and timelineDate are not null,
      // and if the difference between them is 0 days,
      // and if the item's vehicle id matches the provided vehicleId
      if (
        dataOrderTripDate !== null &&
        timelineDate !== null &&
        calculateDateDifferenceInDays(dataOrderTripDate, timelineDate) === 0 &&
        item.vehicle?.id === vehicleId
      ) {
        // If all conditions are met, return the item
        return item;
      }
    });
  }, [vehicleMonitoringDisplayDate, orderTrips, timelineDate, vehicleId]);

  // Event limit
  const eventLimit = useMemo(() => {
    if (cellHeight >= 100) {
      return Math.floor(cellHeight / 34) - 1;
    }
    return 2;
  }, [cellHeight]);

  const handleShowMoreClick = useCallback(() => {
    const orderTripIds = orderTripList.map((orderStrip) => orderStrip.id);
    onShowMore && onShowMore(orderTripDate, vehicleNumber, orderTripIds as number[]);
  }, [onShowMore, orderTripDate, orderTripList, vehicleNumber]);

  return (
    <div ref={cellRef} className={clsx("rbc-day-bg cursor-pointer bg-white px-1")} onClick={handleShowMoreClick}>
      {/* Cell header */}
      {loading ? (
        <div className="flex-col gap-[2px]">
          <TimelineDateCellEvent loading className="gap-[2px] py-[2.5px]" />
          <div className="mt-[2px] h-2.5 w-1/2 rounded-full bg-gray-300 dark:bg-gray-400" />
        </div>
      ) : (
        <div className="flex flex-col gap-[2px]">
          {orderTripList.slice(0, eventLimit).map((item) => (
            <TimelineDateCellEvent
              key={item.id}
              orderTrip={item as Partial<OrderTripInfo> & Record<string, string>}
              loading={detailLoading}
              statusStyles={statusStyles}
            />
          ))}

          {/* Render the show more button */}
          {eventLimit < orderTripList.length && (
            <div className="leading-3">
              <button type="button" className="max-w-[90%] truncate text-xs font-normal text-gray-400">
                {t("order_plan.count_order", {
                  count: orderTripList.length - eventLimit,
                })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineDateCell;
