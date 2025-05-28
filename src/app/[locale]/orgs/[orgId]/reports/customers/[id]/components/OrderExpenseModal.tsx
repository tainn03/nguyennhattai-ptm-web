"use client";

import { RouteType } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import {
  DateTimeLabel,
  DescriptionProperty2,
  ModalActions,
  ModalContent,
  ModalHeader,
  NumberLabel,
} from "@/components/atoms";
import { Button, DatePicker, Modal, NumberField, TextField } from "@/components/molecules";
import { OrderExpenseForm } from "@/forms/orderExpense";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { updateOrderExpenseModal } from "@/services/client/order";
import { OrderInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

type OrderExpenseProps = {
  open: boolean;
  orderSelected?: Partial<OrderInfo>;
  onSave?: () => void;
  onClose?: () => void;
};

const OrderExpenseModal = ({ open, orderSelected, onClose, onSave }: OrderExpenseProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();

  const { showNotification } = useNotification();

  /**
   * Initial values for the form representing driver expenses keyed by expense IDs.
   */
  const initialValues = useMemo(() => {
    const values: OrderExpenseForm = {
      paymentDueDate: orderSelected?.paymentDueDate ?? null,
      totalAmount: orderSelected?.totalAmount ?? null,
      notes: orderSelected?.notes ?? null,
      amountPaid: 0,
    };
    return values;
  }, [orderSelected]);

  /**
   * Handles the form submission for trip driver expenses, creating or updating the expenses associated with an order trip.
   *
   * @param {OrderExpenseForm} values - The form values representing driver expenses keyed by expense IDs.
   * @param {FormikHelpers<OrderExpenseForm>} formikHelpers - Formik helper functions.
   * @returns {Promise<void>} A promise that resolves once the form submission is complete.
   */
  const handleSubmitFormik = useCallback(
    async (values: OrderExpenseForm, formikHelpers: FormikHelpers<OrderExpenseForm>) => {
      const param = {
        ...values,
        id: orderSelected?.id,
        organizationId: orgId,
        updatedById: userId,
        lastUpdatedAt: orderSelected?.updatedAt,
      };
      delete param.amountPaid;

      const result = await updateOrderExpenseModal(param);

      formikHelpers.setSubmitting(false);
      // Show appropriate notification based on the API response
      if (result?.data) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", {
            name: t("order.vehicle_dispatch.driver_salary_detail.title", { tripCode: orderSelected?.code }),
          }),
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
        });
      }
      formikHelpers.resetForm({ values: initialValues });
      onSave && onSave();
    },
    [
      initialValues,
      onSave,
      orderSelected?.code,
      orderSelected?.id,
      orderSelected?.updatedAt,
      orgId,
      showNotification,
      t,
      userId,
    ]
  );

  const { values, touched, errors, isSubmitting, handleChange, handleSubmit, resetForm, setFieldValue } = useFormik({
    initialValues: initialValues,
    onSubmit: handleSubmitFormik,
    enableReinitialize: true,
    validationSchema: undefined,
  });

  /**
   * Handles the change of the date input.
   * Sets the specified field value to the selected date.
   */
  const handleDateChange = useCallback(
    (date: Date) => {
      setFieldValue("paymentDueDate", date);
    },
    [setFieldValue]
  );

  /**
   * It resets the form to its initial values and then calls the onClose function if it exists.
   */
  const handleClose = useCallback(() => {
    resetForm({ values: initialValues });
    onClose && onClose();
  }, [initialValues, onClose, resetForm]);

  return (
    <Modal open={open} size="2xl" showCloseButton onClose={handleClose} onDismiss={handleClose} allowOverflow>
      <form onSubmit={handleSubmit}>
        <ModalHeader
          title={t("report.customers.order_expense_modal.description", { orderCode: orderSelected?.code })}
        />
        <ModalContent padding={false} className="divide-y divide-gray-200 ">
          <div className="grid grid-cols-1 gap-x-3 px-4 py-3 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("report.customers.order_expense_modal.customer_name")}>
                {orderSelected?.customer?.code}
                {orderSelected?.customer?.name && ` (${orderSelected?.customer?.name})`}
              </DescriptionProperty2>
            </div>
            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("report.customers.order_expense_modal.order_date")}>
                <DateTimeLabel value={orderSelected?.orderDate} type="date" emptyLabel={t("common.empty")} />
              </DescriptionProperty2>
            </div>
            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("report.customers.order_expense_modal.delivery_date")}>
                <DateTimeLabel value={orderSelected?.deliveryDate} type="date" emptyLabel={t("common.empty")} />
              </DescriptionProperty2>
            </div>
            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("report.customers.order_expense_modal.weight")}>
                <NumberLabel
                  value={orderSelected?.weight}
                  unit="PL"
                  emptyLabel={t("common.empty")}
                  showUnitWhenEmpty={false}
                />
              </DescriptionProperty2>
            </div>
            <div className="sm:col-span-full">
              <DescriptionProperty2 label={t("report.customers.order_expense_modal.route")}>
                {orderSelected?.route?.type === RouteType.FIXED ? (
                  <>
                    {orderSelected?.route?.code}
                    {orderSelected?.route?.name && ` (${orderSelected?.route?.name})`}
                  </>
                ) : (
                  t("order.vehicle_dispatch.driver_salary_detail.vehicle_not_fixed")
                )}
              </DescriptionProperty2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-3 px-4 pb-4 pt-3 sm:grid-cols-6">
            <div className="sm:col-span-3 sm:col-start-1">
              <DatePicker
                label={t("report.customers.order_expense_modal.payment_due_date")}
                name="paymentDueDate"
                onChange={handleDateChange}
                selected={values.paymentDueDate && new Date(values.paymentDueDate)}
                errorText={formatError(t, touched.paymentDueDate && errors.paymentDueDate)}
              />
            </div>
            <div className="sm:col-span-3">
              <NumberField
                label={t("report.customers.order_expense_modal.total_amount")}
                name="totalAmount"
                onChange={handleChange}
                value={values.totalAmount}
                suffixText={t("common.unit.currency")}
                errorText={formatError(t, touched.totalAmount && errors.totalAmount)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-3 px-4 pb-4 pt-3 sm:grid-cols-6">
            <div className="col-span-full">
              <TextField
                label={t("order.vehicle_dispatch_modal.notes")}
                name="notes"
                maxLength={500}
                onChange={handleChange}
                value={ensureString(values.notes)}
                multiline
                errorText={formatError(t, touched.notes && errors.notes)}
              />
            </div>
          </div>
        </ModalContent>
        <ModalActions>
          <Button type="button" variant="outlined" disabled={isSubmitting} onClick={handleClose}>
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

export default OrderExpenseModal;
