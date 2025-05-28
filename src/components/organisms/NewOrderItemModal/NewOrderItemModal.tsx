"use client";

import { FormikHelpers, getIn, useFormik } from "formik";
import { useTranslations } from "next-intl";
import numeral from "numeral";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Combobox, Modal, NumberField, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { orderItemSchema } from "@/forms/orderItem";
import { OrderItemInputForm } from "@/forms/orderItem";
import { useAuth, useMerchandiseTypeOptions } from "@/hooks";
import { MerchandiseTypeInfo } from "@/types/strapi";
import { randomInt } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: OrderItemInputForm = {
  id: 0,
  name: "",
  merchandiseType: {
    id: undefined,
  },
  packageWeight: null,
  packageLength: null,
  packageWidth: null,
  packageHeight: null,
  quantity: null,
  unit: "",
  notes: null,
};

type NewOrderItemModalProps = {
  open: boolean;
  editOrderItem?: OrderItemInputForm;
  onClose: () => void;
  onSave: (orderItem: OrderItemInputForm, isEdit?: boolean) => void;
};

const NewOrderItemModal = ({ open, editOrderItem, onClose, onSave }: NewOrderItemModalProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { merchandiseTypes, isLoading } = useMerchandiseTypeOptions({ organizationId: orgId });

  const merchandiseTypeOptions: ComboboxItem[] = useMemo(
    () =>
      merchandiseTypes?.map((item: MerchandiseTypeInfo) => ({
        value: ensureString(item.id),
        label: item.name,
      })) || [],
    [merchandiseTypes]
  );

  const handleSubmitForm = useCallback(
    (values: OrderItemInputForm, formikHelpers: FormikHelpers<OrderItemInputForm>) => {
      setIsSubmitting(true);
      const newValues = { ...values };
      if (editOrderItem?.id) {
        newValues.id = editOrderItem.id;
        onSave && onSave(newValues, true);
      } else {
        newValues.id = randomInt(-9999999, -1);
        onSave && onSave(newValues);
      }

      formikHelpers.resetForm({ values: initialFormValues });
      formikHelpers.setSubmitting(false);
      setIsSubmitting(false);
    },
    [editOrderItem?.id, onSave]
  );

  const { values, errors, touched, handleChange, handleSubmit, setFieldValue, resetForm } =
    useFormik<OrderItemInputForm>({
      initialValues: initialFormValues,
      validationSchema: orderItemSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitForm,
    });

  useEffect(() => {
    resetForm({ values: editOrderItem });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOrderItem]);

  const handleMerchandiseTypeChange = useCallback(
    (value: string) => {
      setFieldValue("merchandiseType.id", numeral(value).value());
    },
    [setFieldValue]
  );

  const handleClose = useCallback(() => {
    resetForm({ values: initialFormValues });
    onClose && onClose();
  }, [onClose, resetForm]);

  return (
    <Modal open={open} size="3xl" showCloseButton onClose={handleClose} onDismiss={handleClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader title={t("order.item.detail_modal_title")} />
        <ModalContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-8">
          <div className="sm:col-span-4">
            <TextField
              label={t("order.item.detail_modal_name")}
              name="name"
              required
              maxLength={255}
              value={ensureString(values.name)}
              onChange={handleChange}
              errorText={formatError(t, touched.name && errors.name)}
            />
          </div>
          <div className="sm:col-span-4">
            <Combobox
              label={t("order.item.detail_modal_type")}
              items={merchandiseTypeOptions}
              value={ensureString(values.merchandiseType?.id)}
              loading={isLoading}
              placeholder={t("order.item.modal_update_merchandise_type_select")}
              onChange={handleMerchandiseTypeChange}
              errorText={formatError(t, getIn(touched, "merchandiseType.id") && getIn(errors, "merchandiseType.id"))}
              emptyLabel={t("order.item.modal_update_merchandise_type_select_none")}
            />
          </div>

          <hr className="mt-2 border-t border-gray-200 sm:col-span-full" />
          <h3 className="col-span-full mt-2 text-base font-semibold leading-6 text-gray-900">Quy cách đóng gói</h3>

          <div className="sm:col-span-2">
            <NumberField
              label={t("order.item.detail_modal_length")}
              name="packageLength"
              value={ensureString(values.packageLength)}
              suffixText={t("common.unit.centimeter")}
              onChange={handleChange}
              errorText={formatError(t, touched.packageLength && errors.packageLength)}
            />
          </div>
          <div className="sm:col-span-2">
            <NumberField
              label={t("order.item.detail_modal_width")}
              name="packageWidth"
              value={values.packageWidth}
              suffixText={t("common.unit.centimeter")}
              onChange={handleChange}
              errorText={formatError(t, touched.packageWidth && errors.packageWidth)}
            />
          </div>
          <div className="sm:col-span-2">
            <NumberField
              label={t("order.item.detail_modal_height")}
              name="packageHeight"
              value={values.packageHeight}
              suffixText={t("common.unit.centimeter")}
              onChange={handleChange}
              errorText={formatError(t, touched.packageHeight && errors.packageHeight)}
            />
          </div>
          <div className="sm:col-span-2">
            <NumberField
              label={t("order.item.detail_modal_weight")}
              name="packageWeight"
              value={values.packageWeight}
              suffixText={t("common.unit.kilogram")}
              onChange={handleChange}
              errorText={formatError(t, touched.packageWeight && errors.packageWeight)}
            />
          </div>

          <hr className="mt-2 border-t border-gray-200 sm:col-span-full" />

          <div className="sm:col-span-3">
            <label htmlFor="quantity" className="block text-sm font-medium leading-6 text-gray-900">
              {t("order.item.detail_modal_quantity")}
            </label>

            <div className="mt-2 grid grid-cols-6">
              <div className="col-span-4 -mr-px -mt-px">
                <NumberField
                  id="quantity"
                  name="quantity"
                  onChange={handleChange}
                  value={values.quantity}
                  errorText={formatError(t, touched.quantity && errors.quantity)}
                  className="[&_input]:!rounded-l-md [&_input]:!rounded-r-none"
                />
              </div>
              <div className="col-span-2 -mt-px">
                <TextField
                  name="unit"
                  value={ensureString(values.unit)}
                  onChange={handleChange}
                  placeholder={t("order.item.detail_modal_unit")}
                  className="[&_input]:!rounded-l-none [&_input]:!rounded-r-md"
                  errorText={formatError(t, touched.unit && errors.unit)}
                />
              </div>
            </div>
          </div>
          <div className="col-span-full">
            <TextField
              label={t("order.item.detail_modal_notes")}
              name="notes"
              multiline
              maxLength={500}
              showCount
              value={ensureString(values.notes)}
              onChange={handleChange}
              errorText={formatError(t, touched.notes && errors.notes)}
            />
          </div>
        </ModalContent>
        <ModalActions align="right">
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

export default NewOrderItemModal;
