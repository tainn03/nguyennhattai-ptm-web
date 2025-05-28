"use client";

import { HttpStatusCode } from "axios";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, InputGroup, Modal, TextField } from "@/components/molecules";
import { CustomerInputForm, customerInputFormSchema } from "@/forms/customer";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { ErrorType } from "@/types";
import { ApiResult } from "@/types/api";
import { post } from "@/utils/api";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

export type NewCustomerModalProps = {
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id?: number) => void;
};

const initialFormValues: CustomerInputForm = {
  code: "",
  name: "",
  taxCode: "",
  email: "",
  phoneNumber: "",
  website: "",
  businessAddress: "",
  isActive: true,
  contactName: "",
  contactPosition: "",
  contactEmail: "",
  contactPhoneNumber: "",
};

const NewCustomerModal = ({ open, onClose, onSubmit }: NewCustomerModalProps) => {
  const t = useTranslations();
  const { showNotification } = useNotification();
  const { orgLink } = useAuth();

  const handleSubmitFormik = useCallback(
    async (values: CustomerInputForm, formikHelpers: FormikHelpers<CustomerInputForm>) => {
      const result = await post<ApiResult<number>>(`/api${orgLink}/customers/new`, {
        ...values,
      });

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.status === HttpStatusCode.Ok) {
        // Show a success notification and navigate to the maintenance types page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });

        formikHelpers.resetForm({
          values: initialFormValues,
        });
        result.data && onSubmit && onSubmit(result.data);
      } else {
        // Handle different error types
        let message = "";
        switch (result.message) {
          case `${ErrorType.EXISTED}-${values.code}`:
            formikHelpers.setFieldError("code", errorExists("customer.customer_code"));
            return;
          case `${ErrorType.EXISTED}-${values.name}`:
            formikHelpers.setFieldError("name", errorExists("customer.name"));
            return;
          case ErrorType.UNKNOWN:
            message = t("common.message.error_unknown", { name: values.name });
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
    [orgLink, showNotification, t, onSubmit]
  );

  const { touched, values, errors, dirty, isSubmitting, resetForm, handleChange, handleSubmit } = useFormik({
    initialValues: initialFormValues,
    validationSchema: customerInputFormSchema,
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
    <Modal open={open} size="5xl" onClose={handleCancelClick} showCloseButton>
      <form method="POST" onSubmit={handleSubmit}>
        <ModalHeader title={t("customer.new_customer")} subTitle={t("customer.title_description")} />
        <ModalContent className="space-y-6">
          <InputGroup className="pb-6" title={t("customer.general_title")}>
            <div className="sm:col-span-3">
              <TextField
                label={t("customer.customer_code")}
                name="code"
                required
                value={ensureString(values.code)}
                maxLength={20}
                onChange={handleChange}
                errorText={formatError(t, touched.code && errors.code)}
              />
            </div>

            <div className="sm:col-span-4">
              <TextField
                label={t("customer.customer_name")}
                name="name"
                value={values.name}
                required
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
                helperText={t("customer.name_helper_text")}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                label={t("customer.tax_code")}
                name="taxCode"
                value={ensureString(values.taxCode)}
                maxLength={20}
                onChange={handleChange}
                errorText={formatError(t, touched.taxCode && errors.taxCode)}
              />
            </div>

            <div className="sm:col-span-4 sm:col-start-1">
              <TextField
                label={t("customer.email")}
                name="email"
                value={ensureString(values.email)}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.email && errors.email)}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                label={t("customer.phone_number")}
                name="phoneNumber"
                value={ensureString(values.phoneNumber)}
                maxLength={20}
                onChange={handleChange}
                errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
              />
            </div>

            <div className="col-span-full">
              <TextField
                label={t("customer.website")}
                name="website"
                value={ensureString(values.website)}
                maxLength={2048}
                onChange={handleChange}
                errorText={formatError(t, touched.website && errors.website)}
              />
            </div>

            <div className="col-span-full">
              <TextField
                label={t("customer.address")}
                name="businessAddress"
                value={ensureString(values.businessAddress)}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.businessAddress && errors.businessAddress)}
              />
            </div>
          </InputGroup>
          <InputGroup
            className="pb-0"
            title={t("customer.representative_title")}
            description={t("customer.representative_description")}
            showBorderBottom={false}
          >
            <div className="sm:col-span-4">
              <TextField
                label={t("customer.representative_name")}
                name="contactName"
                value={ensureString(values.contactName)}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.contactName && errors.contactName)}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                label={t("customer.representative_position")}
                name="contactPosition"
                value={ensureString(values.contactPosition)}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.contactPosition && errors.contactPosition)}
              />
            </div>

            <div className="sm:col-span-4">
              <TextField
                label={t("customer.representative_email")}
                name="contactEmail"
                value={ensureString(values.contactEmail)}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.contactEmail && errors.contactEmail)}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                label={t("customer.representative_phone")}
                name="contactPhoneNumber"
                value={ensureString(values.contactPhoneNumber)}
                maxLength={20}
                onChange={handleChange}
                errorText={formatError(t, touched.contactPhoneNumber && errors.contactPhoneNumber)}
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

export default NewCustomerModal;
