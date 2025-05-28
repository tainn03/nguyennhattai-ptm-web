import { OrderTripStatusType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { IoNotificationsOffOutline } from "react-icons/io5";
import { LuCalendarClock } from "react-icons/lu";
import { TbBellCheck } from "react-icons/tb";

import { OrderTripInfo } from "@/types/strapi";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/twcn";

type OrderTripDriverNotificationStatusProps = {
  trip: Partial<OrderTripInfo>;
};

const OrderTripDriverNotificationStatus = ({ trip }: OrderTripDriverNotificationStatusProps) => {
  const t = useTranslations();

  const formatStatusSchedule = useMemo(() => {
    const statuses = trip?.statuses || [];
    if (statuses.length > 1) {
      const pendingStatus = statuses.filter((item) => item.type === OrderTripStatusType.PENDING_CONFIRMATION);

      return {
        tooltip: t("order.vehicle_dispatch.vehicle_dispatch_schedule.tooltip.send", {
          date: formatDate(pendingStatus[0].createdAt, t("common.format.datetime_no_second")),
        }),
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        icon: <TbBellCheck className="h-4 w-4" />,
        content:
          pendingStatus.length > 1
            ? t("order.vehicle_dispatch.vehicle_dispatch_schedule.send_count", {
                count: pendingStatus.length,
              })
            : t("order.vehicle_dispatch.vehicle_dispatch_schedule.send"),
      };
    }

    const driverNotificationScheduledAt = trip.driverNotificationScheduledAt;
    if (driverNotificationScheduledAt) {
      return {
        tooltip: t("order.vehicle_dispatch.vehicle_dispatch_schedule.tooltip.schedule", {
          date: formatDate(driverNotificationScheduledAt, t("common.format.datetime_no_second")),
        }),
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        icon: <LuCalendarClock className="h-4 w-4" />,
        content: t("order.vehicle_dispatch.vehicle_dispatch_schedule.schedule"),
      };
    }

    return {
      tooltip: t("order.vehicle_dispatch.vehicle_dispatch_schedule.tooltip.not_send"),
      color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      icon: <IoNotificationsOffOutline className="h-4 w-4" />,
      content: t("order.vehicle_dispatch.vehicle_dispatch_schedule.not_send"),
    };
  }, [t, trip?.driverNotificationScheduledAt, trip?.statuses]);

  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content={formatStatusSchedule.tooltip}
      className={cn(
        "me-2 flex w-min items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        formatStatusSchedule.color
      )}
    >
      {formatStatusSchedule.icon}
      {formatStatusSchedule.content}
    </div>
  );
};

export default OrderTripDriverNotificationStatus;
