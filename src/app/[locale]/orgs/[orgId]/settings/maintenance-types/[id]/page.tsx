"use client";

import { MaintenanceTypeType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  DetailDataNotFound,
  Link,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useIdParam, useMaintenanceType, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useMaintenanceTypeState } from "@/redux/states";
import { deleteMaintenanceType } from "@/services/client/maintenanceType";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { searchQueryString } = useMaintenanceTypeState();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("maintenance-type");
    const { maintenanceType, isLoading } = useMaintenanceType({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("maintenance_type.title"), link: `${orgLink}/settings/maintenance-types${searchQueryString}` },
        {
          name: maintenanceType?.name || `${encryptedId}`,
          link: `${orgLink}/settings/maintenance-types/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maintenanceType?.name, orgLink]);

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
        const { error } = await deleteMaintenanceType(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          maintenanceType?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: maintenanceType?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: maintenanceType?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/maintenance-types${searchQueryString}`);
    }, [
      maintenanceType?.name,
      maintenanceType?.updatedAt,
      orgId,
      orgLink,
      originId,
      router,
      searchQueryString,
      showNotification,
      t,
      userId,
    ]);

    // Data not found
    if (!isLoading && !maintenanceType) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/maintenance-types${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("maintenance_type.title")}
          description={t("maintenance_type.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="maintenance-type"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(maintenanceType?.createdByUser.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="maintenance-type" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/maintenance-types/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="maintenance-type"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(maintenanceType?.createdByUser.id, userId)}
              >
                <Button
                  as={Link}
                  disabled={isLoading}
                  href={`${orgLink}/settings/maintenance-types/${encryptedId}/edit`}
                >
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
              <CardHeader loading={isLoading} title={t("maintenance_type.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("maintenance_type.unit_of_measure")} loading={isLoading}>
                  {maintenanceType?.type === MaintenanceTypeType.VEHICLE
                    ? t("maintenance_type.vehicle")
                    : t("maintenance_type.trailer")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance_type.name")} loading={isLoading}>
                  {maintenanceType?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("maintenance_type.description")} loading={isLoading}>
                  {maintenanceType?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("maintenance_type.status")} loading={isLoading}>
                  <Badge
                    label={
                      maintenanceType?.isActive
                        ? t("maintenance_type.status_active")
                        : t("maintenance_type.status_inactive")
                    }
                    color={maintenanceType?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={maintenanceType} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: maintenanceType?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "maintenance-type",
    action: "detail",
  }
);
