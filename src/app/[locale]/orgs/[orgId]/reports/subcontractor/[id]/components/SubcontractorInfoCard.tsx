"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { memo } from "react";

import { Card, CardContent, CardHeader, DescriptionProperty2, Link } from "@/components/atoms";
import { Authorization } from "@/components/molecules";
import { useAuth, useIdParam } from "@/hooks";
import { DetailedSubcontractorCostInfo } from "@/types/report";

type SubcontractorInfoCardProps = {
  loading: boolean;
  costInfo: DetailedSubcontractorCostInfo;
};

const SubcontractorInfoCard = ({ loading, costInfo }: SubcontractorInfoCardProps) => {
  const { encryptId } = useIdParam();
  const { orgLink } = useAuth();
  const t = useTranslations("report.subcontractors.detail");

  const props = {
    loading,
    className: "border-t border-gray-100 py-3",
  };

  return (
    <Card className="lg:col-span-3 2xl:col-span-4">
      <CardHeader loading={loading} title={t("info")} />
      <CardContent>
        <div
          className={clsx("grid grid-cols-1 sm:grid-cols-6", {
            "gap-x-6 gap-y-2": loading,
          })}
        >
          <div className="sm:col-span-3">
            <DescriptionProperty2 className="pb-3" label={t("code")} loading={loading}>
              {costInfo.code}
            </DescriptionProperty2>
          </div>

          <div className="sm:col-span-3">
            <DescriptionProperty2
              className="border-t border-gray-100 py-3 pb-3 sm:border-t-0 sm:pt-1"
              label={t("name")}
              loading={loading}
            >
              <Authorization resource="subcontractor" action="detail" fallbackComponent={<span>{costInfo?.name}</span>}>
                <Link
                  useDefaultStyle
                  href={`${orgLink}/subcontractors/${encryptId(Number(costInfo.id))}`}
                  target="_blank"
                >
                  {costInfo.name}
                </Link>
              </Authorization>
            </DescriptionProperty2>
          </div>

          <div className="sm:col-span-3">
            <DescriptionProperty2 {...props} label={t("email")}>
              {costInfo.email && (
                <Link useDefaultStyle href={`mailto:${costInfo.email}`}>
                  {costInfo.email}
                </Link>
              )}
            </DescriptionProperty2>
          </div>

          <div className="sm:col-span-3">
            <DescriptionProperty2 {...props} label={t("phone_number")}>
              {costInfo.phoneNumber && (
                <Link useDefaultStyle href={`tel:${costInfo.phoneNumber}`}>
                  {costInfo.phoneNumber}
                </Link>
              )}
            </DescriptionProperty2>
          </div>

          <div className="sm:col-span-3">
            <DescriptionProperty2 {...props} label={t("tax_code")}>
              {costInfo.taxCode}
            </DescriptionProperty2>
          </div>

          <div className="sm:col-span-3">
            <DescriptionProperty2 {...props} label={t("website")}>
              {costInfo.website && (
                <Link useDefaultStyle href={costInfo.website} target="_blank">
                  {costInfo.website}
                </Link>
              )}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2 {...props} label={t("total_trip")}>
              {costInfo.totalTrip}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2 {...props} label={t("address")}>
              {costInfo.businessAddress}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2 {...props} label={t("bank_account")}>
              {costInfo.accountNumber}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2 {...props} label={t("bank_name")}>
              {costInfo.bankName}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2 {...props} label={t("bank_branch")}>
              {costInfo.bankBranch}
            </DescriptionProperty2>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(SubcontractorInfoCard);
