"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, DescriptionProperty2, Link } from "@/components/atoms";
import { Authorization } from "@/components/molecules";
import { useAuth, useIdParam } from "@/hooks";
import { DetailedCustomerStatisticInfo } from "@/types/report";

type CustomerInfoCardProps = {
  isLoading?: boolean;
  customerInfo?: DetailedCustomerStatisticInfo;
};

const CustomerInfoCard = ({ isLoading, customerInfo }: CustomerInfoCardProps) => {
  const { encryptId } = useIdParam();
  const { orgLink } = useAuth();
  const t = useTranslations();

  return (
    <div className="space-y-6 lg:col-span-3 2xl:col-span-4">
      <Card className="lg:col-span-4 2xl:col-span-4">
        <CardHeader loading={isLoading} title={t("report.customers.customer_info.customer_title")} />
        <CardContent>
          <div
            className={clsx("grid grid-cols-1 sm:grid-cols-6", {
              "gap-x-6 gap-y-2": isLoading,
            })}
          >
            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("report.customers.customer_info.customer_code")} loading={isLoading}>
                {customerInfo?.code}
              </DescriptionProperty2>
            </div>

            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("report.customers.customer_info.customer_name")} loading={isLoading}>
                <Authorization
                  resource="customer"
                  action="detail"
                  fallbackComponent={<span>{customerInfo?.name}</span>}
                >
                  <Link
                    useDefaultStyle
                    href={`${orgLink}/customers/${encryptId(Number(customerInfo?.id))}`}
                    target="_blank"
                  >
                    {customerInfo?.name}
                  </Link>
                </Authorization>
              </DescriptionProperty2>
            </div>

            <div className="sm:col-span-3">
              <DescriptionProperty2
                className="border-t border-gray-100 py-3"
                label={t("report.customers.customer_info.tax_code")}
                loading={isLoading}
              >
                {customerInfo?.taxCode}
              </DescriptionProperty2>
            </div>

            <div className="sm:col-span-3">
              <DescriptionProperty2
                className="border-t border-gray-100 py-3"
                loading={isLoading}
                label={t("report.customers.customer_info.contact")}
              >
                {customerInfo?.phoneNumber || customerInfo?.email}
              </DescriptionProperty2>
            </div>

            <div className="sm:col-span-3">
              <DescriptionProperty2
                className="border-t border-gray-100 py-3"
                label={t("report.customers.customer_info.representative")}
                loading={isLoading}
              >
                {customerInfo?.contactName}
              </DescriptionProperty2>
            </div>

            <div className="sm:col-span-3">
              <DescriptionProperty2
                className="border-t border-gray-100 py-3"
                loading={isLoading}
                label={t("report.customers.customer_info.representative_position")}
              >
                {customerInfo?.contactPosition}
              </DescriptionProperty2>
            </div>

            <div className="col-span-full">
              <DescriptionProperty2
                className="border-t border-gray-100 py-3"
                loading={isLoading}
                label={t("report.customers.customer_info.business_address")}
              >
                {customerInfo?.businessAddress}
              </DescriptionProperty2>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader loading={isLoading} title={t("report.customers.customer_info.payment_title")} />
        <CardContent>
          <div
            className={clsx("grid grid-cols-1 sm:grid-cols-6", {
              "gap-x-6 gap-y-2": isLoading,
            })}
          >
            <div className="col-span-full">
              <DescriptionProperty2
                className="border-gray-100 py-3"
                loading={isLoading}
                label={t("report.customers.customer_info.holder_name")}
              >
                {customerInfo?.holderName}
              </DescriptionProperty2>
            </div>

            <div className="col-span-full">
              <DescriptionProperty2
                className="border-t border-gray-100 py-3"
                loading={isLoading}
                label={t("report.customers.customer_info.account_number")}
              >
                {customerInfo?.accountNumber}
              </DescriptionProperty2>
            </div>

            <div className="col-span-full">
              <DescriptionProperty2
                className="border-t border-gray-100 py-3"
                loading={isLoading}
                label={t("report.customers.customer_info.bank_name")}
              >
                {customerInfo?.bankName}
              </DescriptionProperty2>
            </div>

            <div className="col-span-full">
              <DescriptionProperty2
                className="border-t border-gray-100 py-3"
                loading={isLoading}
                label={t("report.customers.customer_info.bank_branch")}
              >
                {customerInfo?.bankBranch}
              </DescriptionProperty2>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerInfoCard;
