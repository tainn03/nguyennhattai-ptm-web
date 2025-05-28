"use client";

import { useAtom } from "jotai";
import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { deleteWorkflow } from "@/actions/workflow";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  DetailDataNotFound,
  Link,
  Visible,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal, DriverReportTable } from "@/components/organisms";
import { useIdParam, usePermission, useWorkflow } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { workFlowAtom } from "@/states";
import { HttpStatusCode } from "@/types/api";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgLink, userId, orgId }) => {
    const t = useTranslations();
    const router = useRouter();

    const { setBreadcrumb } = useBreadcrumb();
    const { originId, encryptedId } = useIdParam();
    const [{ workFlowSearchQueryString }] = useAtom(workFlowAtom);
    const { showNotification } = useNotification();
    const { canEditOwn, canDeleteOwn } = usePermission("driver-report");

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const { workflow, isLoading } = useWorkflow({ organizationId: orgId, id: originId! });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("workflow.title"), link: `${orgLink}/settings/workflows${workFlowSearchQueryString}` },
        {
          name: workflow?.name || `${encryptedId}`,
          link: `${orgLink}/settings/workflows/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflow?.name, orgLink]);

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
        const { status } = await deleteWorkflow({
          entity: {
            id: originId,
            updatedById: userId,
          },
          lastUpdatedAt: workflow.updatedAt,
        });
        if (status !== HttpStatusCode.Ok) {
          if (status === HttpStatusCode.Exclusive) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: workflow?.name }),
            });
            handleDeleteCancel();
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: workflow?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: workflow?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/workflows${workFlowSearchQueryString}`);
    }, [
      originId,
      userId,
      router,
      orgLink,
      workFlowSearchQueryString,
      workflow.updatedAt,
      workflow?.name,
      showNotification,
      t,
      handleDeleteCancel,
    ]);

    // Data not found
    if (!isLoading && isEmpty(workflow)) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/workflows${workFlowSearchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("workflow.title")}
          description={t("workflow.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Visible when={!workflow.isSystem}>
                <Authorization
                  resource="workflow"
                  action="delete"
                  alwaysAuthorized={canDeleteOwn() && equalId(workflow?.createdByUser?.id, userId)}
                >
                  <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                    {t("common.delete")}
                  </Button>
                </Authorization>
              </Visible>

              {/* Copy */}
              <Authorization resource="workflow" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/workflows/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="workflow"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(workflow?.createdByUser?.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/settings/workflows/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:gap-8">
          {/* General */}
          <div className="flex flex-1 flex-col gap-4 sm:gap-6 lg:gap-8">
            <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
              <Card className="flex-1">
                <CardHeader loading={isLoading} title={t("driver_report.general_title")} />
                <CardContent>
                  <DescriptionProperty2 label={t("driver_report.name")} loading={isLoading}>
                    {workflow?.name}
                  </DescriptionProperty2>

                  <DescriptionProperty2 count={3} multiline label={t("driver_report.description")} loading={isLoading}>
                    {workflow?.description}
                  </DescriptionProperty2>

                  <DescriptionProperty2 label={t("driver_report.status")} loading={isLoading}>
                    <Badge
                      label={workflow?.isActive ? t("driver_report.status_active") : t("driver_report.status_inactive")}
                      color={workflow?.isActive ? "success" : "error"}
                    />
                  </DescriptionProperty2>
                </CardContent>
              </Card>

              <SystemInfoCard loading={isLoading} entity={workflow} />
            </div>

            <Card>
              <CardHeader loading={isLoading} title={t("driver_report.title")} />
              <CardContent padding={false}>
                <DriverReportTable loadingRow={isLoading} inside driverReports={workflow?.driverReports} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: workflow?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "workflow",
    action: "detail",
  }
);
