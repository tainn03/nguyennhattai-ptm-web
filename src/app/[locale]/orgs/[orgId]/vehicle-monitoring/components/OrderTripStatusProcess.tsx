"use client";

import { CheckIcon } from "@heroicons/react/24/outline";
import { OrderTripStatusType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { DateTimeLabel, Spinner } from "@/components/atoms";
import { useAuth, useDriverReportsTripStatusByWorkflow } from "@/hooks";
import { OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";

const TIME_PLACEHOLDER = "--/--/---- --:--:--";

type OrderTripStatusProcessProps = {
  orderTrip: Partial<OrderTripInfo>;
};

const OrderTripStatusProcess = ({ orderTrip }: OrderTripStatusProcessProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();
  const { driverReports, isLoading } = useDriverReportsTripStatusByWorkflow({
    organizationId: orgId,
    workflowId: orderTrip?.workflow?.id,
  });

  const tripSteps = useMemo(
    () => driverReports.filter((step) => step.type !== OrderTripStatusType.CANCELED),
    [driverReports]
  );

  const currentStatus = useMemo(
    () =>
      (orderTrip?.statuses || [])
        .filter((item) => item.type !== OrderTripStatusType.CANCELED)
        .reduce((prev, current) => {
          return (prev as OrderTripStatusInfo).createdAt > (current as OrderTripStatusInfo).createdAt ? prev : current;
        }),
    [orderTrip.statuses]
  );

  const findTripStatusDate = useCallback(
    (reportId: number) =>
      (orderTrip.statuses || []).find(({ driverReport }) => equalId(driverReport?.id, reportId))?.createdAt,
    [orderTrip?.statuses]
  );

  const checkStepCompletion = useCallback(
    (reportId: number): boolean => !!findTripStatusDate(reportId),
    [findTripStatusDate]
  );

  const checkActionSequence = useCallback(
    (currentIndex: number) =>
      tripSteps.findIndex(({ id }) => equalId(id, currentStatus.driverReport?.id)) > currentIndex,
    [currentStatus.driverReport?.id, tripSteps]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex justify-center max-sm:pb-4 xl:pb-10">
      <nav aria-label="Progress" className="w-full max-w-6xl py-4 xl:px-6">
        <ol role="list" className="flex flex-col xl:flex-row xl:items-center">
          {tripSteps.map((item, index) => (
            <li
              key={item.type}
              className={clsx("relative", {
                "flex-1 max-xl:pb-10": index < tripSteps.length - 1,
                hidden: item.type === OrderTripStatusType.PENDING_CONFIRMATION,
              })}
            >
              <div className="absolute inset-0 flex items-center justify-center max-xl:w-8 xl:h-8" aria-hidden="true">
                <div
                  className={clsx("h-full w-0.5 xl:h-0.5 xl:w-full", {
                    "bg-blue-700":
                      checkActionSequence(index) && currentStatus.type !== OrderTripStatusType.PENDING_CONFIRMATION,
                    "bg-gray-200":
                      !checkActionSequence(index) || currentStatus.type === OrderTripStatusType.PENDING_CONFIRMATION,
                    hidden: index === tripSteps.length - 1,
                  })}
                />
              </div>
              <div className="relative min-w-[9.25rem] max-xl:flex max-xl:items-start">
                <div
                  className={clsx("relative flex h-8 w-8 items-center justify-center rounded-full", {
                    "border-2 border-gray-300 bg-white": !checkStepCompletion(item.id),
                    "border-2 border-blue-700 bg-white":
                      checkStepCompletion(item.id) &&
                      equalId(currentStatus.driverReport?.id, item.id) &&
                      currentStatus.type !== OrderTripStatusType.COMPLETED,
                    "bg-blue-700":
                      (checkStepCompletion(item.id) && !equalId(currentStatus.driverReport?.id, item.id)) ||
                      currentStatus.type === OrderTripStatusType.COMPLETED,
                  })}
                >
                  {(checkStepCompletion(item.id) && !equalId(currentStatus.driverReport?.id, item.id)) ||
                  currentStatus.type === OrderTripStatusType.COMPLETED ? (
                    <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                  ) : (
                    <span
                      className={clsx("h-2.5 w-2.5 rounded-full", {
                        "bg-blue-700": checkStepCompletion(item.id),
                        "bg-gray-300": !checkStepCompletion(item.id) && checkActionSequence(index),
                      })}
                      aria-hidden="true"
                    />
                  )}
                  <div className="absolute top-8 hidden min-w-0 flex-col items-center justify-center whitespace-nowrap xl:flex">
                    <span
                      className={clsx("mt-1 text-center text-xs font-medium", {
                        "text-gray-900": checkStepCompletion(item.id),
                        "text-gray-500": !checkStepCompletion(item.id),
                      })}
                    >
                      {t(item.name)}
                    </span>
                    <span className="text-center text-xs text-gray-500">
                      <DateTimeLabel
                        value={findTripStatusDate(item.id)}
                        type="datetime"
                        emptyLabel={TIME_PLACEHOLDER}
                      />
                    </span>
                  </div>
                </div>
                <div className="-mt-1 ml-4 flex min-w-0 flex-col justify-center whitespace-nowrap xl:hidden">
                  <span
                    className={clsx("text-xs font-medium", {
                      "text-gray-900": checkStepCompletion(item.id),
                      "text-gray-500": !checkStepCompletion(item.id),
                    })}
                  >
                    {t(item.name)}
                  </span>
                  <span className="text-xs text-gray-500">
                    <DateTimeLabel value={findTripStatusDate(item.id)} type="datetime" emptyLabel={TIME_PLACEHOLDER} />
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

export default OrderTripStatusProcess;
