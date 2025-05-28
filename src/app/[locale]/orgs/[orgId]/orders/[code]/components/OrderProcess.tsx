import { CheckIcon } from "@heroicons/react/24/outline";
import { OrderStatusType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { DateTimeLabel } from "@/components/atoms";
import { orderSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import { useOrderStatuses } from "@/hooks";
import { OrderStatusInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";

const TIME_PLACEHOLDER = "--/--/---- --:--:--";

type OrderProcessProps = Pick<OrgPageProps, "orgId"> & {
  code: string;
};

const OrderProcess = ({ code, orgId }: OrderProcessProps) => {
  const t = useTranslations();
  const { order } = useOrderStatuses({ organizationId: orgId, code });

  const currentStatus = useMemo(() => {
    if (order?.isDraft || order?.statuses?.length === 0) {
      return null;
    }

    const latestStatus = order?.statuses
      .filter((item) => item.type !== OrderStatusType.CANCELED)
      .reduce((prev, current) => {
        return (prev as OrderStatusInfo).createdAt > (current as OrderStatusInfo).createdAt ? prev : current;
      });
    return latestStatus?.type;
  }, [order?.isDraft, order?.statuses]);

  const [isDraft, isCanceled] = useMemo(
    () => [order?.isDraft, !!order?.statuses?.some((item) => item.type === OrderStatusType.CANCELED)],
    [order?.isDraft, order?.statuses]
  );

  const stepCompleted = useCallback(
    (currentIndex: number) => orderSteps.findIndex(({ value }) => value === currentStatus) > currentIndex,
    [currentStatus]
  );

  const getOrderStatusDate = useCallback(
    (step: OrderStatusType) => {
      const date = order?.statuses?.find((item) => item.type === step)?.createdAt;
      return date;
    },
    [order?.statuses]
  );

  return (
    <div className="flex justify-center pl-3 max-sm:pb-4 sm:-mt-10 md:pb-10 md:pl-0">
      <nav aria-label="Progress" className="w-full max-w-2xl py-4 md:px-6">
        <ol role="list" className="flex flex-col md:flex-row md:items-center">
          {orderSteps.map((item, index) => (
            <li
              key={item.value}
              className={clsx("relative", {
                "flex-1 max-md:pb-10": index < orderSteps.length - 1,
              })}
            >
              <div className="absolute inset-0 flex items-center justify-center max-md:w-8 md:h-8" aria-hidden="true">
                <div
                  className={clsx("h-full w-0.5 md:h-0.5 md:w-full", {
                    "bg-blue-700": currentStatus !== OrderStatusType.NEW && !isCanceled,
                    "bg-gray-200": !stepCompleted(index) || isCanceled,
                    hidden: index === orderSteps.length - 1,
                  })}
                />
              </div>
              <div className="relative max-md:flex max-md:items-start">
                <div
                  className={clsx("relative flex h-8 w-8 items-center justify-center rounded-full", {
                    "border-2 border-gray-300 bg-white":
                      (item.value !== currentStatus && !stepCompleted(index)) ||
                      (item.value === currentStatus && isCanceled),
                    "border-2 border-blue-700 bg-white":
                      item.value === currentStatus && currentStatus !== OrderStatusType.COMPLETED && !isCanceled,
                    "bg-gray-300": (stepCompleted(index) || currentStatus === OrderStatusType.COMPLETED) && isCanceled,
                    "bg-blue-700": (stepCompleted(index) || currentStatus === OrderStatusType.COMPLETED) && !isCanceled,
                  })}
                >
                  {stepCompleted(index) || currentStatus === OrderStatusType.COMPLETED ? (
                    <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                  ) : (
                    <span
                      className={clsx("h-2.5 w-2.5 rounded-full", {
                        "bg-gray-300":
                          (item.value === OrderStatusType.NEW && isDraft) ||
                          (item.value === currentStatus && isCanceled),
                        "bg-blue-700": item.value === currentStatus && !isCanceled,
                      })}
                      aria-hidden="true"
                    />
                  )}
                  <div className="absolute top-8 hidden min-w-0 flex-col items-center justify-center whitespace-nowrap md:flex">
                    <span
                      className={clsx("mt-1 text-center text-sm font-medium", {
                        "text-gray-900": stepCompleted(index) || currentStatus === OrderStatusType.COMPLETED,
                        "text-gray-500": !stepCompleted(index),
                      })}
                    >
                      {t(item.label)}
                    </span>
                    <span className="text-center text-sm text-gray-500">
                      <DateTimeLabel
                        value={getOrderStatusDate(item.value)}
                        type="datetime"
                        emptyLabel={TIME_PLACEHOLDER}
                      />
                    </span>
                  </div>
                </div>
                <div className="-mt-1 ml-4 flex min-w-0 flex-col justify-center whitespace-nowrap md:hidden">
                  <span
                    className={clsx("text-sm font-medium", {
                      "text-gray-900": stepCompleted(index) || currentStatus === OrderStatusType.COMPLETED,
                      "text-gray-500": !stepCompleted(index),
                    })}
                  >
                    {t(item.label)}
                  </span>
                  <span className="text-sm text-gray-500">
                    <DateTimeLabel
                      value={getOrderStatusDate(item.value)}
                      type="datetime"
                      emptyLabel={TIME_PLACEHOLDER}
                    />
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default OrderProcess;
