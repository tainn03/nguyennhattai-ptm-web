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
import { useIdParam, usePermission, useUnitOfMeasure } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useUnitOfMeasureState } from "@/redux/states";
import { deleteUnitOfMeasure } from "@/services/client/unitOfMeasure";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { showNotification } = useNotification();
    const { searchQueryString } = useUnitOfMeasureState();
    const { setBreadcrumb } = useBreadcrumb();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("unit-of-measure");
    const { unitOfMeasure, isLoading } = useUnitOfMeasure({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("unit_of_measure.title"), link: `${orgLink}/settings/unit-of-measures${searchQueryString}` },
        {
          name: unitOfMeasure?.name || `${encryptedId}`,
          link: `${orgLink}/settings/unit-of-measures/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unitOfMeasure?.name, orgLink]);

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
      if (unitOfMeasure?.isSystem) {
        return;
      }

      if (originId && userId) {
        const { error } = await deleteUnitOfMeasure(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          unitOfMeasure?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: unitOfMeasure?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: unitOfMeasure?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/unit-of-measures${searchQueryString}`);
    }, [
      originId,
      userId,
      router,
      orgLink,
      searchQueryString,
      unitOfMeasure?.isSystem,
      unitOfMeasure?.updatedAt,
      unitOfMeasure?.name,
      orgId,
      showNotification,
      t,
    ]);

    // Data not found
    if (!isLoading && !unitOfMeasure) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/unit-of-measures${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("unit_of_measure.title")}
          description={t("unit_of_measure.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              {!unitOfMeasure?.isSystem && (
                <Authorization
                  resource="unit-of-measure"
                  action="delete"
                  alwaysAuthorized={canDeleteOwn() && equalId(unitOfMeasure?.createdByUser.id, userId)}
                >
                  <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                    {t("common.delete")}
                  </Button>
                </Authorization>
              )}

              {/* Copy */}
              <Authorization resource="unit-of-measure" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/unit-of-measures/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="unit-of-measure"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(unitOfMeasure?.createdByUser.id, userId)}
              >
                <Button
                  as={Link}
                  disabled={isLoading}
                  href={`${orgLink}/settings/unit-of-measures/${encryptedId}/edit`}
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
              <CardHeader loading={isLoading} title={t("unit_of_measure.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("unit_of_measure.code")} loading={isLoading}>
                  {unitOfMeasure?.code}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("unit_of_measure.name")} loading={isLoading}>
                  {unitOfMeasure?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("unit_of_measure.description")} loading={isLoading}>
                  {unitOfMeasure?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("unit_of_measure.status")} loading={isLoading}>
                  <Badge
                    label={
                      unitOfMeasure?.isActive
                        ? t("unit_of_measure.status_active")
                        : t("unit_of_measure.status_inactive")
                    }
                    color={unitOfMeasure?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={unitOfMeasure} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: unitOfMeasure?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "unit-of-measure",
    action: "detail",
  }
);
