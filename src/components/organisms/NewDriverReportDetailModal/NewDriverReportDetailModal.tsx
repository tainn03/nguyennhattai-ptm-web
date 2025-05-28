"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";
import { DriverReportDetailInputForm, driverReportDetailInputFormSchema } from "@/forms/driverReport";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: DriverReportDetailInputForm = {
  name: "",
  description: "",
  displayOrder: 0,
};

export type NewDriverReportDetailModalProps = {
  open: boolean;
  data: DriverReportDetailInputForm[];
  selectedDriverReportDetail?: DriverReportDetailInputForm | null;
  onClose: () => void;
  onSave: (values: DriverReportDetailInputForm) => void;
};

const NewDriverReportDetailModal = ({
  open,
  data,
  selectedDriverReportDetail,
  onSave,
  onClose,
}: NewDriverReportDetailModalProps) => {
  const t = useTranslations();

  useEffect(() => {
    resetForm({
      values: {
        ...selectedDriverReportDetail,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriverReportDetail]);

  /**
   * Checks if a given name already exists in the data array, excluding the item with the specified ID.
   *
   * @param id - The ID of the item to exclude from the check.
   * @param name - The name to check for existence in the data array.
   * @returns A boolean indicating whether the name exists in the data array (excluding the specified ID).
   */
  const checkNameExist = useCallback(
    (id: number, name: string) => {
      let isNameExist = false;
      data.forEach((item) => {
        if (ensureString(item.name?.trim()) === name.trim() && Number(item.id !== id)) {
          isNameExist = true;
          return;
        }
      });

      return isNameExist;
    },
    [data]
  );

  /**
   * Handles the form submission for creating or editing a driver report detail.
   * Validates the name to ensure it doesn't already exist in the data array.
   *
   * @param values - The form values submitted by the user.
   * @param formikHelpers - Formik helpers for managing form state and errors.
   */
  const handleSubmitFormik = useCallback(
    (values: DriverReportDetailInputForm, formikHelpers: FormikHelpers<DriverReportDetailInputForm>) => {
      const isNameExist = checkNameExist(Number(values?.id), ensureString(values.name));

      formikHelpers.setSubmitting(false);
      if (isNameExist) {
        formikHelpers.setFieldError("name", errorExists("driver_report.checklist_item_name"));
        return;
      } else {
        formikHelpers.resetForm({
          values: initialFormValues,
        });
        onSave && onSave(values);
      }
    },
    [checkNameExist, onSave]
  );

  const { values, touched, errors, isSubmitting, handleChange, resetForm, handleSubmit } =
    useFormik<DriverReportDetailInputForm>({
      initialValues: initialFormValues,
      validationSchema: driverReportDetailInputFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

  /**
   * Handles the closing of the modal.
   * Resets the form to its initial values and invokes the `onClose` callback if provided.
   */
  const handleClose = useCallback(() => {
    resetForm({ values: initialFormValues });
    onClose && onClose();
  }, [onClose, resetForm]);

  return (
    <Modal open={open} showCloseButton onClose={handleClose} onDismiss={handleClose}>
      <form method="POST" onSubmit={handleSubmit}>
        <ModalHeader
          title={
            selectedDriverReportDetail
              ? t("driver_report.checklist_item_edit_title")
              : t("driver_report.checklist_item_new_title")
          }
        />
        <ModalContent className="space-y-6">
          <TextField
            label={t("driver_report.checklist_item_name")}
            name="name"
            required
            maxLength={255}
            value={values.name}
            onChange={handleChange}
            errorText={formatError(t, touched.name && errors.name)}
          />
          <TextField
            label={t("driver_report.checklist_item_description")}
            name="description"
            multiline
            rows={4}
            showCount
            maxLength={500}
            value={ensureString(values.description)}
            onChange={handleChange}
            errorText={formatError(t, touched.description && errors.description)}
          />
        </ModalContent>
        <ModalActions>
          <Button type="button" variant="outlined" color="secondary" disabled={isSubmitting} onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {t("common.save")}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
};

export default NewDriverReportDetailModal;
