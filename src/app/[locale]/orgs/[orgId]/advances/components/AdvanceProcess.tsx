import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AdvanceStatus } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

const baseSteps = [
  {
    value: AdvanceStatus.PENDING,
    label: "advance.status_pending",
  },
  {
    value: AdvanceStatus.PAYMENT,
    label: "advance.status_paid",
  },
  {
    value: AdvanceStatus.REJECTED,
    label: "advance.status_rejected",
  },
];

type currentStatus = {
  currentStatus: AdvanceStatus;
};

const AdvanceProcess = ({ currentStatus }: currentStatus) => {
  const t = useTranslations();

  const advanceSteps = useMemo(() => {
    if (currentStatus === AdvanceStatus.REJECTED) {
      return baseSteps.filter((item) => item.value !== AdvanceStatus.PAYMENT);
    } else {
      return baseSteps.filter((item) => item.value !== AdvanceStatus.REJECTED);
    }
  }, [currentStatus]);

  const stepCompleted = useCallback(
    (currentIndex: number) => advanceSteps.findIndex(({ value }) => value === currentStatus) > currentIndex,
    [advanceSteps, currentStatus]
  );

  return (
    <nav aria-label="Progress" className="px-4 py-4 sm:px-6">
      <ol role="list" className="flex items-center">
        {advanceSteps.map((item, index) => (
          <li
            key={index}
            className={clsx("relative", {
              "flex-1": index < advanceSteps.length - 1,
            })}
          >
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div
                className={clsx("h-0.5 w-full", {
                  "bg-blue-700": currentStatus === AdvanceStatus.PAYMENT,
                  "bg-red-700": currentStatus === AdvanceStatus.REJECTED,
                  "bg-gray-200": !stepCompleted(index),
                })}
              />
            </div>
            <div
              className={clsx("relative flex h-5 w-5 items-center justify-center rounded-full", {
                "border-2 border-gray-300 bg-white": item.value !== currentStatus && !stepCompleted(index),
                "border-2 border-blue-700 bg-white":
                  item.value === currentStatus && currentStatus === AdvanceStatus.PENDING,
                "bg-blue-700": stepCompleted(index) || currentStatus === AdvanceStatus.PAYMENT,
                "bg-red-600": currentStatus === AdvanceStatus.REJECTED,
              })}
            >
              {(stepCompleted(index) || currentStatus === AdvanceStatus.PAYMENT) && (
                <CheckIcon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              )}
              {item.value === currentStatus && currentStatus === AdvanceStatus.REJECTED && (
                <XMarkIcon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              )}
              {item.value === currentStatus && currentStatus === AdvanceStatus.PENDING && (
                <span className="h-2.5 w-2.5 rounded-full bg-blue-700" aria-hidden="true" />
              )}
              <div className="absolute -bottom-6">
                <span className="text-xs font-medium text-gray-500">{t(item.label)}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default AdvanceProcess;
