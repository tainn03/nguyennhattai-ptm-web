"use client";

import { AdvanceStatus } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { DescriptionProperty2, ModalActions, ModalContent, ModalHeader, NumberLabel } from "@/components/atoms";
import { Button, DatePicker, Modal, NumberField } from "@/components/molecules";
import { AdvanceConfirmForm, advanceConfirmFormSchema } from "@/forms/advance";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { updateAdvance } from "@/services/client/advance";
import { ErrorType } from "@/types";
import { formatError } from "@/utils/yup";

const initialFormValues: AdvanceConfirmForm = {
  status: AdvanceStatus.PAYMENT,
  approvedAmount: 0,
  paymentDate: new Date(),
  paymentById: null,
  updatedById: null,
};

type AdvanceConfirmModalProps = {
  open: boolean;
  id: number;
  borrower: string;
  amount: number | null;
  lastUpdatedAt?: Date | string;
  onConfirm?: () => void;
  onClose?: () => void;
};

const AdvanceConfirmModal = ({
  open,
  id,
  borrower,
  amount,
  lastUpdatedAt,
  onConfirm,
  onClose,
}: AdvanceConfirmModalProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();
  const { showNotification } = useNotification();

  /**
   * Handler function for confirming the payment of an advance.
   */
  const handleSubmitFormik = useCallback(
    async (values: Partial<AdvanceConfirmForm>, formikHelpers: FormikHelpers<AdvanceConfirmForm>) => {
      if (!id) {
        return;
      }

      const result = await updateAdvance(
        {
          ...values,
          id,
          organizationId: orgId,
          approvedAmount: values.approvedAmount,
          paymentById: userId,
          updatedById: userId,
        },
        lastUpdatedAt
      );

      if (result.error) {
        let message = "";
        switch (result.error) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive");
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: borrower });
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
        });
      }
      formikHelpers.setSubmitting(false);
      formikHelpers.resetForm();
      onConfirm && onConfirm?.();
    },
    [borrower, id, lastUpdatedAt, onConfirm, orgId, showNotification, t, userId]
  );

  const { values, isSubmitting, touched, errors, handleSubmit, handleChange, setFieldValue, resetForm } = useFormik({
    initialValues: initialFormValues,
    validationSchema: advanceConfirmFormSchema,
    onSubmit: handleSubmitFormik,
  });

  useEffect(() => {
    resetForm({
      values: {
        ...initialFormValues,
        approvedAmount: amount,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  /**
   * Handler function for changing the payment date of an advance.
   * @param date The new selected date
   */
  const handleDateChange = useCallback(
    (date: Date) => {
      setFieldValue("paymentDate", date);
    },
    [setFieldValue]
  );

  return (
    <Modal open={open} showCloseButton onClose={onClose} onDismiss={onClose} allowOverflow>
      <form onSubmit={handleSubmit}>
        <ModalHeader title={t("advance.confirm_amount_title")} />
        <ModalContent className="space-y-3">
          <DescriptionProperty2 label={t("advance.amount")}>
            <NumberLabel value={amount} type="currency" emptyLabel={t("common.empty")} />
          </DescriptionProperty2>
          <NumberField
            required
            label={t("advance.approved_amount")}
            name="approvedAmount"
            value={values.approvedAmount}
            onChange={handleChange}
            suffixText={t("common.unit.currency")}
            errorText={formatError(t, touched.approvedAmount && errors.approvedAmount)}
          />
          <DatePicker
            required
            name="paymentDate"
            label={t("advance.payment_date")}
            selected={values.paymentDate}
            onChange={handleDateChange}
            errorText={formatError(t, touched.paymentDate && errors.paymentDate)}
          />
        </ModalContent>
        <ModalActions align="right">
          <Button disabled={isSubmitting} type="button" variant="outlined" color="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={isSubmitting} type="submit">
            {t("common.save")}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
};

export default AdvanceConfirmModal;
