"use client";

import { CustomFieldType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";

import { Badge, Card, CardContent, CardHeader, DescriptionImage, DescriptionProperty2, Link } from "@/components/atoms";
import { SystemInfoCard } from "@/components/molecules";
import { CustomFieldsDisplay } from "@/components/organisms";
import { SubcontractorInfo } from "@/types/strapi";

export type SubcontractorDetailProps = {
  subcontractor?: SubcontractorInfo;
  isLoading: boolean;
};

export default function SubcontractorDetail({ subcontractor, isLoading }: SubcontractorDetailProps) {
  const t = useTranslations();

  return (
    <div className="mt-10 flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
      <div className="flex flex-1 flex-col gap-4 sm:gap-6 lg:gap-8">
        <Card>
          <CardHeader title={t("subcontractor.general_title")} loading={isLoading} />
          <CardContent>
            <DescriptionProperty2 label={t("subcontractor.subcontractor_code")} loading={isLoading}>
              {subcontractor?.code}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.subcontractor_name")} loading={isLoading}>
              {subcontractor?.name}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.tax_code")} loading={isLoading}>
              {subcontractor?.taxCode}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.email")} loading={isLoading}>
              {subcontractor?.email && (
                <Link useDefaultStyle color="secondary" href={`mailto:${subcontractor?.email}`}>
                  {subcontractor?.email}
                </Link>
              )}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.phone_number")} loading={isLoading}>
              {subcontractor?.phoneNumber}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.website")} loading={isLoading}>
              {subcontractor?.website}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.address")} loading={isLoading}>
              {subcontractor?.businessAddress}
            </DescriptionProperty2>

            <DescriptionProperty2
              type="image"
              label={t("subcontractor.document")}
              count={1}
              loading={isLoading}
              className={clsx({ "[&>label]:w-full": subcontractor?.documents?.[0] })}
            >
              <DescriptionImage file={subcontractor?.documents?.[0]} />
            </DescriptionProperty2>

            <DescriptionProperty2 multiline label={t("subcontractor.description")} loading={isLoading}>
              {subcontractor?.description}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.status")} loading={isLoading}>
              <Badge
                label={subcontractor?.isActive ? t("subcontractor.status_active") : t("subcontractor.status_inactive")}
                color={subcontractor?.isActive ? "success" : "error"}
              />
            </DescriptionProperty2>
          </CardContent>
        </Card>

        <CustomFieldsDisplay loading={isLoading} meta={subcontractor?.meta} type={CustomFieldType.SUBCONTRACTOR} />
      </div>

      <div className="flex w-full flex-1 flex-col gap-4 sm:gap-6 lg:max-w-xs lg:gap-8 xl:max-w-sm">
        <Card>
          <CardHeader title={t("subcontractor.payment")} loading={isLoading} />
          <CardContent>
            <DescriptionProperty2 label={t("subcontractor.payment_owner")} loading={isLoading}>
              {subcontractor?.bankAccount?.holderName}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.payment_number")} loading={isLoading}>
              {subcontractor?.bankAccount?.accountNumber}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.payment_bank")} loading={isLoading}>
              {subcontractor?.bankAccount?.bankName}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("subcontractor.payment_branch")} loading={isLoading}>
              {subcontractor?.bankAccount?.bankBranch}
            </DescriptionProperty2>
          </CardContent>
        </Card>

        <SystemInfoCard loading={isLoading} entity={subcontractor} />
      </div>
    </div>
  );
}
