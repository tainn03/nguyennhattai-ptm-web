"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader } from "@/components/atoms";
import { DetailedCustomerStatisticInfo } from "@/types/report";

import { CustomerReportItem } from ".";

type CustomerReportCardProps = {
  isLoading?: boolean;
  customerInfo?: DetailedCustomerStatisticInfo;
};

const CustomerReportCard = ({ isLoading, customerInfo }: CustomerReportCardProps) => {
  const t = useTranslations();

  return (
    <Card className="lg:col-span-2 2xl:col-span-2">
      <CardHeader loading={isLoading} title={t("report.drivers.detail.report_details")} />
      <CardContent className="divide-y divide-gray-100">
        <CustomerReportItem
          loading={isLoading}
          valueClassName="text-gray-700"
          label={t("report.customers.customer_report.total_trip")}
          value={Number(customerInfo?.totalTrip) ?? 0}
          type="numeric"
          unit={t("report.customers.customer_report.trip")}
        />
        <CustomerReportItem
          loading={isLoading}
          valueClassName="text-gray-700"
          label={t("report.customers.customer_report.total_order")}
          value={Number(customerInfo?.totalOrder) ?? 0}
          type="numeric"
          unit={t("report.customers.customer_report.order")}
        />
        <CustomerReportItem
          color="primary"
          valueClassName="font-medium"
          loading={isLoading}
          label={t.rich("report.customers.customer_report.total_amount", {
            detail: (chunks) => <span className="!font-normal !text-gray-700">{chunks}</span>,
          })}
          value={Number(customerInfo?.totalAmount) ?? 0}
        />
      </CardContent>
    </Card>
  );
};

export default CustomerReportCard;
