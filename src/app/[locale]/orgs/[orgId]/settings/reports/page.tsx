"use client";

import { OrganizationReportType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

import { Spinner } from "@/components/atoms";
import { Authorization, InputGroup, TextField } from "@/components/molecules";
import { organizationReportOptions } from "@/configs/media";
import { REPORT_LIST } from "@/constants/report";
import { useOrganizationReports, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { uploadReportFile } from "@/services/client/organizationReport";
import { withOrg } from "@/utils/client";
import { bytesToSize, getFileExtension } from "@/utils/file";

import { ReportRadioGroup } from "./components";

export default withOrg(
  ({ orgLink, orgId }) => {
    const t = useTranslations();
    const { organizationReports, mutate } = useOrganizationReports({ organizationId: orgId });
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();
    const [isUploading, setIsUploading] = useState(false);
    const { canNew } = usePermission("organization-report");

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("org_setting_report.title"), link: `${orgLink}/settings/reports` },
      ]);

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getReportListByType = useCallback(
      (type: OrganizationReportType) => {
        return organizationReports.filter((item) => item.type === type);
      },
      [organizationReports]
    );

    /**
     * This function is a callback that handles avatar file selection and upload.
     * It performs checks for file extension and size, updates the form's avatar URL,
     * and uploads the selected file to the server.
     *
     * @param event - The change event triggered by the file input element.
     */
    const handleUploadReport = useCallback(
      (type: OrganizationReportType) => async (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.target instanceof HTMLInputElement && event.target.files) {
          const file = event.target.files[0];

          // Check file extension
          const ext = getFileExtension(file.name);
          if (!organizationReportOptions.fileTypes.includes(ext)) {
            showNotification({
              color: "warning",
              message: t("org_setting_report.wrong_file_type_error", {
                types: organizationReportOptions.fileTypes.join(", "),
              }),
            });
            return false;
          }

          // Check file size
          if (file.size > organizationReportOptions.maxFileSize) {
            showNotification({
              color: "warning",
              message: t("org_setting_report.wrong_file_size_error", {
                size: bytesToSize(organizationReportOptions.maxFileSize),
              }),
            });
            return false;
          }
          setIsUploading(true);
          const { data, error } = await uploadReportFile({ type, organizationId: orgId }, file);

          if (error) {
            showNotification({
              color: "error",
              title: t("common.message.save_error_title"),
              message: t("common.message.save_error_unknown", { name: file.name }),
            });
          } else {
            showNotification({
              color: "success",
              title: t("common.message.save_success_title"),
              message: t("common.message.save_success_message", { name: data.name }),
            });
          }
          mutate();
        }
        setIsUploading(false);
      },
      [mutate, orgId, showNotification, t]
    );

    /**
     * This function is called with a report type and returns true if the report type is either INVOICE or SUBCONTRACTOR_COST.
     * It is used to hide certain report types in the UI.
     *
     * @param {OrganizationReportType} type - The report type to check.
     * @returns {boolean} True if the report type is either INVOICE or SUBCONTRACTOR_COST, false otherwise.
     */
    const isHidden = useCallback((type: OrganizationReportType) => type === OrganizationReportType.INVOICE, []);

    return (
      <div className="space-y-12">
        {REPORT_LIST.map((item) => (
          <InputGroup
            title={t(`org_setting_report.${item.type}_title`.toLowerCase())}
            description={t("org_setting_report.template_description")}
            key={item.type}
            className={clsx({
              hidden: isHidden(item.type),
            })}
          >
            <div className="col-span-full">
              <h2 className="text-sm font-medium leading-6 text-gray-900">
                {t(`org_setting_report.${item.type}_template_setting`.toLowerCase())}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t(`org_setting_report.${item.type}_download_template`.toLowerCase(), {
                  types: organizationReportOptions.fileTypes.join(", "),
                })}
              </p>

              <ReportRadioGroup reportFileList={getReportListByType(item.type)} />
              <Authorization resource="organization-report" action="new" alwaysAuthorized={canNew()}>
                <div className="flex py-6">
                  <div>
                    <label
                      htmlFor={`${item.type}-upload`}
                      className={clsx(
                        "flex cursor-pointer gap-x-3 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50",
                        {
                          "cursor-not-allowed opacity-50": isUploading,
                        }
                      )}
                    >
                      <span>{t(`org_setting_report.${item.type}_upload_template`.toLowerCase())}</span>
                      {isUploading && <Spinner size="small" className="mt-0.5" />}
                      <TextField
                        id={`${item.type}-upload`}
                        type="file"
                        accept={organizationReportOptions.fileTypes.join(",")}
                        className="sr-only"
                        disabled={isUploading}
                        onChange={handleUploadReport(item.type)}
                      />
                    </label>
                    <p className="mt-3 text-xs text-gray-500">
                      {t("org_setting_report.file_type_description", {
                        types: organizationReportOptions.fileTypes.join(", "),
                        size: bytesToSize(organizationReportOptions.maxFileSize),
                      })}
                    </p>
                  </div>
                </div>
              </Authorization>
            </div>
          </InputGroup>
        ))}
      </div>
    );
  },
  {
    resource: "organization-report",
    action: ["find"],
  }
);
