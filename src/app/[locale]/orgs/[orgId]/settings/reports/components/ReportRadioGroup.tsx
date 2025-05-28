"use client";

import { RadioGroup } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { PiDownload as PiDownloadIcon } from "react-icons/pi";
import { mutate } from "swr";

import { DateTimeLabel, Link } from "@/components/atoms";
import { Authorization } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useAuth, usePermission } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { activeOrganizationReport, deleteReportFiles } from "@/services/client/organizationReport";
import { OrganizationReportInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";

export type ReportRadioGroupProps = {
  reportFileList: OrganizationReportInfo[];
};

const ReportRadioGroup = ({ reportFileList }: ReportRadioGroupProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();

  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const { showNotification } = useNotification();
  const selectReportRef = useRef<OrganizationReportInfo>();
  const { canDelete, canDownload, canEdit } = usePermission("organization-report");

  const selectedReport = useMemo(() => {
    const currentReport = [...reportFileList];
    const selectedReport = currentReport.find((e) => e.isActive);
    return selectedReport ? selectedReport?.id : currentReport.find((e) => e.isSystem)?.id;
  }, [reportFileList]);

  /**
   * Handles the change event for a report file.
   */
  const handleChangeReportFile = useCallback(
    async (value: number) => {
      const selectedReportFile = reportFileList.find((e) => equalId(e.id, value));
      let result: boolean = false;
      if (selectedReportFile?.id) {
        result = await activeOrganizationReport({
          organizationId: orgId,
          id: selectedReportFile?.id,
          type: reportFileList && reportFileList[0].type,
          isSystem: selectedReportFile?.isSystem,
        });
      }

      if (result) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: selectedReportFile?.name }),
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("common.message.save_error_unknown", { name: selectedReportFile?.name }),
        });
      }
      mutate(["organization-reports", { organizationId: orgId }]);
    },
    [orgId, reportFileList, showNotification, t]
  );

  /**
   * Handles the delete event for a report.
   *
   * @param {OrganizationReportInfo} item - The report file to be deleted.
   */
  const handleDeleteReport = useCallback(
    (item: OrganizationReportInfo) => (event: MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      selectReportRef.current = item;
      if (selectedReport !== item.id) {
        setDeleteConfirmModalOpen(true);
      }
    },
    [selectedReport]
  );

  // /**
  //  * Handles the preview event for a report.
  //  *
  //  * @param {MouseEvent<HTMLAnchorElement>} event - The event for the preview.
  //  */
  // const handlePreviewReport = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
  //   event.preventDefault();
  // }, []);

  /**
   * Handles cancel the delete event for a report.
   */
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmModalOpen(false);
  }, []);

  /**
   * Handles the confirmation for deleting a report.
   *
   * @returns {Promise<void>} A promise that resolves when the deletion confirmation is processed.
   */
  const handleDeleteConfirmReport = useCallback(async () => {
    if (selectReportRef.current?.id && userId) {
      const { error } = await deleteReportFiles(
        {
          id: Number(selectReportRef.current?.id),
          updatedById: userId,
          organizationId: orgId,
        },
        selectReportRef.current?.updatedAt
      );

      if (error) {
        showNotification({
          color: "error",
          title: t("common.message.delete_error_title"),
          message: t("common.message.delete_error_message", { name: selectReportRef.current?.name }),
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.delete_success_title"),
          message: t("common.message.delete_success_message", { name: selectReportRef.current?.name }),
        });
        mutate(["organization-reports", { organizationId: orgId }]);
      }
    }
    handleDeleteCancel();
  }, [handleDeleteCancel, orgId, showNotification, t, userId]);

  const handleClickDownload = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <>
      <RadioGroup className="mt-6" value={selectedReport} onChange={handleChangeReportFile} disabled={!canEdit()}>
        <RadioGroup.Label className="sr-only" />
        <div className="-space-y-px rounded-md bg-white">
          {reportFileList.map((reportFile, index) => (
            <RadioGroup.Option
              key={reportFile.id}
              value={reportFile.id}
              className={({ checked }) =>
                clsx("relative flex border p-4 focus:outline-none", {
                  "rounded-tl-md rounded-tr-md": index === 0,
                  "rounded-bl-md rounded-br-md": index === reportFileList.length - 1,
                  "z-10 border-blue-200 bg-blue-50": checked,
                  "border-gray-200": !checked,
                  "cursor-pointer": canEdit(),
                  "cursor-not-allowed": !canEdit(),
                })
              }
            >
              {({ active, checked }) => (
                <>
                  <span
                    className={clsx("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", {
                      "border-transparent bg-blue-700": checked,
                      "border-gray-300 bg-white": !checked,
                      "ring-2 ring-blue-700 ring-offset-2": active,
                      "cursor-pointer": canEdit(),
                      "cursor-not-allowed": !canEdit(),
                    })}
                    aria-hidden="true"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <div className="ml-3 flex flex-col">
                    <RadioGroup.Label
                      as="span"
                      className={clsx("block text-sm font-medium", {
                        "text-blue-900": checked,
                        "text-gray-900": !checked,
                      })}
                    >
                      {reportFile.name}
                    </RadioGroup.Label>
                    <RadioGroup.Description
                      as="span"
                      className={clsx("block text-sm", {
                        "text-blue-800": checked,
                        "text-gray-500": !checked,
                      })}
                    >
                      {reportFile.isSystem ? (
                        <>{t("org_setting_report.system_standard_report_template")}</>
                      ) : (
                        <>
                          {t.rich("org_setting_report.upload_info", {
                            strong: (chunks) => <span className="font-semibold italic">{chunks}</span>,
                            updatedAt: () => (
                              <span className="italic">
                                <DateTimeLabel value={reportFile.updatedAt} type="datetime" />
                              </span>
                            ),
                            updatedBy: () => (
                              <span
                                // href={`/users/profile/${encryptId(reportFile.updatedByUser?.id)}`}
                                className="font-medium italic"
                              >
                                {getAccountInfo(reportFile.updatedByUser).displayName}
                              </span>
                            ),
                          })}
                        </>
                      )}
                    </RadioGroup.Description>
                  </div>

                  <div className="ml-3 flex flex-auto flex-col items-end gap-x-1 text-sm sm:flex-row sm:items-center sm:justify-end">
                    <Authorization resource="organization-report" action="download" alwaysAuthorized={canDownload()}>
                      <Link
                        useDefaultStyle
                        href={ensureString(reportFile?.template?.url)}
                        className="flex h-8 w-8 items-center justify-center"
                        target="_blank"
                        onClick={handleClickDownload}
                        useIntlLink={false}
                      >
                        <PiDownloadIcon
                          title={t("org_setting_report.download")}
                          className="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                          aria-hidden="true"
                        />
                      </Link>
                    </Authorization>
                    {/* <Link
                      href="/assets/files/example.docx"
                      className="flex h-8 w-8 items-center justify-center"
                      target="_blank"
                      onClick={handlePreviewReport}
                    >
                      <EyeIcon
                        title={t("org_setting_report.preview")}
                        className="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                        aria-hidden="true"
                      />
                    </Link> */}
                    <Authorization resource="organization-report" action="delete" alwaysAuthorized={canDelete()}>
                      {!reportFile.isSystem && (
                        <span
                          className={clsx("flex h-8 w-8 items-center justify-center", {
                            "cursor-not-allowed opacity-50": Number(selectedReport) === Number(reportFile?.id),
                          })}
                          onClick={handleDeleteReport(reportFile)}
                        >
                          <TrashIcon
                            title={t("org_setting_report.delete")}
                            className="h-5 w-5 text-red-400 group-hover:text-red-500"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </Authorization>
                  </div>
                </>
              )}
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>

      <ConfirmModal
        open={deleteConfirmModalOpen}
        icon="error"
        color="error"
        title={t("common.confirmation.delete_title", { name: ensureString(selectReportRef.current?.name) })}
        message={t("common.confirmation.delete_message")}
        onClose={handleDeleteCancel}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirmReport}
      />
    </>
  );
};

export default ReportRadioGroup;
