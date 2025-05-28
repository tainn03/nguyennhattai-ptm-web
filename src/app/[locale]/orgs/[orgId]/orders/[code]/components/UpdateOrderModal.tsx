import { FormikHelpers, getIn, useFormik } from "formik";
import { useTranslations } from "next-intl";
import numeral from "numeral";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ModalActions, ModalContent, ModalHeader, VisibleWithSetting } from "@/components/atoms";
import { Alert, Button, DatePicker, Modal, NumberField, TextField } from "@/components/molecules";
import Combobox, { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { NewUnitOfMeasureModal } from "@/components/organisms";
import { DateTimeDisplayType, OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { OrderDetailModalInputForm, orderDetailModalInputSchema } from "@/forms/order";
import { useAuth, useOrgSettingExtendedStorage, usePermission, useUnitOfMeasureOptions } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { updateOrderModal } from "@/services/client/order";
import { ErrorType } from "@/types";
import { OrderInfo, UnitOfMeasureInfo } from "@/types/strapi";
import { getGeneralDispatchVehicleInfo } from "@/utils/order";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: OrderDetailModalInputForm = {
  unitOfMeasureId: null,
  weight: null,
  cbm: null,
  totalAmount: null,
  notes: null,
};

type UpdateOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (id?: number) => void;
};

const UpdateOrderModal = ({ open, onClose, onSave }: UpdateOrderModalProps) => {
  const t = useTranslations();
  const { orgId, userId, orgLink } = useAuth();
  const { order } = useOrderState();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();
  const { showNotification } = useNotification();
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const { canNew: canNewUnit } = usePermission("unit-of-measure");

  const { totalTripWeight } = useMemo(() => getGeneralDispatchVehicleInfo(order), [order]);
  const { unitOfMeasures, isLoading, mutate } = useUnitOfMeasureOptions({ organizationId: orgId });

  const unitOfMeasureOptions: ComboboxItem[] = useMemo(
    () =>
      unitOfMeasures?.map((item: UnitOfMeasureInfo) => ({
        value: ensureString(item.id),
        label: item.code,
        subLabel: item.name,
      })) || [],
    [unitOfMeasures]
  );

  const handleSubmitForm = useCallback(
    async (values: OrderDetailModalInputForm, formikHelpers: FormikHelpers<OrderDetailModalInputForm>) => {
      const result = await updateOrderModal(
        orgLink,
        {
          ...(values as OrderInfo),
          id: Number(order?.id),
          code: order?.code,
          unitOfMeasureId: values.unitOfMeasureId,
          organizationId: orgId,
          updatedById: userId,
        },
        order?.updatedAt
      );

      if (result.error) {
        let message = "";
        switch (result.error) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: order?.code });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: order?.code });
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
          message: t("common.message.save_success_message", {
            name: order?.code,
          }),
        });

        onSave && onSave(result?.data?.id);
        formikHelpers.setSubmitting(false);
      }
    },
    [onSave, order?.code, order?.id, order?.updatedAt, orgId, orgLink, showNotification, t, userId]
  );

  const { values, errors, touched, isSubmitting, handleChange, handleSubmit, setFieldValue, resetForm } =
    useFormik<OrderDetailModalInputForm>({
      initialValues: initialFormValues,
      validationSchema: orderDetailModalInputSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitForm,
    });

  useEffect(() => {
    resetForm({
      values: {
        ...order,
        unitOfMeasureId: order?.unit ? Number(order.unit.id) : null,
      },
    });
  }, [order, resetForm, open]);

  const currentUnit = useMemo(
    () =>
      unitOfMeasureOptions.find((item) => item.value === ensureString(values.unitOfMeasureId))?.label.toUpperCase() ||
      "UNIT",
    [unitOfMeasureOptions, values.unitOfMeasureId]
  );

  const handleComboboxChange = useCallback(
    (value: string) => {
      setFieldValue("unitOfMeasureId", numeral(value).value());
    },
    [setFieldValue]
  );

  const handleClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  const handleDateChange = useCallback(
    (name: string) => (date: Date | null) => {
      setFieldValue(name, date);
    },
    [setFieldValue]
  );

  const handleOpenUnitModal = useCallback(() => {
    setIsUnitModalOpen(true);
  }, []);

  const handleCloseUnitModal = useCallback(() => {
    setIsUnitModalOpen(false);
  }, []);

  const handleSubmitUnitModal = useCallback(
    (id?: number) => {
      setIsUnitModalOpen(false);
      if (id) {
        setFieldValue("unitOfMeasureId", id);
        mutate();
      }
    },
    [mutate, setFieldValue]
  );

  return (
    <>
      <Modal open={open} size="3xl" showCloseButton onClose={handleClose}>
        <form onSubmit={handleSubmit}>
          <ModalHeader
            title={t("order.order_detail.order_detail_modal_title")}
            subTitle={t("order.order_detail.order_detail_modal_title_sub")}
          />
          <ModalContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            {Number(values?.weight) < totalTripWeight && (
              <div className="col-span-full">
                <Alert color="warning" title={t("order.order_detail.warning_exceed_payload")} />
              </div>
            )}
            <div className="sm:col-span-3">
              <DatePicker
                label={t("order.order_detail.order_detail_modal_order_date")}
                required
                name="orderDate"
                selected={values.orderDate && new Date(values.orderDate)}
                onChange={handleDateChange("orderDate")}
                errorText={formatError(t, touched.orderDate && errors.orderDate)}
                {...(organizationOrderRelatedDateFormat === DateTimeDisplayType.DATETIME_NO_SECOND && {
                  dateFormat: "dd/MM/yyyy HH:mm",
                  mask: "99/99/9999 99:99",
                  showTimeSelect: true,
                })}
              />
            </div>
            <div className="sm:col-span-3">
              <DatePicker
                label={t("order.order_detail.order_detail_modal_delivery_date")}
                name="deliveryDate"
                selected={values.deliveryDate && new Date(values.deliveryDate)}
                onChange={handleDateChange("deliveryDate")}
                errorText={formatError(t, touched.deliveryDate && errors.deliveryDate)}
                {...(organizationOrderRelatedDateFormat === DateTimeDisplayType.DATETIME_NO_SECOND && {
                  dateFormat: "dd/MM/yyyy HH:mm",
                  mask: "99/99/9999 99:99",
                  showTimeSelect: true,
                })}
              />
            </div>
            <div className="sm:col-span-2">
              <Combobox
                label={t("order.order_detail.order_detail_modal_unit_of_measure")}
                required
                items={unitOfMeasureOptions}
                value={ensureString(values.unitOfMeasureId)}
                loading={isLoading}
                placeholder={t("order.order_detail.order_detail_modal_unit_of_measure_placeholder")}
                onChange={handleComboboxChange}
                errorText={formatError(t, getIn(touched, "unitOfMeasureId") && getIn(errors, "unitOfMeasureId"))}
                newButtonText={
                  canNewUnit() ? t("order.order_detail.order_detail_modal_unit_of_measure_button") : undefined
                }
                onNewButtonClick={canNewUnit() ? handleOpenUnitModal : undefined}
              />
            </div>
            <div className="sm:col-span-2">
              <NumberField
                label={t("order.order_detail.order_detail_modal_weight")}
                required
                name="weight"
                value={values.weight}
                suffixText={currentUnit}
                onChange={handleChange}
                errorText={formatError(t, touched.weight && errors.weight)}
              />
            </div>

            {/* CBM */}
            <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ENABLE_CBM_FIELD} expect={true}>
              <div className="sm:col-span-2">
                <NumberField
                  label={t("order.order_detail.order_detail_modal_cbm")}
                  name="cbm"
                  value={values.cbm}
                  onChange={handleChange}
                  errorText={formatError(t, touched.cbm && errors.cbm)}
                />
              </div>
            </VisibleWithSetting>

            <div className="sm:col-span-2">
              <NumberField
                label={t("order.order_detail.order_detail_modal_total_amount")}
                name="totalAmount"
                value={values.totalAmount}
                suffixText={t("common.unit.currency")}
                onChange={handleChange}
                errorText={formatError(t, touched.totalAmount && errors.totalAmount)}
              />
            </div>

            <div className="sm:col-span-2">
              <DatePicker
                label={t("order.order_detail.order_detail_modal_payment_due_date")}
                name="paymentDueDate"
                popperPlacement="right"
                selected={values.paymentDueDate && new Date(values.paymentDueDate)}
                onChange={handleDateChange("paymentDueDate")}
                errorText={formatError(t, touched.paymentDueDate && errors.paymentDueDate)}
              />
            </div>
            <div className="col-span-full col-start-1">
              <TextField
                label={t("order.order_detail.order_detail_modal_note")}
                name="notes"
                multiline
                maxLength={500}
                showCount
                value={ensureString(values.notes)}
                onChange={handleChange}
                errorText={formatError(t, touched.notes && errors.notes)}
                helperText={
                  Number(values.weight) !== Number(order?.weight) &&
                  ensureString(values?.notes).length === 0 &&
                  t("order.order_detail.notes_recommend")
                }
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

      {/* New unit of measure modal */}
      <NewUnitOfMeasureModal open={isUnitModalOpen} onClose={handleCloseUnitModal} onSubmit={handleSubmitUnitModal} />
    </>
  );
};

export default UpdateOrderModal;
