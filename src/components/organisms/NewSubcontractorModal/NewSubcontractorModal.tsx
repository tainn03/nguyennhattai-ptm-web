"use client";

import { HttpStatusCode } from "axios";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, InputGroup, Modal, TextField } from "@/components/molecules";
import { SubcontractorInputForm, subcontractorInputFormSchema } from "@/forms/subcontractor";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { ErrorType } from "@/types";
import { ApiResult } from "@/types/api";
import { SubcontractorInfo } from "@/types/strapi";
import { post } from "@/utils/api";
import { ensureString } from "@/utils/string";
import { errorExists, formatError, formatErrorMessage } from "@/utils/yup";

export type NewSubcontractorModalProps = {
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id?: number) => void;
};

const initialFormValues: SubcontractorInputForm = {
  code: "",
  name: "",
  taxCode: "",
  email: "",
  phoneNumber: "",
  website: "",
  businessAddress: "",
  isActive: true,
  description: "",
};

const NewSubcontractorModal = ({ open, onClose, onSubmit }: NewSubcontractorModalProps) => {
  const t = useTranslations();
  const { showNotification } = useNotification();
  const { orgId, orgLink } = useAuth();

  const handleSubmitFormik = useCallback(
    async (values: SubcontractorInputForm, formikHelpers: FormikHelpers<SubcontractorInputForm>) => {
      if (!orgLink || !orgId) {
        return;
      }

      const result: ApiResult | undefined = await post<ApiResult<SubcontractorInfo>>(
        `/api${orgLink}/subcontractors/new`,
        {
          ...values,
        }
      );

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.status === HttpStatusCode.Ok) {
        // Show a success notification and navigate to the subcontractor page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });

        formikHelpers.resetForm({ values: initialFormValues });
        onSubmit && onSubmit(result.data?.id);
      } else {
        // Handle different error types
        let message = "";
        switch (result.message) {
          case `${ErrorType.EXISTED}-${values.name}`:
            message = errorExists("subcontractor.name");
            formikHelpers.setFieldError("name", message);
            return;
          case `${ErrorType.EXISTED}-${values.code}`:
            message = errorExists("subcontractor.code");
            formikHelpers.setFieldError("code", message);
            break;
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
      }
    },
    [orgLink, orgId, showNotification, t, onSubmit]
  );

  const { values, touched, errors, dirty, isSubmitting, handleChange, handleSubmit, resetForm } = useFormik({
    initialValues: initialFormValues,
    validationSchema: subcontractorInputFormSchema,
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
    <Modal open={open} size="5xl">
      <form method="POST" onSubmit={handleSubmit}>
        <ModalHeader
          title={t("vehicle.new_subcontractor_modal.title")}
          subTitle={t("vehicle.new_subcontractor_modal.title_description")}
        />
        <ModalContent>
          <InputGroup title={t("subcontractor.general_title")} showBorderBottom={false}>
            <div className="col-span-3">
              <TextField
                label={t("subcontractor.code")}
                name="code"
                value={ensureString(values.code)}
                required
                maxLength={20}
                onChange={handleChange}
                errorText={formatError(t, touched.code && errors.code)}
              />
            </div>

            <div className="col-span-4">
              <TextField
                label={t("subcontractor.name")}
                name="name"
                value={ensureString(values.name)}
                required
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
                helperText={t("subcontractor.name_helper_text")}
              />
            </div>

            <div className="col-span-2">
              <TextField
                label={t("subcontractor.tax_code")}
                name="taxCode"
                value={ensureString(values.taxCode)}
                maxLength={20}
                onChange={handleChange}
                errorText={formatError(t, touched.taxCode && errors.taxCode)}
              />
            </div>

            <div className="col-span-3">
              <TextField
                label={t("subcontractor.email")}
                name="email"
                value={ensureString(values.email)}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.email && errors.email)}
              />
            </div>

            <div className="col-span-3">
              <TextField
                label={t("subcontractor.phone")}
                name="phoneNumber"
                value={ensureString(values.phoneNumber)}
                maxLength={20}
                onChange={handleChange}
                errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
              />
            </div>

            <div className="col-span-full">
              <TextField
                label={t("subcontractor.website")}
                name="website"
                value={ensureString(values.website)}
                maxLength={2048}
                onChange={handleChange}
                errorText={formatError(t, touched.businessAddress && errors.website)}
              />
            </div>

            <div className="col-span-full">
              <TextField
                label={t("subcontractor.address")}
                name="businessAddress"
                value={ensureString(values.businessAddress)}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.businessAddress && errors.businessAddress)}
              />
            </div>
            <div className="col-span-full">
              <TextField
                label={t("subcontractor.description")}
                name="description"
                value={ensureString(values.description)}
                multiline
                rows={4}
                maxLength={500}
                showCount
                onChange={handleChange}
                errorText={formatError(t, touched.description && errors.description)}
              />
            </div>
          </InputGroup>
        </ModalContent>
        <ModalActions>
          <Button type="button" variant="outlined" color="secondary" onClick={handleCancelClick}>
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

export default NewSubcontractorModal;
