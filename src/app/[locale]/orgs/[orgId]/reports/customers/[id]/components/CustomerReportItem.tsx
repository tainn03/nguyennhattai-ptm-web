"use client";

import clsx, { ClassValue } from "clsx";
import { useTranslations } from "next-intl";
import { ReactNode } from "react";

import { InfoBox, NumberLabel } from "@/components/atoms";

type CustomerReportItemProps = {
  label: ReactNode;
  subLabel?: ReactNode;
  value?: number | null;
  color?: "secondary" | "primary" | "error" | "success";
  className?: ClassValue;
  valueClassName?: ClassValue;
  loading?: boolean;
  type?: "numeric" | "currency";
  unit?: string;
};

const CustomerReportItem = ({
  label,
  subLabel,
  value,
  color = "secondary",
  className,
  valueClassName,
  loading,
  type = "currency",
  unit,
}: CustomerReportItemProps) => {
  const t = useTranslations();

  return loading ? (
    <div className="max-w-lg py-4">
      <div className="flex w-full items-center space-x-2 font-normal">
        <div className="h-2.5 w-full rounded-full bg-gray-200" />
        <div className="h-2.5 w-40 rounded-full bg-gray-300" />
      </div>
    </div>
  ) : (
    <div className={clsx("flex items-center justify-between gap-x-6 py-4", className)}>
      <InfoBox className="text-sm font-medium leading-6 text-gray-700" label={label} subLabel={subLabel} />
      <div
        className={clsx("text-sm", valueClassName, {
          "text-red-600": !!value && color === "error",
          "text-blue-700": !!value && color === "primary",
          "text-green-600": !!value && color === "success",
        })}
      >
        <NumberLabel value={value} type={type} unit={unit} emptyLabel={t("common.empty")} />
      </div>
    </div>
  );
};

export default CustomerReportItem;
