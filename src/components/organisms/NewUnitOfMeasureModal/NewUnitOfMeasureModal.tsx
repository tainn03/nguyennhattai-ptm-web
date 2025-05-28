"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";
import { UnitOfMeasureInputForm, unitOfMeasureInputFormSchema } from "@/forms/unitOfMeasure";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { createUnitOfMeasure } from "@/services/client/unitOfMeasure";
import { ErrorType } from "@/types";
import { UnitOfMeasureInfo } from "@/types/strapi";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: UnitOfMeasureInputForm = {
  code: "",
  name: "",
  description: "",
  isActive: true,
};

type NewUnitOfMeasureModalProps = {
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id: number) => void;
};

const NewUnitOfMeasureModal = ({ open, onClose, onSubmit }: NewUnitOfMeasureModalProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();
  const { showNotification } = useNotification();

  const handleSubmitFormik = useCallback(
    async (values: UnitOfMeasureInputForm, formikHelpers: FormikHelpers<UnitOfMeasureInputForm>) => {
      if (!orgId || !userId) {
        return;
      }

      const { data, error } = await createUnitOfMeasure({
        ...(values as UnitOfMeasureInfo),
        organizationId: orgId,
        createdById: userId,
      });

      formikHelpers.setSubmitting(false);
      if (error) {
        let message = "";
        switch (error) {
          case ErrorType.EXISTED:
            message = errorExists("unit_of_measure.name");
            formikHelpers.setFieldError("name", message);
            return;
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: values.name });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: values.name });
            break;
          default:
            break;
        }

        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message,
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });
        formikHelpers.resetForm({ values: initialFormValues });
        data && onSubmit && onSubmit(data.id);
      }
    },
    [orgId, userId, showNotification, t, onSubmit]
  );

  const { touched, values, errors, dirty, isSubmitting, resetForm, handleChange, handleSubmit } = useFormik({
    initialValues: initialFormValues,
    validationSchema: unitOfMeasureInputFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  const handleCancelClick = useCallback(() => {
    resetForm({ values, touched });
    onClose && onClose();
  }, [onClose, resetForm, touched, values]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  return (
    <Modal open={open}>
      <form method="POST" onSubmit={handleSubmit}>
        <ModalHeader title={t("unit_of_measure.title")} />
        <ModalContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <TextField
              label={t("unit_of_measure.code")}
              name="code"
              value={values.code}
              required
              maxLength={20}
              onChange={handleChange}
              errorText={formatError(t, touched.code && errors.code)}
            />
          </div>
          <div className="sm:col-span-3">
            <TextField
              label={t("unit_of_measure.name")}
              name="name"
              value={values.name}
              required
              maxLength={255}
              onChange={handleChange}
              errorText={formatError(t, touched.name && errors.name)}
            />
          </div>
          <div className="col-span-full">
            <TextField
              label={t("unit_of_measure.description")}
              name="description"
              value={values.description as string}
              multiline
              rows={4}
              maxLength={500}
              showCount
              onChange={handleChange}
              errorText={formatError(t, touched.description && errors.description)}
            />
          </div>
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

export default NewUnitOfMeasureModal;
