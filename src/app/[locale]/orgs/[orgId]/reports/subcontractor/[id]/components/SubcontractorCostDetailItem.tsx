import clsx, { ClassValue } from "clsx";
import { useTranslations } from "next-intl";
import { ReactNode } from "react";

import { InfoBox, NumberLabel } from "@/components/atoms";

type SubcontractorCostDetailItemProps = {
  label: ReactNode;
  subLabel?: ReactNode;
  value?: number | null;
  color?: "secondary" | "primary" | "error";
  className?: ClassValue;
  valueClassName?: ClassValue;
  loading?: boolean;
  noCurrency?: boolean;
};

const SubcontractorCostDetailItem = ({
  label,
  subLabel,
  value,
  color = "secondary",
  className,
  valueClassName,
  loading,
  noCurrency,
}: SubcontractorCostDetailItemProps) => {
  const t = useTranslations();

  return loading ? (
    <div className="max-w-lg py-4">
      <div className="flex w-full items-center space-x-2">
        <div className="h-2.5 w-full rounded-full bg-gray-200" />
        <div className="h-2.5 w-40 rounded-full bg-gray-300" />
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
        {!noCurrency ? <NumberLabel value={value} type="currency" emptyLabel={t("common.empty")} /> : value}
      </div>
    </div>
  );
};

export default SubcontractorCostDetailItem;
