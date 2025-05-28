"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";
import { MerchandiseTypeInputForm, merchandiseTypeInputFormSchema } from "@/forms/merchandiseType";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { createMerchandiseType } from "@/services/client/merchandiseType";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { MerchandiseTypeInfo } from "@/types/strapi";
import { formatError } from "@/utils/yup";

export type NewMerchandiseTypeModalProps = {
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id: number) => Promise<void>;
};

const initialFormValues: MerchandiseTypeInputForm = {
  name: "",
  description: "",
  isActive: true,
};

const NewMerchandiseTypeModal = ({ open, onClose, onSubmit }: NewMerchandiseTypeModalProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();
  const { showNotification } = useNotification();

  const handleSubmitFormik = useCallback(
    async (values: MerchandiseTypeInputForm, formikHelpers: FormikHelpers<MerchandiseTypeInputForm>) => {
      if (!orgId || !userId) {
        return;
      }

      const { data, error }: MutationResult<MerchandiseTypeInfo> = await createMerchandiseType({
        ...(values as MerchandiseTypeInfo),
        organizationId: orgId,
        createdById: userId,
      });

      formikHelpers.setSubmitting(false);
      if (error) {
        // Handle different error types
        let message = "";
        switch (error) {
          case ErrorType.EXISTED:
            message = t("common.error.exists", { name: values.name });
            formikHelpers.setFieldError("name", message);
            return;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: values.name });
            break;
          default:
            break;
        }

        // Show an error notification
        showNotification({
          color: "error",
          title: t("common.message.error_title"),
          message,
        });
      } else {
        // Show a success notification and navigate to the merchandise types page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", {
            name: values.name,
          }),
        });
        formikHelpers.resetForm({ values: initialFormValues });
        data && onSubmit && onSubmit(data.id);
      }
    },
    [userId, orgId, showNotification, onSubmit, t]
  );

  const { touched, values, errors, dirty, isSubmitting, resetForm, handleChange, handleSubmit } = useFormik({
    initialValues: initialFormValues,
    validationSchema: merchandiseTypeInputFormSchema,
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
        event.returnValue = t("common.confirmation.cancel_message");
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
        <ModalHeader title={t("order_new.merchandise_panel.new")} />
        <ModalContent className="space-y-6">
          <TextField
            label={t("order_new.merchandise_panel.modal_name")}
            name="name"
            value={values.name}
            required
            maxLength={255}
            onChange={handleChange}
            errorText={formatError(t, touched.name && errors.name)}
          />

          <TextField
            label={t("order_new.merchandise_panel.modal_description")}
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

export default NewMerchandiseTypeModal;
