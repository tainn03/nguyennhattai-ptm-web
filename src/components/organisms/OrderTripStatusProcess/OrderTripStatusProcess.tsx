"use client";

import { CheckIcon } from "@heroicons/react/24/outline";
import { OrderTripStatusType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { memo, useCallback, useMemo, useState } from "react";

import { DateTimeLabel } from "@/components/atoms";
import { DriverReportInfo, OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { getOrderTripStatusFlags } from "@/utils/order";

const TIME_PLACEHOLDER = "--/--/---- --:--:--";

type OrderTripStatusProcessProps = {
  orderTrip: Partial<OrderTripInfo>;
  driverReports: DriverReportInfo[];
  loading: boolean;
  onSelectedStep: (targetStep: DriverReportInfo) => void;
};

const OrderTripStatusProcess = ({ orderTrip, driverReports, loading, onSelectedStep }: OrderTripStatusProcessProps) => {
  const t = useTranslations();
  const [currentOrderTrip, setCurrentOrderTrip] = useState(orderTrip);

  const tripSteps = useMemo(
    () => driverReports.filter((step) => step.type !== OrderTripStatusType.CANCELED),
    [driverReports]
  );

  const { currentStatus } = useMemo(() => getOrderTripStatusFlags(orderTrip, true), [orderTrip]);

  const findTripStatusDate = useCallback(
    (reportId: number) =>
      [...(currentOrderTrip?.statuses || [])].find(({ driverReport }) => equalId(driverReport?.id, reportId))
        ?.createdAt,
    [currentOrderTrip?.statuses]
  );

  const checkStepCompletion = useCallback(
    (reportId: number): boolean => !!findTripStatusDate(reportId),
    [findTripStatusDate]
  );

  const checkActualStepCompletion = useCallback(
    (reportId: number): boolean => {
      const currentIndex = tripSteps.findIndex(({ id }) => equalId(id, currentStatus?.driverReport?.id));
      const stepIndex = tripSteps.findIndex(({ id }) => equalId(id, reportId));
      if (stepIndex <= currentIndex) return true;
      return false;
    },
    [currentStatus?.driverReport?.id, tripSteps]
  );

  const checkActionSequence = useCallback(
    (currentIndex: number) =>
      tripSteps.findIndex(({ id }) => equalId(id, currentStatus?.driverReport?.id)) > currentIndex,
    [currentStatus?.driverReport?.id, tripSteps]
  );

  const handleOpenConfirmModal = useCallback(
    (step: DriverReportInfo) => () => {
      onSelectedStep(step);
    },
    [onSelectedStep]
  );

  const handleOnMouseEnter = useCallback(
    (step: DriverReportInfo) => () => {
      const orderTripStatusList: Partial<OrderTripStatusInfo>[] = [];
      tripSteps.forEach((item) => {
        if (item.displayOrder && step.displayOrder && item.displayOrder <= step.displayOrder) {
          const trip = (orderTrip?.statuses || []).find((status) => equalId(status.driverReport?.id, item.id));
          if (trip?.id) {
            orderTripStatusList.push(trip);
          } else {
            const date = new Date();
            date.setSeconds(date.getSeconds() + step.displayOrder);
            orderTripStatusList.push({ driverReport: item, createdAt: date });
          }
        }
      });
      setCurrentOrderTrip({ ...orderTrip, statuses: orderTripStatusList });
    },
    [orderTrip, tripSteps]
  );

  const handleOnMouseLeave = useCallback(() => {
    setCurrentOrderTrip(orderTrip);
  }, [orderTrip]);

  return (
    <>
      <div className="flex min-w-[1104px] justify-center max-sm:pb-4 xl:pb-10">
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
                        checkActionSequence(index) && currentStatus?.type !== OrderTripStatusType.PENDING_CONFIRMATION,
                      "bg-gray-200":
                        !checkActionSequence(index) || currentStatus?.type === OrderTripStatusType.PENDING_CONFIRMATION,
                      hidden: index === tripSteps.length - 1,
                    })}
                  />
                </div>
                <div className="relative min-w-[9.25rem] max-xl:flex max-xl:items-start">
                  <div
                    onMouseEnter={checkActualStepCompletion(item.id) || loading ? undefined : handleOnMouseEnter(item)}
                    onMouseLeave={checkActualStepCompletion(item.id) || loading ? undefined : handleOnMouseLeave}
                    onClick={checkActualStepCompletion(item.id) || loading ? undefined : handleOpenConfirmModal(item)}
                    className={clsx("relative flex h-8 w-8 items-center justify-center rounded-full", {
                      "border-2 border-gray-300 bg-white": !checkStepCompletion(item.id),
                      "border-2 border-blue-700 bg-white":
                        checkStepCompletion(item.id) &&
                        equalId(currentStatus?.driverReport?.id, item.id) &&
                        currentStatus?.type !== OrderTripStatusType.COMPLETED,
                      "bg-blue-700":
                        (checkStepCompletion(item.id) && !equalId(currentStatus?.driverReport?.id, item.id)) ||
                        currentStatus?.type === OrderTripStatusType.COMPLETED,
                      "cursor-pointer": !checkActualStepCompletion(item.id) && !loading,
                    })}
                  >
                    {(checkStepCompletion(item.id) && !equalId(currentStatus?.driverReport?.id, item.id)) ||
                    currentStatus?.type === OrderTripStatusType.COMPLETED ? (
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
                    <div className="absolute top-8 -mt-1.5 hidden min-w-0 flex-col items-center justify-center whitespace-nowrap pt-1.5 xl:flex">
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
                      <DateTimeLabel
                        value={findTripStatusDate(item.id)}
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
    </>
  );
};

export default memo(OrderTripStatusProcess);
