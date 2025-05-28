"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";
import { VehicleTypeInputForm, VehicleTypeInputFormSchema } from "@/forms/vehicleType";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { createVehicleType } from "@/services/client/vehicleType";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { VehicleTypeInfo } from "@/types/strapi";
import { errorExists, formatError, formatErrorMessage } from "@/utils/yup";

export type NewVehicleTypeModalProps = {
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id: number) => void;
};

const initialFormValues: VehicleTypeInputForm = {
  name: "",
  description: "",
  isActive: true,
};

const NewVehicleTypeModal = ({ open, onClose, onSubmit }: NewVehicleTypeModalProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();
  const { showNotification } = useNotification();

  const handleSubmitFormik = useCallback(
    async (values: VehicleTypeInputForm, formikHelpers: FormikHelpers<VehicleTypeInputForm>) => {
      if (!orgId || !userId) {
        return;
      }

      // Check if it's a new merchandise type or an update
      const { data, error }: MutationResult<VehicleTypeInfo> = await createVehicleType({
        ...(values as VehicleTypeInfo),
        organizationId: orgId,
        createdById: userId,
      });

      formikHelpers.setSubmitting(false);
      if (error) {
        // Handle different error types
        let message = "";
        switch (error) {
          case ErrorType.EXISTED:
            message = errorExists("vehicle.new_vehicle_type_modal.name");
            formikHelpers.setFieldError("name", message);
            return;
          case ErrorType.UNKNOWN:
            message = formatErrorMessage("common.message.save_error_unknown");
            formikHelpers.setFieldError("name", message);
            break;
          default:
            break;
        }

        // Show an error notification
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message,
        });
      } else {
        // Show a success notification and navigate to the merchandise types page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });

        formikHelpers.resetForm({ values: initialFormValues });
        data && onSubmit && onSubmit(data.id);
      }
    },
    [onSubmit, orgId, showNotification, t, userId]
  );

  const { touched, values, errors, dirty, isSubmitting, resetForm, handleChange, handleSubmit } = useFormik({
    initialValues: initialFormValues,
    validationSchema: VehicleTypeInputFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  const handleCancelClick = useCallback(() => {
    resetForm({ values, touched });
    onClose && onClose();
  }, [onClose, resetForm, touched, values]);

  /**
   * Show confirmation to the user before leaving the page if there are unsaved changes.
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = t("common.cancel_message");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty, t]);

  return (
    <Modal open={open}>
      <form method="POST" onSubmit={handleSubmit}>
        <ModalHeader title={t("vehicle.new_vehicle_type_modal.title")} />
        <ModalContent className="space-y-6">
          <TextField
            label={t("vehicle.new_vehicle_type_modal.name")}
            name="name"
            value={values.name}
            required
            maxLength={255}
            onChange={handleChange}
            errorText={formatError(t, touched.name && errors.name)}
          />

          <TextField
            label={t("vehicle.new_vehicle_type_modal.description")}
            name="description"
            value={values.description ?? ""}
            multiline
            rows={4}
            maxLength={500}
            showCount
            onChange={handleChange}
            errorText={formatError(t, touched.description && errors.description)}
          />
        </ModalContent>
        <ModalActions>
          <Button
            type="button"
            variant="outlined"
            color="secondary"
            disabled={isSubmitting}
            onClick={handleCancelClick}
          >
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

export default NewVehicleTypeModal;
