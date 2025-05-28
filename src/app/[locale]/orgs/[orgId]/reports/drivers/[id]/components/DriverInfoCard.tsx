"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { memo } from "react";

import { Card, CardContent, CardHeader, DescriptionProperty2, Link } from "@/components/atoms";
import { Authorization } from "@/components/molecules";
import { useAuth, useIdParam } from "@/hooks";
import { DetailedDriverSalaryInfo } from "@/types/report";
import { getFullName } from "@/utils/auth";
import { getDetailAddress } from "@/utils/string";

type DriverInfoCardProps = {
  loading: boolean;
  salaryInfo: DetailedDriverSalaryInfo;
};

const DriverInfoCard = ({ loading, salaryInfo }: DriverInfoCardProps) => {
  const { encryptId } = useIdParam();
  const { orgLink } = useAuth();
  const t = useTranslations();

  return (
    <Card className="lg:col-span-3 2xl:col-span-4">
      <CardHeader loading={loading} title={t("report.drivers.detail.driver_info")} />
      <CardContent>
        <div
          className={clsx("grid grid-cols-1 sm:grid-cols-6", {
            "gap-x-6 gap-y-2": loading,
          })}
        >
          <div className="sm:col-span-3">
            <DescriptionProperty2 className="pb-3" label={t("report.drivers.detail.driver_name")} loading={loading}>
              <Authorization
                resource="driver"
                action="detail"
                fallbackComponent={<span>{getFullName(salaryInfo.firstName, salaryInfo.lastName)}</span>}
              >
                <Link useDefaultStyle href={`${orgLink}/drivers/${encryptId(Number(salaryInfo.id))}`} target="_blank">
                  {getFullName(salaryInfo.firstName, salaryInfo.lastName)}
                </Link>
              </Authorization>
            </DescriptionProperty2>
          </div>

          <div className="sm:col-span-3">
            <DescriptionProperty2
              className="border-t border-gray-100 py-3 pb-3 sm:border-t-0 sm:pt-1"
              label={t("report.drivers.detail.driver_total_trip")}
              loading={loading}
            >
              {salaryInfo.totalTrip}
            </DescriptionProperty2>
          </div>

          <div className="sm:col-span-3">
            <DescriptionProperty2
              className="border-t border-gray-100 py-3"
              label={t("report.drivers.detail.driver_vehicle")}
              loading={loading}
            >
              {salaryInfo.vehicleNumber && (
                <Link
                  useDefaultStyle
                  href={`${orgLink}/vehicles/${encryptId(Number(salaryInfo.vehicleId))}`}
                  target="_blank"
                >
                  {salaryInfo.vehicleNumber}
                  {salaryInfo.trailerNumber && ` (${salaryInfo.trailerNumber})`}
                </Link>
              )}
            </DescriptionProperty2>
          </div>

          <div className="sm:col-span-3">
            <DescriptionProperty2
              className="border-t border-gray-100 py-3"
              label={t("report.drivers.detail.driver_id_number")}
              loading={loading}
            >
              {salaryInfo.idNumber}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2
              className=" border-t border-gray-100 py-3"
              label={t("report.drivers.detail.driver_contact")}
              loading={loading}
            >
              {salaryInfo.phoneNumber}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2
              className="border-t border-gray-100 py-3"
              label={t("report.drivers.detail.driver_address")}
              loading={loading}
            >
              {getDetailAddress({
                addressLine1: salaryInfo.addressLine1,
                city: {
                  name: salaryInfo.city,
                },
                district: {
                  name: salaryInfo.district,
                },
                ward: {
                  name: salaryInfo.ward,
                },
              })}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2
              className="border-t border-gray-100 py-3"
              label={t("report.drivers.detail.driver_bank_account")}
              loading={loading}
            >
              {salaryInfo.accountNumber}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2
              className="border-t border-gray-100 py-3"
              label={t("report.drivers.detail.driver_bank_name")}
              loading={loading}
            >
              {salaryInfo.bankName}
            </DescriptionProperty2>
          </div>

          <div className="col-span-full">
            <DescriptionProperty2
              className="border-t border-gray-100 py-3"
              label={t("report.drivers.detail.driver_bank_branch")}
              loading={loading}
            >
              {salaryInfo.bankBranch}
            </DescriptionProperty2>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(DriverInfoCard);
