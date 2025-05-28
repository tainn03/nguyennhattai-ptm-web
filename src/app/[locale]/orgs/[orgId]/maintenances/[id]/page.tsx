"use client";

import { MaintenanceTypeType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DateTimeLabel,
  DescriptionProperty2,
  DetailDataNotFound,
  Link,
  NumberLabel,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useIdParam, useMaintenance, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useMaintenanceState } from "@/redux/states";
import { deleteMaintenance } from "@/services/client/maintenance";
import { getAccountInfo } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();
    const { searchQueryString } = useMaintenanceState();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("maintenance");
    const { maintenance, isLoading } = useMaintenance({
      organizationId: orgId,
      id: originId!,
    });

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
     * Get maintenance name
     */
    const maintenanceName = useMemo(() => {
      if (maintenance?.type === MaintenanceTypeType.VEHICLE) {
        return maintenance?.vehicle.vehicleNumber;
      } else {
        return maintenance?.trailer.trailerNumber;
      }
    }, [maintenance]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("maintenance.manage"), link: orgLink },
        { name: t("maintenance.title"), link: `${orgLink}/maintenances${searchQueryString}` },
        { name: maintenanceName || ensureString(encryptedId), link: `${orgLink}/maintenances/${encryptedId}` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maintenance?.id, orgLink]);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (originId && userId) {
        const { error } = await deleteMaintenance(
          {
            organizationId: Number(orgId),
            id: originId,
            updatedById: userId,
          },
          maintenance?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: maintenanceName,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: maintenanceName,
            }),
          });
        }
      }

      router.push(`${orgLink}/maintenances${searchQueryString}`);
    }, [
      maintenanceName,
      maintenance?.updatedAt,
      orgId,
      orgLink,
      originId,
      router,
      searchQueryString,
      showNotification,
      userId,
      t,
    ]);

    // Data not found
    if (!isLoading && !maintenance) {
      return <DetailDataNotFound goBackLink={`${orgLink}/maintenances${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("maintenance.title")}
          description={t("maintenance.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="maintenance"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(maintenance?.createdByUser.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="maintenance" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/maintenances/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="maintenance"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(maintenance?.createdByUser.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/maintenances/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          {/* General */}
          <div className="flex-1">
            <Card>
              <CardHeader loading={isLoading} title={t("maintenance.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("maintenance.name")} loading={isLoading}>
                  {maintenanceName}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance.payment_by")} loading={isLoading}>
                  {getAccountInfo(maintenance?.costBearer).displayName}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance.estimate_cost")} loading={isLoading}>
                  {maintenance?.estimateCost && (
                    <NumberLabel value={Number(maintenance?.estimateCost)} type="currency" />
                  )}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance.actual_cost")} loading={isLoading}>
                  {maintenance?.estimateCost && <NumberLabel value={Number(maintenance?.actualCost)} type="currency" />}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance.maintenance_date")} loading={isLoading}>
                  <DateTimeLabel
                    value={ensureString(maintenance?.maintenanceDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance.maintenance_type")} loading={isLoading}>
                  {maintenance?.maintenanceType?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance.transportation_type")} loading={isLoading}>
                  {maintenance?.type === MaintenanceTypeType.VEHICLE
                    ? t("maintenance.vehicle")
                    : t("maintenance.trailer")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance.remind_date")} loading={isLoading}>
                  <DateTimeLabel
                    value={ensureString(maintenance?.repeatDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance.remind")} loading={isLoading}>
                  <Badge
                    label={maintenance?.isRepeat ? t("maintenance.reminded") : t("maintenance.remind_next_period")}
                    color="info"
                  />
                </DescriptionProperty2>
                <DescriptionProperty2
                  size="long"
                  count={3}
                  multiline
                  label={t("maintenance.description")}
                  loading={isLoading}
                >
                  {maintenance?.description}
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={maintenance} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: maintenanceName })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "maintenance",
    action: "detail",
  }
);
