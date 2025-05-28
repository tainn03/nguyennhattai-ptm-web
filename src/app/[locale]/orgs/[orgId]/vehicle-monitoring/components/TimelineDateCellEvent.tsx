"use client";

import { CustomerType, RouteType } from "@prisma/client";
import clsx from "clsx";
import { memo, useMemo } from "react";

import { NumberLabel } from "@/components/atoms";
import { AnyObject } from "@/types";
import { OrderTripInfo } from "@/types/strapi";
import { joinNonEmptyStrings } from "@/utils/string";

type TimelineDateCellEventProps = {
  orderTrip?: Partial<OrderTripInfo> & Record<string, string>;
  loading?: boolean;
  className?: string;
  statusStyles?: AnyObject;
  onClick?: () => void;
};

const TimelineDateCellEvent = ({
  orderTrip,
  loading,
  className,
  statusStyles,
  onClick,
}: TimelineDateCellEventProps) => {
  // Current status of an order
  const currentStatus = useMemo(() => {
    // Check if the order is a draft or has no statuses
    return orderTrip?.lastStatusType || "DRAFT";
  }, [orderTrip]);

  // Customer information
  const customerInfo = useMemo(() => {
    if (!orderTrip?.customerName) {
      return "";
    }

    return orderTrip.customerType === CustomerType.CASUAL
      ? orderTrip.customerName
      : joinNonEmptyStrings([orderTrip.customerCode, orderTrip.customerName], " - ");
  }, [orderTrip]);

  // Route information
  const routeInfo = useMemo(() => {
    const routeCode = orderTrip?.routeCode;
    const routeName = orderTrip?.routeName;
    const routeType = orderTrip?.routeType;

    if (routeType === RouteType.FIXED) {
      return joinNonEmptyStrings([routeCode, routeName], " - ");
    }
    return "";
  }, [orderTrip]);

  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex cursor-pointer flex-col rounded-md border border-opacity-20 px-1 py-[1px] text-xs",
        statusStyles ? statusStyles[currentStatus] : "",
        className
      )}
    >
      <div
        className={clsx("truncate whitespace-nowrap text-xs leading-[15px]", {
          "flex flex-row items-center justify-center gap-1": loading,
        })}
        title={customerInfo}
      >
        {orderTrip?.code && <span className="font-semibold">{orderTrip?.code}</span>}
        {loading ? (
          <div className="h-2.5 w-full rounded-full bg-gray-300 dark:bg-gray-600" />
        ) : (
          <>
            {customerInfo && (
              <span className="w-full font-normal before:mr-[2px] before:content-[':']">{customerInfo}</span>
            )}
          </>
        )}
      </div>

      {loading ? (
        <div className="my-[1px] h-2.5 w-full rounded-full bg-gray-300 dark:bg-gray-600" />
      ) : (
        <div className="min-h-[12px] w-full truncate whitespace-nowrap text-[11px] leading-3">
          {orderTrip?.weight && (
            <span className="font-semibold">
              <NumberLabel value={Number(orderTrip?.weight)} unit={orderTrip?.unitName} />
            </span>
          )}
          {routeInfo && (
            <span
              title={routeInfo}
              className={clsx("font-normal", {
                "before:mr-[2px] before:content-[',']": orderTrip?.weight,
              })}
            >
              {routeInfo}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(TimelineDateCellEvent);
