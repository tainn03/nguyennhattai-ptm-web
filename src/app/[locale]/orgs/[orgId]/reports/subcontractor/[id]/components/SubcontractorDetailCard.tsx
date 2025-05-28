"use client";

import { useTranslations } from "next-intl";
import { memo } from "react";

import { Card, CardContent, CardHeader } from "@/components/atoms";
import { DetailedSubcontractorCostInfo } from "@/types/report";
import { ensureString } from "@/utils/string";
import { calculateSubcontractorBalance } from "@/utils/subcontractor";

import { SubcontractorCostDetailItem } from ".";

type SubcontractorDetailCardProps = {
  loading: boolean;
  costInfo: DetailedSubcontractorCostInfo;
};
const SubcontractorDetailCard = ({ loading, costInfo }: SubcontractorDetailCardProps) => {
  const t = useTranslations("report.subcontractors.detail");

  return (
    <Card className="lg:col-span-2 2xl:col-span-2">
      <CardHeader loading={loading} title={t("cost_info")} />
      <CardContent className="divide-y divide-gray-100">
        <SubcontractorCostDetailItem
          loading={loading}
          label={t.rich("total_cost", {
            detail: (chunks) => <span className="!font-normal !text-gray-700">{chunks}</span>,
          })}
          value={costInfo.subcontractorCostTotal ? Number(costInfo.subcontractorCostTotal) : null}
        />

        <SubcontractorCostDetailItem
          loading={loading}
          color="error"
          label={t.rich("total_advance", {
            detail: (chunks) => <span className="!font-normal !text-gray-700">{chunks}</span>,
          })}
          value={costInfo.advanceTotalCost ? -Number(costInfo.advanceTotalCost) : null}
        />

        <SubcontractorCostDetailItem
          loading={loading}
          color="primary"
          className="!border-t border-solid !border-gray-300 py-6"
          valueClassName="font-semibold text-base"
          label={t("total_payment")}
          subLabel={t("total_payment_detail")}
          value={calculateSubcontractorBalance({
            subcontractorCostTotal: ensureString(costInfo.subcontractorCostTotal),
            advanceTotalCost: ensureString(costInfo.advanceTotalCost),
          })}
        />
      </CardContent>
    </Card>
  );
};

export default memo(SubcontractorDetailCard);
