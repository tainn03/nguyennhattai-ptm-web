"use client";

import { CustomFieldType } from "@prisma/client";
import { useTranslations } from "next-intl";

import { Badge, Card, CardContent, CardHeader, DescriptionProperty2, Link, NumberLabel } from "@/components/atoms";
import { SystemInfoCard } from "@/components/molecules";
import { CustomFieldsDisplay } from "@/components/organisms";
import { CustomerInfo } from "@/types/strapi";

export type CustomerDetailProps = {
  customer?: CustomerInfo;
  isLoading: boolean;
};

const CustomerDetail = ({ customer, isLoading }: CustomerDetailProps) => {
  const t = useTranslations();

  return (
    <div className="mt-10 flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader title={t("customer.general_title")} loading={isLoading} />
          <CardContent>
            <DescriptionProperty2 label={t("customer.customer_code")} loading={isLoading}>
              {customer?.code}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.customer_name")} loading={isLoading}>
              {customer?.name}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.tax_code")} loading={isLoading}>
              {customer?.taxCode}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.email")} loading={isLoading}>
              {customer?.email && (
                <Link useDefaultStyle underline href={`mailto:${customer?.email}`}>
                  {customer?.email}
                </Link>
              )}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.phone_number")} loading={isLoading}>
              {customer?.phoneNumber && (
                <Link useDefaultStyle underline href={`tel:${customer?.phoneNumber}`}>
                  {customer?.phoneNumber}
                </Link>
              )}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.address")} loading={isLoading}>
              {customer?.businessAddress}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.default_unit")} loading={isLoading}>
              {customer?.defaultUnit?.code}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.status")} loading={isLoading}>
              <Badge
                label={customer?.isActive ? t("customer.status_active") : t("customer.status_inactive")}
                color={customer?.isActive ? "success" : "error"}
              />
            </DescriptionProperty2>
          </CardContent>
        </Card>

        <CustomFieldsDisplay loading={isLoading} meta={customer?.meta} type={CustomFieldType.CUSTOMER} />
      </div>
      <div className="w-full space-y-6 lg:max-w-xs xl:max-w-sm">
        <Card>
          <CardHeader title={t("customer.representative")} loading={isLoading} />
          <CardContent>
            <DescriptionProperty2 label={t("customer.representative_fullname")} loading={isLoading}>
              {customer?.contactName}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.representative_position")} loading={isLoading}>
              {customer?.contactPosition}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.representative_email")} loading={isLoading}>
              {customer?.contactEmail && (
                <Link useDefaultStyle underline href={`mailto:${customer?.contactEmail}`}>
                  {customer?.contactEmail}
                </Link>
              )}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.representative_phone")} loading={isLoading}>
              {customer?.contactPhoneNumber && (
                <Link useDefaultStyle underline href={`tel:${customer?.contactPhoneNumber}`}>
                  {customer?.contactPhoneNumber}
                </Link>
              )}
            </DescriptionProperty2>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("customer.payment")} loading={isLoading} />
          <CardContent>
            <DescriptionProperty2 label={t("customer.payment_owner")} loading={isLoading}>
              {customer?.bankAccount?.holderName}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.payment_number")} loading={isLoading}>
              {customer?.bankAccount?.accountNumber && customer?.bankAccount?.accountNumber}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.payment_bank")} loading={isLoading}>
              {customer?.bankAccount?.bankName}
            </DescriptionProperty2>
            <DescriptionProperty2 label={t("customer.payment_branch")} loading={isLoading}>
              {customer?.bankAccount?.bankBranch}
            </DescriptionProperty2>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Chi phí khách hàng" loading={isLoading} />
          <CardContent>
            <DescriptionProperty2 label="Phí rớt điểm" loading={isLoading}>
              <NumberLabel value={150000} type="numeric" />
            </DescriptionProperty2>
            <DescriptionProperty2 label="Số lượng rớt điểm miễn phí" loading={isLoading}>
              <NumberLabel value={2} type="numeric" />
            </DescriptionProperty2>
          </CardContent>
        </Card>

        <SystemInfoCard loading={isLoading} entity={customer} />
      </div>
    </div>
  );
};

export default CustomerDetail;
