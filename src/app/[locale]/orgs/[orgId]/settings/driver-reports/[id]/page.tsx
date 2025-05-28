"use client";

import isEmpty from "lodash/isEmpty";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useDriverReport, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverReportState } from "@/redux/states";
import { deleteDriverReport } from "@/services/client/driverReport";
import { ErrorType } from "@/types";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { searchQueryString } = useDriverReportState();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("driver-report");

    const { driverReport, driverReportDetails, isLoading } = useDriverReport({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("driver_report.title"), link: `${orgLink}/settings/driver-reports${searchQueryString}` },
        {
          name: driverReport?.name || `${encryptedId}`,
          link: `${orgLink}/settings/driver-reports/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverReport?.name, orgLink]);

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
      if (driverReport.isSystem) {
        return;
      }

      if (originId && userId) {
        const { error } = await deleteDriverReport(
          {
            id: originId,
            organizationId: orgId,
            updatedById: userId,
          },
          driverReport.updatedAt
        );

        if (error) {
          if (error === ErrorType.EXCLUSIVE) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: driverReport.name }),
            });
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: driverReport?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: driverReport?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/driver-reports${searchQueryString}`);
    }, [
      driverReport.isSystem,
      driverReport.updatedAt,
      driverReport.name,
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
    if (!isLoading && isEmpty(driverReport)) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/driver-reports${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("driver_report.title")}
          description={t("driver_report.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              {!driverReport?.isSystem && (
                <Authorization
                  resource="driver-report"
                  action="delete"
                  alwaysAuthorized={canDeleteOwn() && equalId(driverReport?.createdByUser?.id, userId)}
                >
                  <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                    {t("common.delete")}
                  </Button>
                </Authorization>
              )}

              {/* Copy */}
              <Authorization resource="driver-report" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/driver-reports/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}{" "}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="driver-report"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(driverReport?.createdByUser?.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/settings/driver-reports/${encryptedId}/edit`}>
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
              <CardHeader loading={isLoading} title={t("driver_report.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("driver_report.name")} loading={isLoading}>
                  {driverReport?.name}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("driver_report.is_required")} loading={isLoading}>
                  <Badge
                    label={driverReport?.isRequired ? t("driver_report.required") : t("driver_report.not_required")}
                    color="info"
                  />
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("driver_report.is_photo_required")} loading={isLoading}>
                  <Badge
                    label={
                      driverReport?.photoRequired
                        ? t("driver_report.photo_required")
                        : t("driver_report.photo_not_required")
                    }
                    color="info"
                  />
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("driver_report.is_bill_of_lading_required")} loading={isLoading}>
                  <Badge
                    label={
                      driverReport?.billOfLadingRequired ? t("driver_report.required") : t("driver_report.not_required")
                    }
                    color="info"
                  />
                </DescriptionProperty2>

                <DescriptionProperty2 count={3} multiline label={t("driver_report.description")} loading={isLoading}>
                  {driverReport?.description}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("driver_report.status")} loading={isLoading}>
                  <Badge
                    label={
                      driverReport?.isActive ? t("driver_report.status_active") : t("driver_report.status_inactive")
                    }
                    color={driverReport?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>

            {driverReportDetails?.length > 0 && (
              <Card>
                <CardHeader loading={isLoading} title={t("driver_report.checklist_title")} />
                <CardContent padding={false}>
                  <TableContainer variant="paper" className="!mt-0">
                    <Table dense>
                      <TableHead uppercase>
                        <TableRow>
                          <TableCell align="right" className="w-6 pl-0">
                            {t("driver_report.checklist_item_no")}
                          </TableCell>
                          <TableCell>{t("driver_report.name")}</TableCell>
                          <TableCell>{t("driver_report.description")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {driverReportDetails?.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell align="right">{index + 1}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell nowrap={false} className="max-w-4xl">
                              {item.description || t("common.empty")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* System info */}
          <div className="w-full space-y-4 lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={driverReport} />

            {driverReport?.isSystem && (
              <Card>
                <CardHeader loading={isLoading} title={t("driver_report.data_information")} />
                <CardContent>
                  <DescriptionProperty2 label={t("driver_report.data_type")} loading={isLoading}>
                    <Badge label={t("driver_report.data_type_system")} color="info" />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver_report.report_type")} loading={isLoading}>
                    {driverReport?.type && t(`driver_report.report_status_${driverReport.type}`.toLowerCase())}
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
          title={t("common.confirmation.delete_title", { name: driverReport?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "driver-report",
    action: "detail",
  }
);
