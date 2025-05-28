"use client";

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
  NumberLabel,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useIdParam, usePermission, useVehicleType } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useVehicleTypeState } from "@/redux/states";
import { deleteVehicleType } from "@/services/client/vehicleType";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { showNotification } = useNotification();
    const { searchQueryString } = useVehicleTypeState();
    const { setBreadcrumb } = useBreadcrumb();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("vehicle-type");
    const { vehicleType, isLoading } = useVehicleType({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("vehicle_type.title"), link: `${orgLink}/settings/vehicle-types${searchQueryString}` },
        {
          name: vehicleType?.name || `${encryptedId}`,
          link: `${orgLink}/settings/vehicle-types/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleType?.name, orgLink]);

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
        const { error } = await deleteVehicleType(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          vehicleType?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: vehicleType?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: vehicleType?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/vehicle-types`);
    }, [t, originId, userId, router, orgLink, orgId, vehicleType?.updatedAt, vehicleType?.name, showNotification]);

    // Data not found
    if (!isLoading && !vehicleType) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/vehicle-types${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("vehicle_type.title")}
          description={t("vehicle_type.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="vehicle-type"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(vehicleType?.createdByUser.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="vehicle-type" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/vehicle-types/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="vehicle-type"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(vehicleType?.createdByUser.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/settings/vehicle-types/${encryptedId}/edit`}>
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
              <CardHeader loading={isLoading} title={t("vehicle_type.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("vehicle_type.name")} loading={isLoading}>
                  {vehicleType?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 multiline label={t("vehicle_type.driver_expense_rate")} loading={isLoading}>
                  <NumberLabel value={vehicleType?.driverExpenseRate || 100} unit="%" />
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("vehicle_type.description")} loading={isLoading}>
                  {vehicleType?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("vehicle_type.status")} loading={isLoading}>
                  <Badge
                    label={vehicleType?.isActive ? t("vehicle_type.status_active") : t("vehicle_type.status_inactive")}
                    color={vehicleType?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={vehicleType} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: vehicleType?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "vehicle-type",
    action: "detail",
  }
);
