"use client";

import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { BiArrowToBottom, BiArrowToTop, BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";

import { Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { EmptyListSection } from "@/components/molecules";
import { ConfirmModal, NewDriverReportDetailModal } from "@/components/organisms";
import { DriverReportDetailInputForm } from "@/forms/driverReport";

export type DriverReportDetailProps = {
  data: DriverReportDetailInputForm[];
  onChange?: (data: DriverReportDetailInputForm[]) => void;
  className?: string;
};

const DriverReportDetailList = ({ data, className, onChange }: DriverReportDetailProps) => {
  const t = useTranslations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedDriverReportDetail, setSelectedDriverReportDetail] = useState<DriverReportDetailInputForm | null>();

  /**
   * Handles the opening of a modal when an anchor element is clicked.
   * Prevents the default behavior of the anchor element and sets the modal state to open.
   */
  const handleOpenModal = useCallback((event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    event.preventDefault();
    setIsModalOpen(true);
  }, []);

  /**
   * Handles the closing of the modal by resetting the selected driver report detail and setting the modal state to closed.
   */
  const handleCloseModal = useCallback(() => {
    setSelectedDriverReportDetail(null);
    setIsModalOpen(false);
  }, []);

  /**
   * Handles the editing of a driver report detail item by setting the selected item and opening the modal.
   */
  const handleEdit = useCallback(
    (item: DriverReportDetailInputForm) => () => {
      setSelectedDriverReportDetail(item);
      setIsModalOpen(true);
    },
    []
  );

  /**
   * Handles the saving of a driver report detail item by updating the data and closing the modal.
   */
  const handleSave = useCallback(
    (values: DriverReportDetailInputForm) => {
      let driverReportDetail: DriverReportDetailInputForm = {};
      const newData = [...data];

      if (selectedDriverReportDetail?.id) {
        // Screen mode is edit
        const index = newData.findIndex((x) => x.id === values.id);
        if (index !== -1) {
          newData[index] = values;
        }
      } else {
        // Find the largest id currently in the list
        const maxId = newData.length > 0 ? Math.max(...newData.map((x) => x.id ?? 0)) : 0;
        const maxDisplayOrder = newData.length > 0 ? Math.max(...newData.map((x) => x.displayOrder ?? 0)) : 0;

        // Create new record with unique id and displayOrder
        driverReportDetail = { ...values, id: maxId + 1, displayOrder: maxDisplayOrder + 1 };
        newData.push(driverReportDetail);
      }

      setSelectedDriverReportDetail(null);
      setIsModalOpen(false);
      onChange && onChange(newData);
    },
    [data, onChange, selectedDriverReportDetail?.id]
  );

  /**
   * Handles the opening of the delete confirmation dialog when a delete button is clicked.
   */
  const handleOpenDeleteConfirm = useCallback(
    (item: DriverReportDetailInputForm) => () => {
      setSelectedDriverReportDetail(item);
      setIsDeleteConfirmOpen(true);
    },
    []
  );

  /**
   * Handles the closing of the delete confirmation dialog.
   */
  const handleCloseDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  /**
   * Handles the deletion of a driver report detail item by filtering it out from the data and closing the confirmation dialog.
   */
  const handleDeleteDriverReportDetail = useCallback(() => {
    const inputData = data.filter((x) => x.id !== selectedDriverReportDetail?.id);
    onChange && onChange(inputData);
    setSelectedDriverReportDetail(null);
    setIsDeleteConfirmOpen(false);
  }, [data, onChange, selectedDriverReportDetail?.id]);

  /**
   * Handles the movement of an item within a list from one index to another.
   *
   * @param currentIndex - The current index of the item to be moved.
   * @param newIndex - The target index where the item should be moved.
   * @returns A function that performs the item movement when invoked.
   */
  const handleMoveItem = useCallback(
    (currentIndex: number, newIndex: number) => () => {
      if (currentIndex < 0 || currentIndex > data.length - 1 || currentIndex === newIndex) {
        return;
      }

      const newList = [...data];
      const [removedItem] = newList.splice(currentIndex, 1);

      newList.splice(newIndex, 0, removedItem);
      newList.forEach((item, idx) => {
        item.displayOrder = idx + 1;
      });
      onChange && onChange(newList);
    },
    [data, onChange]
  );

  return (
    <div className={className}>
      <TableContainer variant="paper" className="!mt-0" horizontalScroll inside>
        <Table dense>
          <TableHead uppercase>
            <TableRow>
              <TableCell align="right" className="w-7 !pl-0">
                {t("driver_report.checklist_item_no")}
              </TableCell>
              <TableCell>{t("driver_report.name")}</TableCell>
              <TableCell>{t("driver_report.description")}</TableCell>
              <TableCell className="w-12">
                <span className="sr-only">{t("common.actions")}</span>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.length === 0 && (
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
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell align="right">{index + 1}</TableCell>
                <TableCell nowrap={false}>{item.name}</TableCell>
                <TableCell nowrap={false}>{item.description}</TableCell>
                <TableCell className="group flex items-center justify-end">
                  {index !== 0 && (
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
                  {index !== data.length - 1 && (
                    <>
                      <BiDownArrowAlt
                        onClick={handleMoveItem(index, index + 1)}
                        title={t("driver_report.move_downward")}
                        className="mr-2 h-5 w-5 hover:cursor-pointer group-hover:text-gray-900"
                        aria-hidden="true"
                      />
                      <BiArrowToBottom
                        onClick={handleMoveItem(index, data.length - 1)}
                        title={t("driver_report.move_to_bottom")}
                        className="mr-2 h-5 w-5 hover:cursor-pointer group-hover:text-gray-900"
                        aria-hidden="true"
                      />
                    </>
                  )}
                  <PencilSquareIcon
                    onClick={handleEdit(item)}
                    title={t("common.edit")}
                    className="mr-2 h-5 w-5 hover:cursor-pointer group-hover:text-gray-900"
                    aria-hidden="true"
                  />
                  <TrashIcon
                    onClick={handleOpenDeleteConfirm(item)}
                    title={t("common.delete")}
                    className="h-5 w-5 text-red-400 hover:cursor-pointer group-hover:text-red-600"
                    aria-hidden="true"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="mt-2">
        <Link useDefaultStyle href="" className="font-semibold" type="button" onClick={handleOpenModal}>
          <span aria-hidden="true">+</span> {t("driver_report.checklist_new")}
        </Link>
      </div>

      {/* New driver report detail modal */}
      <NewDriverReportDetailModal
        open={isModalOpen}
        onClose={handleCloseModal}
        data={data}
        selectedDriverReportDetail={selectedDriverReportDetail}
        onSave={handleSave}
      />

      {/* Delete confirmation dialog */}
      <ConfirmModal
        open={isDeleteConfirmOpen}
        icon="question"
        title={t("common.confirmation.delete_title", { name: selectedDriverReportDetail?.name })}
        message={t("common.confirmation.delete_message")}
        onClose={handleCloseDeleteConfirm}
        onCancel={handleCloseDeleteConfirm}
        onConfirm={handleDeleteDriverReportDetail}
      />
    </div>
  );
};

export default DriverReportDetailList;
