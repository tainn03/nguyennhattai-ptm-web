"use client";

import { FuelType } from "@prisma/client";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DateTimeLabel,
  DescriptionImage,
  DescriptionProperty2,
  DetailDataNotFound,
  Link,
  NumberLabel,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal, MapLocation } from "@/components/organisms";
import { useIdParam, useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import useFuelLog from "@/hooks/useFuelLog";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useFuelLogState } from "@/redux/states";
import { confirmFuelLog, deleteFuelLog } from "@/services/client/fuelLog";
import { getAccountInfo, getFullName } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { encryptId } from "@/utils/security";
import { ensureString, getDetailAddress } from "@/utils/string";

import { FuelLogLineChart } from "./components";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { showNotification } = useNotification();
    const { searchQueryString } = useFuelLogState();
    const { setBreadcrumb } = useBreadcrumb();
    const searchParams = useSearchParams();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("report-statistics-fuel-log");

    const { useFuelCostManagement } = useOrgSettingExtendedStorage();

    const { fuelLog, isLoading, mutate } = useFuelLog({
      organizationId: orgId,
      id: originId!,
    });

    const [startDate, endDate] = useMemo(
      () => [searchParams.get("startDate"), searchParams.get("endDate")],
      [searchParams]
    );

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("report.feature"), link: `${orgLink}/dashboard` },
        { name: t("report.fuel_log.title"), link: `${orgLink}/reports/fuel-logs${searchQueryString}` },
        {
          name: ensureString(fuelLog?.vehicle.vehicleNumber),
          link: `${orgLink}/reports/fuel-logs/${encryptedId}?startDate=${startDate}&endDate=${endDate}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fuelLog?.vehicle.vehicleNumber, orgLink]);

    /**
     * Handles the click event to initiate the deletion confirmation.
     */
    const handleDeleteClick = useCallback(() => {
      setIsDeleteConfirmOpen(true);
    }, []);

    /**
     * Handles the cancel event for deleting and closes the deletion confirmation modal.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (originId && userId) {
        const { error } = await deleteFuelLog(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          fuelLog?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("report.fuel_log.delete_error_message"),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("report.fuel_log.delete_success_message", {
              vehicleNumber: fuelLog?.vehicle.vehicleNumber,
            }),
          });
        }
      }

      router.push(`${orgLink}/reports/fuel-logs${searchQueryString}`);
    }, [
      originId,
      userId,
      router,
      orgLink,
      searchQueryString,
      orgId,
      fuelLog?.updatedAt,
      fuelLog?.vehicle.vehicleNumber,
      showNotification,
      t,
    ]);

    /**
     * Handles the click event to initiate the deletion confirmation.
     */
    const handleToggleApproveConfirmModal = useCallback(() => {
      setIsApproveConfirmOpen((prev) => !prev);
    }, []);

    /**
     * Handles the confirmation when approve.
     * Sends a confirm request, and displays a notification based on the result.
     */
    const handleApproveConfirm = useCallback(async () => {
      if (originId && userId) {
        const { error } = await confirmFuelLog({
          id: originId,
          updatedById: userId,
        });

        if (error) {
          showNotification({
            color: "error",
            title: t("report.fuel_log.confirm_error_title"),
            message: t("report.fuel_log.confirm_error_unknown"),
          });
        } else {
          showNotification({
            color: "success",
            title: t("report.fuel_log.confirm_success_title"),
          });
        }
      }
      setIsApproveConfirmOpen(false);
      mutate();
    }, [originId, userId, mutate, showNotification, t]);

    // Data not found
    if (!isLoading && !fuelLog) {
      return <DetailDataNotFound goBackLink={`${orgLink}/reports/fuel-logs${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("report.fuel_log.title")}
          description={t("report.fuel_log.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Confirm */}
              {!fuelLog?.confirmationBy && (
                <Authorization resource="report-statistics-fuel-log" action="approve">
                  <Button disabled={isLoading} type="button" color="success" onClick={handleToggleApproveConfirmModal}>
                    {t("report.fuel_log.confirm_button")}
                  </Button>
                </Authorization>
              )}

              {/* Delete */}
              <Authorization
                resource="report-statistics-fuel-log"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(fuelLog?.createdByUser?.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="report-statistics-fuel-log" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/reports/fuel-logs/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="report-statistics-fuel-log"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(fuelLog?.createdByUser?.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/reports/fuel-logs/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="mt-10 flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          <div className="flex flex-1 flex-col gap-4 sm:gap-6 lg:gap-8">
            <FuelLogLineChart
              loading={isLoading}
              organizationId={orgId}
              vehicleId={Number(fuelLog?.vehicle.id)}
              startDate={startDate}
              endDate={endDate}
            />

            {/* General */}
            <Card>
              <CardHeader loading={isLoading} title={t("report.fuel_log.general_title")} />
              <CardContent>
                {/* Driver */}
                <DescriptionProperty2 label={t("report.fuel_log.driver")} loading={isLoading}>
                  <Authorization
                    resource="driver"
                    action="detail"
                    fallbackComponent={
                      <span className="text-sm font-medium leading-6 text-gray-900">
                        {getFullName(fuelLog?.driver?.firstName, fuelLog?.driver?.lastName)}
                        {fuelLog?.driver.phoneNumber && ` (${fuelLog?.driver.phoneNumber})`}
                      </span>
                    }
                  >
                    <Link
                      useDefaultStyle
                      className="cursor-pointer"
                      href={`${orgLink}/drivers/${encryptId(fuelLog?.driver?.id)}`}
                    >
                      {getFullName(fuelLog?.driver?.firstName, fuelLog?.driver?.lastName)}
                      {fuelLog?.driver.phoneNumber && ` (${fuelLog.driver.phoneNumber})`}
                    </Link>
                  </Authorization>
                </DescriptionProperty2>
                {/* Vehicle */}
                <DescriptionProperty2 label={t("report.fuel_log.vehicle")} loading={isLoading}>
                  <Authorization
                    resource="vehicle"
                    action="detail"
                    fallbackComponent={
                      <span className="text-sm font-medium leading-6 text-gray-900">
                        {fuelLog?.vehicle?.vehicleNumber}
                        {fuelLog?.vehicle?.idNumber && ` (${fuelLog.vehicle.idNumber})`}
                      </span>
                    }
                  >
                    <Link
                      useDefaultStyle
                      className="cursor-pointer"
                      href={`${orgLink}/vehicles/${encryptId(fuelLog?.vehicle.id)}`}
                    >
                      {fuelLog?.vehicle?.vehicleNumber}
                      {fuelLog?.vehicle?.idNumber && ` (${fuelLog.vehicle.idNumber})`}
                    </Link>
                  </Authorization>
                </DescriptionProperty2>
                {/* Gas Station */}
                <DescriptionProperty2 label={t("report.fuel_log.gas_station")} loading={isLoading}>
                  {fuelLog?.gasStation.name || t("common.empty")}
                </DescriptionProperty2>
                {/* Gas Station Address */}
                <DescriptionProperty2 label={t("report.fuel_log.address")} loading={isLoading}>
                  {getDetailAddress(fuelLog?.gasStation.address) || t("common.empty")}
                </DescriptionProperty2>
                {/* Date */}
                <DescriptionProperty2 label={t("report.fuel_log.date")} loading={isLoading}>
                  <DateTimeLabel value={fuelLog?.date || undefined} type="datetime" emptyLabel={t("common.empty")} />
                </DescriptionProperty2>
                {/* Liters */}
                <DescriptionProperty2 label={t("report.fuel_log.liters_detail")} loading={isLoading}>
                  <NumberLabel
                    value={fuelLog?.liters}
                    unit={`${t("report.fuel_log.liters")} ${
                      fuelLog?.fuelType === FuelType.GASOLINE
                        ? t("report.fuel_log.type.gasoline")
                        : t("report.fuel_log.type.diesel")
                    }`}
                  />
                </DescriptionProperty2>

                {/* Fuel cost */}
                {useFuelCostManagement && (
                  <DescriptionProperty2 label={t("report.fuel_log.fuel_cost")} loading={isLoading}>
                    <NumberLabel value={fuelLog?.fuelCost} type="currency" emptyLabel="-" />
                  </DescriptionProperty2>
                )}

                {/* Fuel Meter Image */}
                <DescriptionProperty2
                  type="image"
                  label={t("report.fuel_log.fuel_meter_image")}
                  loading={isLoading}
                  multiline
                  className={clsx({ "[&>label]:w-full": fuelLog?.fuelMeterImage?.url })}
                >
                  {fuelLog?.fuelMeterImage?.url ? <DescriptionImage file={fuelLog.fuelMeterImage} /> : "-"}
                </DescriptionProperty2>
                {/* Odometer */}
                <DescriptionProperty2 label={t("report.fuel_log.odometer")} loading={isLoading}>
                  <NumberLabel
                    value={fuelLog?.odometerReading}
                    unit={t("report.fuel_log.odometer_unit")}
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>
                {/* Odometer Image */}
                <DescriptionProperty2
                  type="image"
                  label={t("report.fuel_log.odometer_image")}
                  loading={isLoading}
                  multiline
                  className={clsx({ "[&>label]:w-full": fuelLog?.odometerImage?.url })}
                >
                  {fuelLog?.odometerImage?.url ? <DescriptionImage file={fuelLog.odometerImage} /> : "-"}
                </DescriptionProperty2>
                {/* Location */}
                {fuelLog?.latitude && fuelLog?.longitude && (
                  <DescriptionProperty2 label={t("report.fuel_log.location")} loading={isLoading}>
                    <MapLocation latitude={fuelLog.latitude} longitude={fuelLog.longitude} />
                  </DescriptionProperty2>
                )}
                {/* Notes */}
                <DescriptionProperty2 label={t("report.fuel_log.notes")} loading={isLoading}>
                  {fuelLog?.notes}
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>
          <div className="flex w-full flex-1 flex-col gap-4 sm:gap-6 lg:max-w-xs lg:gap-8 xl:max-w-sm">
            {/* System info */}
            <SystemInfoCard loading={isLoading} entity={fuelLog} />
            {/* Confirm Info */}
            <Card>
              <CardHeader loading={isLoading} title={t("report.fuel_log.confirm_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("report.fuel_log.status")} loading={isLoading}>
                  <Badge
                    label={
                      fuelLog?.confirmationBy
                        ? t("report.fuel_log.status_confirmed")
                        : t("report.fuel_log.status_waiting")
                    }
                    color={fuelLog?.confirmationBy ? "success" : "warning"}
                  />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("report.fuel_log.confirmed_by")} loading={isLoading}>
                  {getAccountInfo(fuelLog?.confirmationBy).displayName}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("report.fuel_log.confirmed_at")} loading={isLoading}>
                  <DateTimeLabel
                    value={fuelLog?.confirmationAt || undefined}
                    type="datetime"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: t("report.fuel_log.info") })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
        {/* Approve confirmation dialog */}
        <ConfirmModal
          open={isApproveConfirmOpen}
          icon="question"
          color="primary"
          title={t("report.fuel_log.confirm_dialog_title", { vehicleNumber: fuelLog?.vehicle.vehicleNumber })}
          message={t("report.fuel_log.confirm_dialog_message")}
          onClose={handleToggleApproveConfirmModal}
          onCancel={handleToggleApproveConfirmModal}
          onConfirm={handleApproveConfirm}
        />
      </>
    );
  },
  {
    resource: "report-statistics-fuel-log",
    action: ["detail"],
  }
);
