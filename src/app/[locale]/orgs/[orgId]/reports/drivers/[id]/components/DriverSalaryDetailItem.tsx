import clsx, { ClassValue } from "clsx";
import { useTranslations } from "next-intl";
import { ReactNode } from "react";

import { InfoBox, NumberLabel } from "@/components/atoms";

type DriverSalaryDetailItemProps = {
  label: ReactNode;
  subLabel?: ReactNode;
  value?: number | string | null;
  color?: "secondary" | "primary" | "error";
  className?: ClassValue;
  valueClassName?: ClassValue;
  loading?: boolean;
};

const DriverSalaryDetailItem = ({
  label,
  subLabel,
  value,
  color = "secondary",
  className,
  valueClassName,
  loading,
}: DriverSalaryDetailItemProps) => {
  const t = useTranslations();

  return loading ? (
    <div className="max-w-lg py-4">
      <div className="flex w-full items-center space-x-2">
        <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-2.5 w-40 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>
    </div>
  ) : (
    <div className={clsx("flex items-center justify-between gap-x-6 py-4 text-gray-700", className)}>
      <InfoBox className="text-sm font-medium leading-6" label={label} subLabel={subLabel} />
      <div
        className={clsx("text-sm", valueClassName, {
          "text-red-600": !!value && color === "error",
          "text-blue-700": !!value && color === "primary",
        })}
      >
        <NumberLabel value={value} type="currency" emptyLabel={t("common.empty")} />
      </div>
    </div>
  );
};

export default DriverSalaryDetailItem;
