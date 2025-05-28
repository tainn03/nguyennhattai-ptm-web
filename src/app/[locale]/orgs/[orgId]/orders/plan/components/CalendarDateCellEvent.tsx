"use client";

import { CustomerType, OrderStatusType, RouteType } from "@prisma/client";
import clsx from "clsx";
import { useMemo } from "react";

import { NumberLabel } from "@/components/atoms";
import { OrderInfo, OrderStatusInfo } from "@/types/strapi";
import { joinNonEmptyStrings } from "@/utils/string";

const statusStyles = {
  [OrderStatusType.NEW]: "border-blue-700 bg-blue-50 text-blue-700 ring-blue-700/20",
  [OrderStatusType.RECEIVED]: "bg-purple-50 text-purple-700 ring-purple-700/10",
  [OrderStatusType.IN_PROGRESS]: "border-yellow-600 bg-yellow-50 text-yellow-600 ring-yellow-600/20",
  [OrderStatusType.COMPLETED]: "border-green-600 bg-green-50 text-green-600 ring-green-600/20",
  [OrderStatusType.CANCELED]: "border-red-500 bg-red-50 text-red-500 ring-red-500/20",
  DRAFT: "border-gray-500 bg-blue-50 text-gray-500 ring-gray-500/20",
};

type CalendarDateCellEventProps = {
  order?: Partial<OrderInfo>;
  loading?: boolean;
  className?: string;
};

const CalendarDateCellEvent = ({ order, loading, className }: CalendarDateCellEventProps) => {
  // Current status of an order
  const currentStatus = useMemo(() => {
    // Check if the order is a draft or has no statuses
    if (order?.isDraft || order?.statuses?.length === 0) {
      return null;
    }

    // Find the latest status based on createdAt date
    const latestStatus = order?.statuses?.reduce((prev, current) => {
      return (prev as OrderStatusInfo).createdAt > (current as OrderStatusInfo).createdAt ? prev : current;
    });
    return latestStatus?.type;
  }, [order]);

  // Customer information
  const customerInfo = useMemo(() => {
    const customer = order?.customer;
    if (!customer) {
      return "";
    }
    if (customer.type === CustomerType.CASUAL) {
      return customer.name;
    } else {
      return joinNonEmptyStrings([customer.code, customer.name], " - ");
    }
  }, [order]);

  // Route information
  const routeInfo = useMemo(() => {
    const route = order?.route;
    if (route && route.type === RouteType.FIXED) {
      return joinNonEmptyStrings([route.code, route.name], " - ");
    }
    return "";
  }, [order]);

  return (
    <div
      className={clsx(
        "flex flex-col rounded-md border border-opacity-20 px-1 py-[1px] text-xs",
        statusStyles[currentStatus || "DRAFT"],
        className
      )}
    >
      <div
        className={clsx("truncate whitespace-nowrap text-xs leading-[15px]", {
          "flex flex-row items-center justify-center gap-1": loading,
        })}
        title={customerInfo}
      >
        {order?.code && <span className="font-semibold">{order.code}</span>}
        {loading ? (
          <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-300 dark:bg-gray-600" />
        ) : (
          <>
            {customerInfo && <span className="font-normal before:mr-[2px] before:content-[':']">{customerInfo}</span>}
          </>
        )}
      </div>

      {loading ? (
        <div className="my-[1px] h-2.5 w-full animate-pulse rounded-full bg-gray-300 dark:bg-gray-600" />
      ) : (
        <div className="min-h-[12px] truncate whitespace-nowrap text-[11px] leading-3">
          {order?.weight && (
            <span className="font-semibold">
              <NumberLabel value={Number(order.weight)} unit={order.unit?.code} />
            </span>
          )}
          {routeInfo && (
            <span
              title={routeInfo}
              className={clsx("font-normal", {
                "before:mr-[2px] before:content-[',']": order?.weight,
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

export default CalendarDateCellEvent;
