"use client";

import { isAfter, isBefore, parseISO } from "date-fns";
import { Formik, FormikHelpers, FormikProps, getIn } from "formik";
import round from "lodash/round";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiaShippingFastSolid } from "react-icons/lia";

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
import { Button, Combobox, DatePicker, Modal } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { DateTimeDisplayType, OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { InboundOrderGroupInputForm, inboundOrderGroupSchema } from "@/forms/orderGroup";
import {
  useAuth,
  useDriverOptions,
  useOrgSettingExtendedStorage,
  useVehicleOptions,
  useWarehouseOptions,
} from "@/hooks";
import { useNotification } from "@/redux/actions";
import { DriverInfo, OrderGroupInfo, OrderInfo, VehicleInfo, WarehouseInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { getClientTimezone, isValidDate, parseDate } from "@/utils/date";
import { equalId, formatNumber } from "@/utils/number";
import { ensureString, getDetailAddress, joinNonEmptyStrings } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialValues: InboundOrderGroupInputForm = {
  organizationId: 0,
  organizationName: "",
  sendNotification: true,
  clientTimezone: getClientTimezone(),
  currentDate: new Date(),
  pickupDate: new Date(),
  deliveryDate: new Date(),
  driver: {
    id: undefined,
  },
  vehicle: {
    id: undefined,
  },
  warehouse: {
    id: undefined,
  },
  orderGroup: {
    id: undefined,
  },
  unitOfMeasure: {
    id: -1,
  },
  weight: 0,
  cbm: 0,
};

type InboundModalProps = {
  open: boolean;
  onClose: () => void;
  selectedVehicle?: VehicleInfo | null;
  selectedOrderGroup?: OrderGroupInfo | null;
  onPressSelectVehicle?: () => void;
  onInbound?: (inboundOrderGroup: InboundOrderGroupInputForm) => Promise<void>;
};

export default function InboundModal({
  open,
  onClose,
  selectedVehicle,
  selectedOrderGroup,
  onPressSelectVehicle,
  onInbound,
}: InboundModalProps) {
  const t = useTranslations();
  const { showNotification } = useNotification();
  const { orgId, org } = useAuth();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();

  const { drivers, isLoading: isDriverOptionsLoading } = useDriverOptions({
    organizationId: orgId,
    isFetchLicenseType: true,
    isFetchVehicle: false,
    isFetchDetail: true,
    isFetchPhoneNumber: true,
    isFetchEmail: true,
  });

  const { vehicles, isLoading: isVehicleOptionsLoading } = useVehicleOptions({
    organizationId: orgId,
    isFetchType: true,
  });

  const { warehouses, isLoading: isWarehouseOptionsLoading } = useWarehouseOptions({
    organizationId: orgId,
  });

  const [selectedOrders, setSelectedOrders] = useState<OrderInfo[]>([]);

  const formikRef = useRef<FormikProps<InboundOrderGroupInputForm>>(null);

  /**
   * Driver options with full name
   */
  const driverOptions: ComboboxItem[] = useMemo(
    () =>
      drivers.map((item: DriverInfo) => ({
        value: ensureString(item.id),
        label: getFullName(item.firstName, item.lastName),
        subLabel: item.licenseType?.name,
      })),
    [drivers]
  );

  /**
   * Vehicle options with type name
   */
  const vehicleOptions: ComboboxItem[] = useMemo(
    () =>
      vehicles.map((item: VehicleInfo) => ({
        value: ensureString(item.id),
        label: item.vehicleNumber,
        subLabel: item.type?.name,
      })),
    [vehicles]
  );

  /**
   * Warehouse options
   */
  const warehouseOptions: ComboboxItem[] = useMemo(
    () =>
      warehouses.map((item: WarehouseInfo) => ({
        value: ensureString(item.id),
        label: ensureString(item.name) || joinNonEmptyStrings([item.address?.code, item.address?.name], " - "),
      })),
    [warehouses]
  );

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
   * Get earliest pickup date from selected orders
   */
  const earliestPickupDate = useMemo(() => {
    // If in edit mode and has selected order group with orders
    if (selectedOrderGroup?.orders) {
      const currentOrders = selectedOrderGroup.orders as OrderInfo[];
      // Get first trip from first order
      const firstTrip = currentOrders?.[0]?.trips?.[0];
      // Return pickup date if exists, otherwise return current date
      return firstTrip?.pickupDate ?? new Date();
    } else if (!selectedOrders.length) {
      // Return current date if no orders selected
      return new Date();
    }

    // Filter orders that have order date
    const validOrders = selectedOrders.filter((order) => order.orderDate);
    if (!validOrders.length) return new Date();

    // Convert order dates to Date objects
    const dates = validOrders.map((order) => parseISO(ensureString(order.orderDate)));
    // Find earliest date by comparing each date
    return dates.reduce((earliest, date) => (isBefore(date, earliest) ? date : earliest));
  }, [selectedOrderGroup?.orders, selectedOrders]);

  /**
   * Get latest delivery date from selected orders
   */
  const latestDeliveryDate = useMemo(() => {
    // If in edit mode and has selected order group with orders
    if (selectedOrderGroup?.orders) {
      const currentOrders = selectedOrderGroup.orders as OrderInfo[];
      // Get first trip from first order
      const firstTrip = currentOrders?.[0]?.trips?.[0];
      // Return delivery date if exists, otherwise return current date
      return firstTrip?.deliveryDate ?? new Date();
    } else if (!selectedOrders.length) {
      // Return current date if no orders selected
      return new Date();
    }

    const validOrders = selectedOrders.filter((order) => order.deliveryDate);
    if (!validOrders.length) return new Date();

    const dates = validOrders.map((order) => parseISO(ensureString(order.deliveryDate)));
    return dates.reduce((latest, date) => (isAfter(date, latest) ? date : latest));
  }, [selectedOrderGroup?.orders, selectedOrders]);

  /**
   * Set initial values
   */
  useEffect(() => {
    formikRef.current?.setFieldValue("pickupDate", earliestPickupDate);
    formikRef.current?.setFieldValue("deliveryDate", latestDeliveryDate);
  }, [earliestPickupDate, latestDeliveryDate]);

  /**
   * Set selected vehicle
   */
  useEffect(() => {
    if (selectedVehicle) {
      formikRef.current?.setFieldValue("vehicle", selectedVehicle);
      formikRef.current?.setFieldTouched("vehicle.id", false);
      const selectedDriver = drivers.find((driver) => equalId(driver.id, selectedVehicle.driver?.id));
      if (selectedDriver) {
        formikRef.current?.setFieldValue("driver", selectedDriver);
        formikRef.current?.setFieldTouched("driver.id", false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle]);

  /**
   * Set selected orders
   */
  useEffect(() => {
    if (selectedOrderGroup?.orders) {
      const currentOrders = selectedOrderGroup.orders as OrderInfo[];
      const currentTrips = currentOrders.map((order) => ({
        id: order.id,
        ...(order.trips?.[0]?.id && { tripId: order.trips?.[0]?.id }),
        pickupTimeNotes: order.trips?.[0]?.pickupTimeNotes,
        deliveryTimeNotes: order.trips?.[0]?.deliveryTimeNotes,
      }));

      formikRef.current?.setFieldValue("trips", currentTrips);
      setSelectedOrders(currentOrders);
    }
  }, [selectedOrderGroup]);

  useEffect(() => {
    if (!isWarehouseOptionsLoading && warehouses.length === 1) {
      formikRef.current?.setFieldValue("warehouse", warehouses[0]);
    }
  }, [selectedOrderGroup, warehouses, isWarehouseOptionsLoading]);

  /**
   * Handle change pickup date
   */
  const handleChangePickupDate = useCallback((date: Date) => {
    formikRef.current?.setFieldValue("pickupDate", date);
  }, []);

  /**
   * Handle change delivery date
   * @param date - Date
   */
  const handleChangeDeliveryDate = useCallback((date: Date) => {
    formikRef.current?.setFieldValue("deliveryDate", date);
  }, []);

  /**
   * Handle change vehicle
   * @param value - Value
   */
  const handleVehicleChange = useCallback(
    (value: string) => {
      const selectedVehicle = vehicles.find((vehicle) => equalId(vehicle.id, value));
      formikRef.current?.setFieldValue("vehicle", selectedVehicle);
    },
    [vehicles]
  );

  /**
   * Handle change driver
   * @param value - Value
   */
  const handleDriverChange = useCallback(
    (value: string) => {
      const selectedDriver = drivers.find((driver) => equalId(driver.id, value));
      formikRef.current?.setFieldValue("driver", selectedDriver);
    },
    [drivers]
  );

  /**
   * Handle submit formik
   * @param values - Values
   * @param formikHelpers - Formik helpers
   */
  const handleSubmitFormik = useCallback(
    async (values: InboundOrderGroupInputForm, formikHelpers: FormikHelpers<InboundOrderGroupInputForm>) => {
      if (values.driver?.id && values.vehicle?.id && selectedOrderGroup?.id && values.warehouse?.id) {
        const unitOfMeasure = selectedOrders?.[0]?.unit;

        const totalWeight = selectedOrders.reduce((acc, order) => {
          if (order.weight) {
            acc += order.weight;
          }
          return acc;
        }, 0);

        const inboundOrderGroup: InboundOrderGroupInputForm = {
          organizationId: Number(orgId),
          organizationName: ensureString(org?.name),
          sendNotification: values.sendNotification,
          clientTimezone: getClientTimezone(),
          currentDate: new Date(),
          pickupDate: values.pickupDate,
          deliveryDate: values.deliveryDate,
          driver: {
            id: values.driver.id,
            firstName: values.driver.user?.detail?.firstName || values.driver?.firstName,
            lastName: values.driver.user?.detail?.lastName || values.driver?.lastName,
            phoneNumber: values.driver?.phoneNumber,
            email: values.driver?.email,
          },
          vehicle: { id: values.vehicle.id, vehicleNumber: values.vehicle?.vehicleNumber },
          orderGroup: { id: selectedOrderGroup?.id },
          warehouse: { id: values.warehouse.id, address: { id: values.warehouse?.address?.id } },
          unitOfMeasure: { id: unitOfMeasure.id, code: unitOfMeasure.code },
          weight: totalWeight,
          cbm: totalCbm,
        };

        if (onInbound) {
          await onInbound(inboundOrderGroup);
        }
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("common.message.save_error_unknown", { name: t("components.inbound_modal.title") }),
        });
      }
      formikHelpers.setSubmitting(false);
      formikHelpers.resetForm();
      onClose();
    },
    [selectedOrderGroup?.id, onClose, selectedOrders, orgId, org?.name, totalCbm, onInbound, showNotification, t]
  );

  /**
   * Handle change warehouse
   * @param value - Value
   */
  const handleWarehouseChange = useCallback(
    (value: string) => {
      const selectedWarehouse = warehouses.find((warehouse) => equalId(warehouse.id, value));
      formikRef.current?.setFieldValue("warehouse", selectedWarehouse);
    },
    [warehouses]
  );

  /**
   * Handle change checkbox
   */
  const handleCheckboxChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    formikRef.current?.setFieldValue("sendNotification", event.target.checked);
  }, []);

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={inboundOrderGroupSchema}
      onSubmit={handleSubmitFormik}
    >
      {({ values, errors, touched, isSubmitting, submitForm }) => (
        <Modal open={open} onClose={onClose} size="7xl" showCloseButton allowOverflow>
          <ModalHeader title={t("components.inbound_modal.title")} />
          <ModalContent padding={false} className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden">
            <DescriptionProperty2 label={t("components.inbound_modal.total_weight")} className="px-4 pt-6">
              <div>{totalQuantity || 0}</div>
            </DescriptionProperty2>
            <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ENABLE_CBM_FIELD} expect={true}>
              <DescriptionProperty2 label={t("components.inbound_modal.total_cbm")} className="px-4 pb-4">
                {totalCbm ? round(totalCbm, 2) : t("common.empty")}
              </DescriptionProperty2>
            </VisibleWithSetting>

            <TableContainer variant="paper" inside horizontalScroll>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t("components.inbound_modal.customer")}</TableCell>
                    <TableCell>{t("components.inbound_modal.pickup_point")}</TableCell>
                    <TableCell>{t("components.inbound_modal.delivery_point")}</TableCell>
                    <TableCell>{t("components.inbound_modal.weight")}</TableCell>
                    <TableCell>{t("components.inbound_modal.cbm")}</TableCell>
                    <TableCell>{t("components.inbound_modal.pickup_date")}</TableCell>
                    <TableCell>{t("components.inbound_modal.delivery_date")}</TableCell>
                    <TableCell>{t("components.inbound_modal.delivery_time")}</TableCell>
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
                          value={selectedOrderGroup?.orders?.[0]?.trips?.[0]?.pickupDate}
                          type="date"
                          emptyLabel={t("common.empty")}
                        />
                      </TableCell>
                      <TableCell>
                        <DateTimeLabel
                          value={selectedOrderGroup?.orders?.[0]?.trips?.[0]?.deliveryDate}
                          type="date"
                          emptyLabel={t("common.empty")}
                        />
                      </TableCell>
                      <TableCell nowrap={false}>
                        {selectedOrderGroup?.orders?.[0]?.trips?.[0]?.deliveryTimeNotes || t("common.empty")}
                      </TableCell>
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
                  label={t("components.inbound_modal.pickup_date")}
                  selected={isValidDate(values.pickupDate) ? parseDate(values.pickupDate) : undefined}
                  onChange={handleChangePickupDate}
                  errorText={formatError(t, getIn(touched, "pickupDate") && getIn(errors, "pickupDate"))}
                  {...(organizationOrderRelatedDateFormat === DateTimeDisplayType.DATETIME_NO_SECOND && {
                    dateFormat: "dd/MM/yyyy HH:mm",
                    mask: "99/99/9999 99:99",
                    showTimeSelect: true,
                  })}
                />
              </div>
              <div className="sm:col-span-2">
                <DatePicker
                  label={t("components.inbound_modal.inbound_date")}
                  selected={isValidDate(values.deliveryDate) ? parseDate(values.deliveryDate) : undefined}
                  onChange={handleChangeDeliveryDate}
                  errorText={formatError(t, getIn(touched, "deliveryDate") && getIn(errors, "deliveryDate"))}
                />
              </div>

              <div className="sm:col-span-3">
                <Combobox
                  placement="top"
                  label={t("components.inbound_modal.warehouse")}
                  items={warehouseOptions}
                  placeholder={t("components.inbound_modal.select_warehouse")}
                  loading={isWarehouseOptionsLoading}
                  value={ensureString(values.warehouse?.id)}
                  errorText={formatError(t, getIn(touched, "warehouse.id") && getIn(errors, "warehouse.id"))}
                  onChange={handleWarehouseChange}
                />
              </div>
              {!values.vehicle?.id ? (
                <>
                  <div className="flex items-end justify-start sm:col-span-2">
                    <Button
                      variant="outlined"
                      onClick={onPressSelectVehicle}
                      icon={LiaShippingFastSolid}
                      iconPlacement="end"
                    >
                      {t("components.inbound_modal.select_vehicle")}
                    </Button>
                  </div>
                  {getIn(touched, "vehicle.id") && getIn(errors, "vehicle.id") && (
                    <div className="col-span-full text-xs text-red-500">
                      {formatError(t, getIn(touched, "vehicle.id") && getIn(errors, "vehicle.id"))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-end gap-4 sm:col-span-5 sm:col-start-1">
                    <Combobox
                      placement="top"
                      className="flex-1"
                      label={t("components.inbound_modal.vehicle")}
                      items={vehicleOptions}
                      placeholder={t("components.inbound_modal.select_vehicle")}
                      loading={isVehicleOptionsLoading}
                      value={ensureString(values.vehicle?.id)}
                      errorText={formatError(t, getIn(touched, "vehicle.id") && getIn(errors, "vehicle.id"))}
                      onChange={handleVehicleChange}
                    />

                    <Button
                      className="w-fit"
                      variant="outlined"
                      onClick={onPressSelectVehicle}
                      icon={LiaShippingFastSolid}
                      iconPlacement="end"
                    >
                      {t("components.inbound_modal.select_vehicle")}
                    </Button>
                  </div>

                  <div className="sm:col-span-3">
                    <Combobox
                      placement="top"
                      label={t("components.inbound_modal.driver")}
                      items={driverOptions}
                      placeholder={t("components.inbound_modal.select_driver")}
                      loading={isDriverOptionsLoading}
                      value={ensureString(values.driver?.id)}
                      errorText={formatError(t, getIn(touched, "driver.id") && getIn(errors, "driver.id"))}
                      onChange={handleDriverChange}
                    />
                  </div>

                  <div className="col-span-full">
                    <Checkbox
                      label={t("components.inbound_modal.send_notification")}
                      checked={values.sendNotification}
                      onChange={handleCheckboxChange}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="-mx-4 my-2 border-t border-gray-200 sm:-mx-6" />
            <div className="flex justify-end gap-4">
              <Button variant="outlined" color="secondary" onClick={onClose} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={isSubmitting} onClick={submitForm}>
                {t("order_group.inbound")}
              </Button>
            </div>
          </ModalActions>
        </Modal>
      )}
    </Formik>
  );
}
