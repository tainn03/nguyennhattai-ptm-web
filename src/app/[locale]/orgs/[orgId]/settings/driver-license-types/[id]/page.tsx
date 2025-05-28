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
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useDriverLicenseType, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverLicenseTypeState } from "@/redux/states";
import { deleteDriverLicenseType } from "@/services/client/driverLicenseType";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { showNotification } = useNotification();
    const { searchQueryString } = useDriverLicenseTypeState();
    const { setBreadcrumb } = useBreadcrumb();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("driver-license-type");
    const { driverLicenseType, isLoading } = useDriverLicenseType({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("driver_license_type.title"), link: `${orgLink}/settings/driver-license-types${searchQueryString}` },
        {
          name: driverLicenseType?.name || `${encryptedId}`,
          link: `${orgLink}/settings/driver-license-types/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverLicenseType?.name, orgLink]);

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
        const { error } = await deleteDriverLicenseType(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          driverLicenseType?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: driverLicenseType?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: driverLicenseType?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/driver-license-types${searchQueryString}`);
    }, [
      driverLicenseType?.updatedAt,
      driverLicenseType?.name,
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
    if (!isLoading && !driverLicenseType) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/driver-license-types${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("driver_license_type.title")}
          description={t("driver_license_type.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="driver-license-type"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(driverLicenseType?.createdByUser.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="driver-license-type" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/driver-license-types/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="driver-license-type"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(driverLicenseType?.createdByUser.id, userId)}
              >
                <Button
                  as={Link}
                  disabled={isLoading}
                  href={`${orgLink}/settings/driver-license-types/${encryptedId}/edit`}
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
              <CardHeader loading={isLoading} title={t("driver_license_type.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("driver_license_type.name")} loading={isLoading}>
                  {driverLicenseType?.name}
                </DescriptionProperty2>
                <DescriptionProperty2
                  count={3}
                  multiline
                  label={t("driver_license_type.description")}
                  loading={isLoading}
                >
                  {driverLicenseType?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("driver_license_type.status")} loading={isLoading}>
                  <Badge
                    label={
                      driverLicenseType?.isActive
                        ? t("driver_license_type.status_active")
                        : t("driver_license_type.status_inactive")
                    }
                    color={driverLicenseType?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={driverLicenseType} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: driverLicenseType?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "driver-license-type",
    action: "detail",
  }
);
