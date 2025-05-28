"use client";

import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { BiArrowToBottom, BiArrowToTop, BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";

import { SkeletonTableRow, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { EmptyListSection } from "@/components/molecules";
import { ConfirmModal, NewDriverReportModal } from "@/components/organisms";
import { WorkflowInputForm } from "@/forms/workflow";
import { DriverReportInfo } from "@/types/strapi";

export type DriverReportListProps = {
  className?: string;
  isLoadingDriverReports?: boolean;
};

const DriverReportList = ({ className, isLoadingDriverReports }: DriverReportListProps) => {
  const t = useTranslations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Partial<DriverReportInfo> | null>(null);

  const { values, setFieldValue } = useFormikContext<WorkflowInputForm>();

  /**
   * Handle open modal to add/edit driver report
   * @param driverReport Driver report info
   */
  const handleOpenModal = useCallback(
    (driverReport: Partial<DriverReportInfo> | null) => () => {
      setSelectedReport(driverReport);
      setIsModalOpen(true);
    },
    []
  );

  /**
   * Handle delete button click
   * @param driverReport Driver report info
   */
  const handleDeleteClick = useCallback(
    (driverReport: Partial<DriverReportInfo>) => () => {
      setSelectedReport(driverReport);
      setIsDeleteConfirmOpen(true);
    },
    []
  );

  /**
   * Handle cancel confirmation dialog
   */
  const handleCancelConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = useCallback(() => {
    if (selectedReport) {
      const updatedReports = values.driverReports?.filter((item) => item.name !== selectedReport.name);
      setFieldValue("driverReports", updatedReports);
      setIsDeleteConfirmOpen(false);
      setSelectedReport(null);
    }
  }, [selectedReport, values.driverReports, setFieldValue]);

  /**
   * Handle close modal
   */
  const handleCloseNewDriverReportModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  /**
   * Handle move item up/down
   * @param currentIndex Current index of the item
   * @param newIndex New index of the item
   */
  const handleMoveItem = useCallback(
    (currentIndex: number, newIndex: number) => () => {
      if (values.driverReports) {
        if (currentIndex < 0 || currentIndex > values.driverReports.length - 1 || currentIndex === newIndex) {
          return;
        }

        const newList = [...values.driverReports];
        const [removedItem] = newList.splice(currentIndex, 1);

        newList.splice(newIndex, 0, removedItem);
        newList.forEach((item, idx) => {
          item.displayOrder = idx + 1;
        });
        setFieldValue("driverReports", newList);
      }
    },
    [values.driverReports, setFieldValue]
  );

  return (
    <div className={className}>
      <TableContainer variant="paper" inside horizontalScroll className="!mt-0">
        <Table dense>
          <TableHead uppercase>
            <TableRow>
              <TableCell align="right" action className="!pl-0">
                {t("driver_report.checklist_item_no")}
              </TableCell>
              <TableCell>{t("driver_report.name")}</TableCell>
              <TableCell>{t("driver_report.description")}</TableCell>
              <TableCell action className="w-12">
                <span className="sr-only">{t("common.actions")}</span>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {/* Loading */}
            {isLoadingDriverReports && <SkeletonTableRow rows={10} columns={4} />}

            {/* Empty data */}
            {!isLoadingDriverReports && values.driverReports?.length === 0 && (
              <TableRow hover={false}>
                <TableCell colSpan={4}>
                  <EmptyListSection
                    title={t("driver_report.checklist_empty_title")}
                    description={t.rich("driver_report.checklist_empty_message", {
                      strong: (chunks) => <span className="font-medium">{chunks}</span>,
                      new: t("driver_report.checklist_new"),
                    })}
                  />
                </TableCell>
              </TableRow>
            )}

            {/* Data */}
            {values.driverReports?.map((item, index) => (
              <TableRow key={index}>
                <TableCell align="right">{index + 1}</TableCell>
                <TableCell nowrap={false}>{item?.name}</TableCell>
                <TableCell nowrap={false}>{item?.description || t("common.empty")}</TableCell>
                <TableCell className="group flex items-center justify-end">
                  {!item.isSystem && index !== 0 && (
                    <>
                      <BiArrowToTop
                        onClick={handleMoveItem(index, 0)}
                        title={t("driver_report.move_to_top")}
                        className="mr-2 h-5 w-5 hover:cursor-pointer group-hover:text-gray-900"
                        aria-hidden="true"
                      />
                      <BiUpArrowAlt
                        onClick={handleMoveItem(index, index - 1)}
                        title={t("driver_report.move_upward")}
                        className="mr-2 h-5 w-5 hover:cursor-pointer group-hover:text-gray-900"
                        aria-hidden="true"
                      />
                    </>
                  )}
                  {!item?.isSystem && index !== (values.driverReports?.length ?? 0) - 1 && (
                    <>
                      <BiDownArrowAlt
                        onClick={handleMoveItem(index, index + 1)}
                        title={t("driver_report.move_downward")}
                        className="mr-2 h-5 w-5 hover:cursor-pointer group-hover:text-gray-900"
                        aria-hidden="true"
                      />
                      <BiArrowToBottom
                        onClick={handleMoveItem(index, (values.driverReports?.length ?? 0) - 1)}
                        title={t("driver_report.move_to_bottom")}
                        className="mr-2 h-5 w-5 hover:cursor-pointer group-hover:text-gray-900"
                        aria-hidden="true"
                      />
                    </>
                  )}
                  <PencilSquareIcon
                    title={t("common.edit")}
                    onClick={handleOpenModal(item)}
                    className="mr-2 h-5 w-5 hover:cursor-pointer group-hover:text-gray-900"
                    aria-hidden="true"
                  />
                  {!item?.isSystem && (
                    <TrashIcon
                      title={t("common.delete")}
                      onClick={handleDeleteClick(item)}
                      className="h-5 w-5 text-red-400 hover:cursor-pointer group-hover:text-red-600"
                      aria-hidden="true"
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="mt-2">
        <div
          className="cursor-pointer text-sm font-medium leading-6 text-blue-700 hover:text-blue-600"
          onClick={handleOpenModal(null)}
        >
          <span aria-hidden="true">+</span> {t("driver_report.add")}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmModal
        open={isDeleteConfirmOpen}
        icon="question"
        title={t("common.confirmation.delete_title", { name: selectedReport?.name || "" })}
        message={t("common.confirmation.delete_message")}
        onConfirm={handleDeleteConfirm}
        onClose={handleCancelConfirm}
        onCancel={handleCancelConfirm}
      />

      {/* Edit modal */}
      <NewDriverReportModal
        open={isModalOpen}
        onClose={handleCloseNewDriverReportModal}
        screenMode={selectedReport ? "EDIT" : "NEW"}
        driverReportSelected={selectedReport || undefined}
      />
    </div>
  );
};

export default DriverReportList;
