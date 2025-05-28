"use client";

import { Formik, FormikHelpers, FormikProps, getIn } from "formik";
import round from "lodash/round";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Checkbox,
  DateTimeLabel,
  DescriptionProperty2,
  InfoBox,
  ModalActions,
  ModalContent,
  NumberLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  VisibleWithSetting,
} from "@/components/atoms";
import { ModalHeader } from "@/components/atoms";
import { Button, DatePicker, Modal, TextField } from "@/components/molecules";
import { DateTimeDisplayType, OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { OutboundOrderGroupInputForm, outboundOrderGroupSchema } from "@/forms/orderGroup";
import { useOrgSettingExtendedStorage } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { OrderGroupInfo, OrderInfo } from "@/types/strapi";
import { OutboundOrderRequest } from "@/types/tms-tap-warehouse";
import { getFullName } from "@/utils/auth";
import { getClientTimezone, isValidDate, parseDate } from "@/utils/date";
import { formatNumber } from "@/utils/number";
import { ensureString, getDetailAddress, joinNonEmptyStrings } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialValues: OutboundOrderGroupInputForm = {
  clientTimezone: getClientTimezone(),
  currentDate: new Date(),
  exportDate: new Date(),
  notes: null,
  sendNotification: true,
};

type OutboundModalProps = {
  open: boolean;
  onClose: () => void;
  selectedOrderGroup?: OrderGroupInfo | null;
  onOutbound?: (outboundOrderRequest: OutboundOrderRequest) => Promise<void>;
};

export default function OutboundModal({ open, selectedOrderGroup, onOutbound, onClose }: OutboundModalProps) {
  const t = useTranslations();
  const { showNotification } = useNotification();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();

  const [selectedOrders, setSelectedOrders] = useState<OrderInfo[]>([]);

  const formikRef = useRef<FormikProps<OutboundOrderGroupInputForm>>(null);

  /**
   * Get total quantity
   */
  const totalQuantity = useMemo(() => {
    const groupedQuantities = selectedOrders.reduce(
      (acc, order) => {
        if (order.unit?.code) {
          if (!acc[order.unit?.code]) {
            acc[order.unit?.code] = 0;
          }
          acc[order.unit?.code] += order.weight ?? 0;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(groupedQuantities)
      .map(([unit, quantity]) => `${formatNumber(quantity)} ${unit}`)
      .join(", ");
  }, [selectedOrders]);

  /**
   * Get total CBM
   */
  const totalCbm = useMemo(() => {
    return selectedOrders.reduce((acc, order) => {
      if (order.cbm) {
        acc += order.cbm;
      }
      return acc;
    }, 0);
  }, [selectedOrders]);

  /**
   * Set selected orders
   */
  useEffect(() => {
    if (selectedOrderGroup?.orders && open) {
      setSelectedOrders((selectedOrderGroup.orders || []) as OrderInfo[]);
    }
  }, [selectedOrderGroup, open]);

  /**
   * Handle change export date
   */
  const handleChangeExportDate = useCallback((date: Date) => {
    formikRef.current?.setFieldValue("exportDate", date);
  }, []);

  /**
   * Handle change checkbox
   */
  const handleCheckboxChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    formikRef.current?.setFieldValue("sendNotification", event.target.checked);
  }, []);

  /**
   * Handle form submission for outbound order group
   * @param values - Form values containing export date
   * @param formikHelpers - Formik helper functions for form handling
   */
  const handleSubmitFormik = useCallback(
    async (values: OutboundOrderGroupInputForm, formikHelpers: FormikHelpers<OutboundOrderGroupInputForm>) => {
      // Check if required fields are provided
      if (values.exportDate && selectedOrderGroup?.code && selectedOrderGroup?.id) {
        // Create outbound request object with order and driver/vehicle details
        const outboundOrderRequest: OutboundOrderRequest = {
          clientTimeZone: getClientTimezone(),
          orders: [{ id: selectedOrderGroup.id, code: selectedOrderGroup.code }],
          createdAt: new Date(),
          exportDate: values.exportDate,
          status: "OUTBOUND",
          notes: values.notes,
          tripCode: null,
          // Get driver name from first order's trip
          driverName: getFullName(
            selectedOrderGroup?.orders?.[0]?.trips?.[0]?.driver?.firstName,
            selectedOrderGroup?.orders?.[0]?.trips?.[0]?.driver?.lastName
          ),
          // Get driver contact details
          driverPhone: selectedOrderGroup?.orders?.[0]?.trips?.[0]?.driver?.phoneNumber ?? null,
          driverEmail: selectedOrderGroup?.orders?.[0]?.trips?.[0]?.driver?.email ?? null,
          // Get vehicle details
          vehicleNumber: selectedOrderGroup?.orders?.[0]?.trips?.[0]?.vehicle?.vehicleNumber ?? null,
          vehicleType: selectedOrderGroup?.orders?.[0]?.trips?.[0]?.vehicle?.type?.name ?? null,
          sendNotification: values.sendNotification,
        };

        // Call outbound handler if provided
        if (onOutbound) {
          await onOutbound(outboundOrderRequest);
        }
      } else {
        // Show error if validation fails
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("common.message.save_error_unknown", { name: t("components.outbound_modal.title") }),
        });
      }
      // Reset form state
      formikHelpers.setSubmitting(false);
      formikHelpers.resetForm();
      onClose();
    },
    [
      onClose,
      onOutbound,
      selectedOrderGroup?.code,
      selectedOrderGroup?.id,
      selectedOrderGroup?.orders,
      showNotification,
      t,
    ]
  );

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={outboundOrderGroupSchema}
      onSubmit={handleSubmitFormik}
    >
      {({ values, errors, touched, isSubmitting, handleChange, submitForm }) => (
        <Modal open={open} onClose={onClose} size="6xl" showCloseButton allowOverflow>
          <ModalHeader title={t("components.outbound_modal.title")} />
          <ModalContent padding={false} className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden">
            <DescriptionProperty2 label={t("components.outbound_modal.total_weight")} className="px-4 pt-6">
              <div>{totalQuantity || 0}</div>
            </DescriptionProperty2>
            <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ENABLE_CBM_FIELD} expect={true}>
              <DescriptionProperty2 label={t("components.outbound_modal.total_cbm")} className="px-4 pb-4">
                {totalCbm ? round(totalCbm, 2) : t("common.empty")}
              </DescriptionProperty2>
            </VisibleWithSetting>

            <TableContainer variant="paper" inside horizontalScroll>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t("components.outbound_modal.customer")}</TableCell>
                    <TableCell>{t("components.outbound_modal.pickup_point")}</TableCell>
                    <TableCell>{t("components.outbound_modal.delivery_point")}</TableCell>
                    <TableCell>{t("components.outbound_modal.weight")}</TableCell>
                    <TableCell>{t("components.outbound_modal.cbm")}</TableCell>
                    <TableCell>{t("components.outbound_modal.pickup_date")}</TableCell>
                    <TableCell>{t("components.outbound_modal.delivery_date")}</TableCell>
                    <TableCell>{t("components.outbound_modal.delivery_time")}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {selectedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell nowrap={false} className="min-w-[240px]">
                        <InfoBox
                          label={order.customer?.name}
                          subLabel={order.customer?.code}
                          emptyLabel={t("common.empty")}
                          nowrap={false}
                        />
                      </TableCell>
                      <TableCell nowrap={false} className="min-w-[240px]">
                        <InfoBox
                          label={joinNonEmptyStrings(
                            [order?.route?.pickupPoints?.[0]?.code, order?.route?.pickupPoints?.[0]?.name],
                            " - "
                          )}
                          subLabel={getDetailAddress(order?.route?.pickupPoints?.[0]?.address)}
                          emptyLabel={t("common.empty")}
                          nowrap={false}
                          className="min-w-[180px] max-w-[240px]"
                        />
                      </TableCell>
                      <TableCell nowrap={false} className="min-w-[240px]">
                        <InfoBox
                          label={joinNonEmptyStrings(
                            [order?.route?.deliveryPoints?.[0]?.code, order?.route?.deliveryPoints?.[0]?.name],
                            " - "
                          )}
                          subLabel={getDetailAddress(order?.route?.deliveryPoints?.[0]?.address)}
                          emptyLabel={t("common.empty")}
                          nowrap={false}
                          className="min-w-[180px] max-w-[240px]"
                        />
                      </TableCell>
                      <TableCell>
                        <NumberLabel value={order.weight} unit={order.unit.code} />
                      </TableCell>
                      <TableCell>
                        <NumberLabel value={order.cbm} />
                      </TableCell>
                      <TableCell>
                        <DateTimeLabel
                          value={order?.trips?.[0]?.pickupDate}
                          type="date"
                          emptyLabel={t("common.empty")}
                        />
                      </TableCell>
                      <TableCell>
                        <DateTimeLabel
                          value={order?.trips?.[0]?.deliveryDate}
                          type="date"
                          emptyLabel={t("common.empty")}
                        />
                      </TableCell>
                      <TableCell nowrap={false}>{order?.trips?.[0]?.deliveryTimeNotes || t("common.empty")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ModalContent>

          <ModalActions className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-12">
              <div className="sm:col-span-2">
                <DatePicker
                  label={t("components.outbound_modal.export_date")}
                  selected={isValidDate(values.exportDate) ? parseDate(values.exportDate) : undefined}
                  onChange={handleChangeExportDate}
                  errorText={formatError(t, getIn(touched, "exportDate") && getIn(errors, "exportDate"))}
                  {...(organizationOrderRelatedDateFormat === DateTimeDisplayType.DATETIME_NO_SECOND && {
                    dateFormat: "dd/MM/yyyy HH:mm",
                    mask: "99/99/9999 99:99",
                    showTimeSelect: true,
                  })}
                />
              </div>
              <div className="sm:col-span-10">
                <TextField
                  label={t("components.outbound_modal.notes")}
                  name="notes"
                  value={ensureString(values.notes)}
                  onChange={handleChange}
                  placeholder={t("components.outbound_modal.notes_placeholder")}
                  errorText={formatError(t, getIn(touched, "notes") && getIn(errors, "notes"))}
                />
              </div>

              <div className="col-span-full">
                <Checkbox
                  label={t("components.outbound_modal.send_notification")}
                  checked={values.sendNotification}
                  onChange={handleCheckboxChange}
                />
              </div>
            </div>
            <div className="-mx-4 my-2 border-t border-gray-200 sm:-mx-6" />
            <div className="flex justify-end gap-4">
              <Button variant="outlined" color="secondary" onClick={onClose} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={isSubmitting} onClick={submitForm}>
                {t("components.outbound_modal.title")}
              </Button>
            </div>
          </ModalActions>
        </Modal>
      )}
    </Formik>
  );
}
