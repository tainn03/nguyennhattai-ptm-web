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
import { useIdParam, useMerchandiseType, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useMerchandiseTypeState } from "@/redux/states";
import { deleteMerchandiseType } from "@/services/client/merchandiseType";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { showNotification } = useNotification();
    const { searchQueryString } = useMerchandiseTypeState();
    const { setBreadcrumb } = useBreadcrumb();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("merchandise-type");
    const { merchandiseType, isLoading } = useMerchandiseType({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("merchandise_type.title"), link: `${orgLink}/settings/merchandise-types${searchQueryString}` },
        {
          name: merchandiseType?.name || `${encryptedId}`,
          link: `${orgLink}/settings/merchandise-types/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [merchandiseType?.name, orgLink]);

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
        const { error } = await deleteMerchandiseType(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          merchandiseType?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: merchandiseType?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: merchandiseType?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/merchandise-types${searchQueryString}`);
    }, [
      merchandiseType?.name,
      merchandiseType?.updatedAt,
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
    if (!isLoading && !merchandiseType) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/merchandise-types${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("merchandise_type.title")}
          description={t("merchandise_type.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="merchandise-type"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(merchandiseType?.createdByUser.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="merchandise-type" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/merchandise-types/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="merchandise-type"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(merchandiseType?.createdByUser.id, userId)}
              >
                <Button
                  as={Link}
                  disabled={isLoading}
                  href={`${orgLink}/settings/merchandise-types/${encryptedId}/edit`}
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
              <CardHeader loading={isLoading} title={t("merchandise_type.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("merchandise_type.name")} loading={isLoading}>
                  {merchandiseType?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("merchandise_type.description")} loading={isLoading}>
                  {merchandiseType?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("merchandise_type.status")} loading={isLoading}>
                  <Badge
                    label={
                      merchandiseType?.isActive
                        ? t("merchandise_type.status_active")
                        : t("merchandise_type.status_inactive")
                    }
                    color={merchandiseType?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={merchandiseType} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: merchandiseType?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "merchandise-type",
    action: "detail",
  }
);
