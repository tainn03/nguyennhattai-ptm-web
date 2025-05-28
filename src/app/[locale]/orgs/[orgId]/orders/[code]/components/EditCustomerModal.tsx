"use client";

import { HttpStatusCode } from "axios";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";
import { mutate } from "swr";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, InputGroup, Modal, TextField } from "@/components/molecules";
import { CustomerInputForm, customerInputFormSchema } from "@/forms/customer";
import { useAuth, useIdParam } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { ErrorType } from "@/types";
import { ApiResult } from "@/types/api";
import { CustomerInfo } from "@/types/strapi";
import { put } from "@/utils/api";
import { ensureString } from "@/utils/string";

const initialFormValues: CustomerInputForm = {
  id: 0,
  code: "",
  name: "",
  taxCode: null,
  email: null,
  phoneNumber: null,
  businessAddress: null,
  contactName: null,
  description: null,
  contactEmail: null,
  contactPhoneNumber: null,
};

export type EditCustomerModalProps = {
  open: boolean;
  customer: CustomerInputForm;
  onClose?: () => void;
};

const EditCustomerModal = ({ open, customer, onClose }: EditCustomerModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink } = useAuth();
  const { encryptId } = useIdParam();
  const { order } = useOrderState();
  const { showNotification } = useNotification();

  const handleSubmitFormik = useCallback(
    async (values: CustomerInputForm, formikHelpers: FormikHelpers<CustomerInputForm>) => {
      let result: ApiResult<CustomerInfo> | undefined;
      if (customer?.id) {
        result = await put<ApiResult<CustomerInfo>>(`/api${orgLink}/customers/${encryptId(values.id)}/edit`, {
          customer: { ...values, id: Number(values.id) },
          lastUpdatedAt: customer?.updatedAt,
        });
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });

        mutate([`orders/${order?.code}`, { organizationId: orgId, code: order?.code }]);
        onClose && onClose();
        formikHelpers.resetForm({ values: initialFormValues });
      } else {
        let message = "";
        switch (result.message) {
          case ErrorType.EXISTED:
            message = t("common.error.exists", { name: values.code });
            formikHelpers.setFieldError("code", message);
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
          title: t("common.message.error_title"),
          message,
        });
      }
    },
    [customer?.id, customer?.updatedAt, orgLink, encryptId, showNotification, t, order?.code, orgId, onClose]
  );

  const { touched, values, errors, isSubmitting, resetForm, handleChange, handleSubmit } = useFormik({
    initialValues: initialFormValues,
    validationSchema: customerInputFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  useEffect(() => {
    resetForm({ values: { ...customer, id: Number(customer.id) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const handleClose = useCallback(() => {
    onClose && onClose();
    resetForm({ values: initialFormValues });
  }, [onClose, resetForm]);

  return (
    <Modal size="5xl" open={open} onClose={handleClose} onDismiss={handleClose} showCloseButton>
      <form method="POST" onSubmit={handleSubmit}>
        <ModalHeader title={t("customer.customer_info")} />
        <ModalContent className="space-y-6">
          <InputGroup
            title={t("customer.general_title")}
            description={t("customer.general_description")}
            className="!pb-4 sm:!pb-6"
          >
            <div className="col-span-full xl:col-span-4">
              <TextField
                label={t("customer.customer_name")}
                name="name"
                value={ensureString(values.name)}
                required
                maxLength={255}
                onChange={handleChange}
                helperText={t("customer.customer_name_helper")}
                errorText={touched.name && errors.name}
              />
            </div>
            <div className="col-span-full xl:col-span-2">
              <TextField
                label={t("customer.tax_code")}
                name="taxCode"
                value={ensureString(values.taxCode)}
                maxLength={20}
                onChange={handleChange}
                errorText={touched.taxCode && errors.taxCode}
              />
            </div>
            <div className="col-span-full md:col-span-3 xl:col-span-2">
              <TextField
                label={t("customer.phone")}
                name="phoneNumber"
                value={ensureString(values.phoneNumber)}
                maxLength={20}
                onChange={handleChange}
                errorText={touched.phoneNumber && errors.phoneNumber}
              />
            </div>
            <div className="col-span-full md:col-span-3 xl:col-span-4">
              <TextField
                label={t("customer.email")}
                name="email"
                value={ensureString(values.email)}
                maxLength={255}
                onChange={handleChange}
                errorText={touched.email && errors.email}
              />
            </div>
            <div className="col-span-full">
              <TextField
                label={t("customer.address")}
                name="businessAddress"
                value={ensureString(values.businessAddress)}
                maxLength={255}
                onChange={handleChange}
                errorText={touched.businessAddress && errors.businessAddress}
              />
            </div>
            <div className="col-span-full">
              <TextField
                label={t("customer.description")}
                name="description"
                value={ensureString(values.description)}
                maxLength={500}
                onChange={handleChange}
                errorText={touched.description && errors.description}
                multiline
              />
            </div>
          </InputGroup>

          <InputGroup
            title={t("customer.contact_info_title")}
            description={t("customer.contact_info_description")}
            showBorderBottom={false}
            className="!pb-0"
          >
            <div className="col-span-6">
              <TextField
                label={t("customer.representative_name")}
                name="contactName"
                value={ensureString(values.contactName)}
                maxLength={255}
                onChange={handleChange}
                errorText={touched.contactName && errors.contactName}
              />
            </div>
            <div className="col-span-4">
              <TextField
                label={t("customer.representative_email")}
                name="contactEmail"
                value={ensureString(values.contactEmail)}
                maxLength={255}
                onChange={handleChange}
                errorText={touched.contactEmail && errors.contactEmail}
              />
            </div>
            <div className="col-span-2">
              <TextField
                label={t("customer.representative_phone")}
                name="contactPhoneNumber"
                value={ensureString(values.contactPhoneNumber)}
                maxLength={20}
                onChange={handleChange}
                errorText={touched.contactPhoneNumber && errors.contactPhoneNumber}
              />
            </div>
          </InputGroup>
        </ModalContent>
        <ModalActions>
          <Button type="button" disabled={isSubmitting} variant="outlined" color="secondary" onClick={handleClose}>
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

export default EditCustomerModal;
