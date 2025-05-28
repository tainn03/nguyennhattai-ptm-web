"use client";

import clsx from "clsx";
import moment, { MomentInput } from "moment";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateCellWrapperProps } from "react-big-calendar";

import { OrderInfo } from "@/types/strapi";
import { formatDate } from "@/utils/date";

import { CalendarDateCellEvent } from ".";

export type AnchorPoint = {
  date: Date;
  x: number;
  y: number;
};

export type CalendarDateCellProps = DateCellWrapperProps & {
  orderPlans: Partial<OrderInfo>[];
  loading?: boolean;
  detailLoading?: boolean;
  calendarDate: string | Date;
  onOpenMenu?: (_event: AnchorPoint) => void;
  onShowMore?: (_date: Date) => void;
  onDateCellClick?: (_date: Date) => void;
};

const CalendarDateCell = ({
  value,
  orderPlans,
  loading,
  detailLoading,
  calendarDate,
  onOpenMenu,
  onShowMore,
  onDateCellClick,
}: CalendarDateCellProps) => {
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

  /**
   * Checks if two dates have the same date part (ignores time).
   *
   * @param {MomentInput} date1 - The first date.
   * @param {MomentInput} date2 - The second date.
   * @returns {boolean} - Returns true if both dates have the same date part, otherwise false.
   */
  const isSameDate = useCallback((date1: MomentInput, date2: MomentInput) => {
    // Format both dates to "YYYY-MM-DD" and compare
    const dateStr1 = moment(date1).format("YYYY-MM-DD");
    const dateStr2 = moment(date2).format("YYYY-MM-DD");
    return dateStr1 === dateStr2;
  }, []);

  // Filter order in the same day as the selected date
  const orderList = useMemo(
    () => orderPlans.filter((item) => isSameDate(value, item.orderDate)),
    [isSameDate, orderPlans, value]
  );

  // Check if the selected date is today
  const isToday = useMemo(() => isSameDate(value, new Date()), [value, isSameDate]);

  // Format the current date to "YYYY-MM"
  const currentMonth = useMemo(() => moment(value).format("YYYY-MM"), [value]);

  // Check if the selected date is in a different month than the calendar's month
  const isOtherMonth = currentMonth < calendarDate || currentMonth > calendarDate;

  // Event limit
  const eventLimit = useMemo(() => {
    if (cellHeight >= 100) {
      return Math.floor(cellHeight / 34) - 1;
    }
    return 1;
  }, [cellHeight]);

  /**
   * Handle the context menu event on a date cell.
   *
   * @param {React.MouseEvent<HTMLDivElement, MouseEvent>} event - The mouse event.
   * @param {Date} value - The selected date value.
   */
  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      // Prevent the default context menu behavior
      event.preventDefault();

      // Open context menu
      if (onOpenMenu) {
        onOpenMenu({
          date: value,
          x: event.pageX,
          y: event.pageY + 35,
        });
      }
    },
    [onOpenMenu, value]
  );

  const handleDateCellClick = useCallback(() => {
    onDateCellClick && onDateCellClick(value);
  }, [onDateCellClick, value]);

  const handleShowMoreClick = useCallback(() => {
    onShowMore && onShowMore(value);
  }, [onShowMore, value]);

  return (
    <div
      ref={cellRef}
      className={clsx("rbc-day-bg z-10 max-w-[14.2857%] basis-[14.2857%] px-1", {
        "bg-white": !isOtherMonth && !isToday,
        "bg-gray-100": isOtherMonth,
        "bg-blue-100": isToday,
      })}
      onClick={handleDateCellClick}
      onContextMenu={handleContextMenu}
    >
      {/* Cell header */}
      <div
        className={clsx("text-right text-base leading-5", {
          "text-gray-400": isOtherMonth,
        })}
      >
        {formatDate(value, "DD")}
      </div>

      {loading ? (
        <div className="flex animate-pulse flex-col gap-[2px]">
          <CalendarDateCellEvent loading className="gap-[2px] py-[2.5px]" />
          <div className="mt-[2px] h-2.5 w-1/2 rounded-full bg-gray-300 dark:bg-gray-400" />
        </div>
      ) : (
        <div className="flex flex-col gap-[2px]">
          {orderList.slice(0, eventLimit).map((item) => (
            <CalendarDateCellEvent key={item.id} order={item} loading={detailLoading} />
          ))}

          {/* Render the show more button */}
          {eventLimit < orderList.length && (
            <div className="leading-3">
              <button
                type="button"
                onClick={handleShowMoreClick}
                className="max-w-[90%] truncate text-xs font-normal text-gray-400"
              >
                {t("order_plan.count_order", {
                  count: orderList.length - eventLimit,
                })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarDateCell;
