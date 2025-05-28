"use client";

import { useTranslations } from "next-intl";
import { memo, useCallback } from "react";

import { Card, CardContent, CardHeader } from "@/components/atoms";
import { DetailedDriverSalaryInfo } from "@/types/report";
import { calculateDriverActualSalaryOrBalance } from "@/utils/driver";
import { isNumeric } from "@/utils/number";

import { DriverSalaryDetailItem } from ".";

const enum Polarity {
  NEGATIVE = "NEGATIVE",
  POSITIVE = "POSITIVE",
}

type DriverSalaryDetailCardProps = {
  loading: boolean;
  salaryInfo: DetailedDriverSalaryInfo;
};

const DriverSalaryDetailCard = ({ loading, salaryInfo }: DriverSalaryDetailCardProps) => {
  const t = useTranslations();

  const sanitizeValue = useCallback((value: number | string, polarity: Polarity = Polarity.NEGATIVE) => {
    if (isNumeric(value) && Number(value) !== 0) {
      return polarity === Polarity.NEGATIVE ? -value : value;
    }
    return null;
  }, []);

  return (
    <Card className="lg:col-span-2 2xl:col-span-2">
      <CardHeader loading={loading} title={t("report.drivers.detail.report_details")} />
      <CardContent className="divide-y divide-gray-100">
        <DriverSalaryDetailItem
          loading={loading}
          label={t.rich("report.drivers.basic_salary_detail", {
            detail: (chunks) => <span className="!font-normal !text-gray-700">{chunks}</span>,
          })}
          value={salaryInfo.basicSalary}
        />

        <DriverSalaryDetailItem
          loading={loading}
          label={t.rich("report.drivers.total_income_per_trip_detail", {
            detail: (chunks) => <span className="!font-normal !text-gray-700">{chunks}</span>,
          })}
          value={salaryInfo.tripSalaryTotal}
        />

        <DriverSalaryDetailItem
          loading={loading}
          color="error"
          label={t.rich("report.drivers.total_salary_advance_detail", {
            detail: (chunks) => <span className="!font-normal !text-gray-700">{chunks}</span>,
          })}
          value={sanitizeValue(salaryInfo.salaryAdvance)}
        />

        <DriverSalaryDetailItem
          loading={loading}
          color="error"
          label={t.rich("report.drivers.advance_total_cost_detail", {
            detail: (chunks) => <span className="!font-normal !text-gray-700">{chunks}</span>,
          })}
          value={sanitizeValue(salaryInfo.advanceTotalCost)}
        />

        <DriverSalaryDetailItem
          loading={loading}
          color="error"
          label={t.rich("report.drivers.union_dues_detail", {
            detail: (chunks) => <span className="!font-normal !text-gray-700">{chunks}</span>,
          })}
          value={sanitizeValue(salaryInfo.unionDues)}
        />

        <DriverSalaryDetailItem
          loading={loading}
          color="error"
          label={t.rich("report.drivers.security_deposit_detail", {
            detail: (chunks) => <span className="!font-normal !text-gray-700">{chunks}</span>,
          })}
          value={sanitizeValue(salaryInfo.securityDeposit)}
        />

        <DriverSalaryDetailItem
          loading={loading}
          color="primary"
          className="!border-t border-solid !border-gray-300 py-6"
          valueClassName="font-semibold text-base"
          label={t("report.drivers.total_actual_salary")}
          subLabel={t("report.drivers.total_actual_salary_detail")}
          value={calculateDriverActualSalaryOrBalance(salaryInfo)}
        />
      </CardContent>
    </Card>
  );
};

export default memo(DriverSalaryDetailCard);
