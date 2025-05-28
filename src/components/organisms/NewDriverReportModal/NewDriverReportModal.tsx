"use client";

import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { ModalContent, ModalHeader } from "@/components/atoms";
import { Modal } from "@/components/molecules";
import DriverReportForm from "@/components/organisms/DriverReportForm/DriverReportForm";
import { DriverReportInputForm } from "@/forms/driverReport";
import { WorkflowInputForm } from "@/forms/workflow";
import { useAuth } from "@/hooks";
import { DriverReportInfo } from "@/types/strapi";

export type NewDriverReportModalProps = {
  open: boolean;
  onClose: () => void;
  screenMode?: "NEW" | "EDIT";
  driverReportSelected?: Partial<DriverReportInfo>;
};

const NewDriverReportModal = ({
  open,
  onClose,
  screenMode = "NEW",
  driverReportSelected,
}: NewDriverReportModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink, org, userId, user } = useAuth();

  const { values, setFieldValue } = useFormikContext<WorkflowInputForm>();

  /**
   * Handles changes to the driver report input form and updates the list of driver reports accordingly.
   *
   * @param newReport - The new driver report data entered in the form.
   */
  const handleDriverReportChange = useCallback(
    (newReport: DriverReportInputForm) => {
      const driverReports = values.driverReports || [];
      if (screenMode === "NEW") {
        const maxDisplayOrder =
          driverReports.length > 0 ? Math.max(...driverReports.map((report) => report.displayOrder ?? 0)) : 0;
        const newDriverReportData = {
          ...newReport,
          displayOrder: maxDisplayOrder + 1,
        };
        const updatedReports = [...driverReports, newDriverReportData];
        setFieldValue("driverReports", updatedReports);
      } else {
        const updatedReports = driverReports.map((report) =>
          report.name === driverReportSelected?.name ? { ...report, ...newReport } : report
        );
        setFieldValue("driverReports", updatedReports);
      }
    },
    [values.driverReports, screenMode, driverReportSelected, setFieldValue]
  );

  return (
    <Modal open={open} size="5xl" showCloseButton onClose={onClose} onDismiss={onClose}>
      <ModalHeader title={t("driver_report.title")} />
      <ModalContent className="space-y-6">
        {orgId && orgLink && org && userId && user && (
          <DriverReportForm
            inModal
            {...{ orgId, orgLink, org, userId, user }}
            screenMode={screenMode}
            driverReportSelected={driverReportSelected}
            driverReportList={values.driverReports}
            onChange={handleDriverReportChange}
            onClose={onClose}
          />
        )}
      </ModalContent>
    </Modal>
  );
};

export default NewDriverReportModal;
