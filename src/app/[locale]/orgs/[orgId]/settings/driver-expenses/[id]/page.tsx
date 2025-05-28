"use client";

import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { Link } from "@/components/atoms";
import { Badge, Card, CardContent, CardHeader, DescriptionProperty2, DetailDataNotFound } from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useDriverExpense, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverExpenseState } from "@/redux/states";
import { deleteDriverExpense } from "@/services/client/driverExpense";
import { ErrorType } from "@/types";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { searchQueryString } = useDriverExpenseState();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("driver-expense");

    const { driverExpense, isLoading } = useDriverExpense({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("driver_expense.title"), link: `${orgLink}/settings/driver-expenses${searchQueryString}` },
        {
          name: driverExpense?.name || `${encryptedId}`,
          link: `${orgLink}/settings/driver-expenses/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverExpense?.name, orgLink]);

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
      if (driverExpense?.isSystem) {
        return;
      }

      if (originId && userId) {
        const { error } = await deleteDriverExpense(
          {
            id: originId,
            organizationId: orgId,
            updatedById: userId,
          },
          driverExpense?.updatedAt
        );

        if (error) {
          if (error === ErrorType.EXCLUSIVE) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: driverExpense?.name }),
            });
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: driverExpense?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: driverExpense?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/driver-expenses${searchQueryString}`);
    }, [
      driverExpense?.isSystem,
      driverExpense?.updatedAt,
      driverExpense?.name,
      originId,
      userId,
      router,
      orgLink,
      searchQueryString,
      orgId,
      showNotification,
      t,
    ]);

    // Data not found
    if (!isLoading && isEmpty(driverExpense)) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/driver-expenses${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("driver_expense.title")}
          description={t("driver_expense.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              {!driverExpense?.isSystem && (
                <Authorization
                  resource="driver-expense"
                  action="delete"
                  alwaysAuthorized={canDeleteOwn() && equalId(1, userId)}
                >
                  <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                    {t("common.delete")}
                  </Button>
                </Authorization>
              )}

              {/* Copy */}
              <Authorization resource="driver-expense" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/driver-expenses/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}{" "}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="driver-expense"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(1, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/settings/driver-expenses/${encryptedId}/edit`}>
                  {t("common.edit")}{" "}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          {/* General */}
          <div className="flex flex-1 flex-col gap-4">
            <Card>
              <CardHeader loading={isLoading} title={t("driver_expense.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("driver_expense.name")} loading={isLoading}>
                  {driverExpense?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("driver_expense.key")} loading={isLoading}>
                  {driverExpense?.key}
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("driver_expense.description")} loading={isLoading}>
                  {driverExpense?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("driver_expense.status")} loading={isLoading}>
                  <Badge
                    label={
                      driverExpense?.isActive ? t("driver_expense.status_active") : t("driver_expense.status_inactive")
                    }
                    color={driverExpense?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full space-y-4 lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={driverExpense} />

            {driverExpense?.isSystem && (
              <Card>
                <CardHeader loading={isLoading} title={t("driver_expense.data_information")} />
                <CardContent>
                  <DescriptionProperty2 label={t("driver_expense.data_type")} loading={isLoading}>
                    <Badge label={t("driver_expense.data_type_system")} color="info" />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver_expense.expense_type")} loading={isLoading}>
                    {driverExpense?.type && t(`driver_expense.expense_status.${driverExpense.type}`.toLowerCase())}
                  </DescriptionProperty2>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: driverExpense?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "driver-expense",
    action: "detail",
  }
);
