"use client";

import { useAtom } from "jotai";
import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { deleteExpenseType } from "@/actions/expenseType";
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
import { useExpenseType, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { expenseTypeAtom } from "@/states";
import { HttpStatusCode } from "@/types/api";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const [{ expenseTypeSearchQueryString }] = useAtom(expenseTypeAtom);
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("expense-type");

    const { expenseType, isLoading } = useExpenseType({
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        {
          name: t("expense_type.title"),
          link: `${orgLink}/settings/expense-types${expenseTypeSearchQueryString}`,
        },
        {
          name: expenseType?.name || t("common.empty"),
          link: `${orgLink}/settings/expense-types/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgLink, expenseType?.name]);

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
        const { status } = await deleteExpenseType({
          entity: {
            id: originId,
            updatedById: userId,
          },
          lastUpdatedAt: expenseType?.updatedAt,
        });
        if (status !== HttpStatusCode.Ok) {
          if (status === HttpStatusCode.Exclusive) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: expenseType?.name }),
            });
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: expenseType?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: expenseType?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/expense-types${expenseTypeSearchQueryString}`);
    }, [
      originId,
      userId,
      router,
      orgLink,
      expenseTypeSearchQueryString,
      expenseType?.updatedAt,
      expenseType?.name,
      showNotification,
      t,
    ]);

    // Data not found
    if (!isLoading && isEmpty(expenseType)) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/expense-types${expenseTypeSearchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("expense_type.title")}
          description={t("expense_type.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="expense-type"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(expenseType?.createdByUser?.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="expense-type" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/expense-types/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="expense-type"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(expenseType?.createdByUser?.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/settings/expense-types/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          {/* General Information */}
          <div className="flex flex-1 flex-col gap-4">
            <Card>
              <CardHeader loading={isLoading} title={t("expense_type.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("expense_type.name")} loading={isLoading}>
                  {expenseType?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("expense_type.key")} loading={isLoading}>
                  {expenseType?.key}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("expense_type.allow_customer_view_title")} loading={isLoading}>
                  <Badge
                    label={expenseType?.publicToCustomer ? t("expense_type.yes") : t("expense_type.no")}
                    color="info"
                  />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("expense_type.can_driver_view_title")} loading={isLoading}>
                  <Badge
                    label={expenseType?.canDriverView ? t("expense_type.yes") : t("expense_type.no")}
                    color="info"
                  />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("expense_type.can_driver_edit_title")} loading={isLoading}>
                  <Badge
                    label={expenseType?.canDriverEdit ? t("expense_type.yes") : t("expense_type.no")}
                    color="info"
                  />
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("expense_type.description")} loading={isLoading}>
                  {expenseType?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("expense_type.status")} loading={isLoading}>
                  <Badge
                    label={expenseType?.isActive ? t("expense_type.status_active") : t("expense_type.status_inactive")}
                    color={expenseType?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System Information */}
          <div className="w-full space-y-4 lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={expenseType} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: expenseType?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "expense-type",
    action: "detail",
  }
);
