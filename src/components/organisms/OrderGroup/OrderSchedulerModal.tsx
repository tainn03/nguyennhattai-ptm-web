"use client";

import { isAfter, isBefore, parseISO } from "date-fns";
import { Formik, FormikHelpers, FormikProps, getIn } from "formik";
import { useAtom } from "jotai";
import round from "lodash/round";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
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
import { Button, Combobox, DatePicker, Modal, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { DateTimeDisplayType, OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { OrderScheduleInputForm, orderSchedulerSchema, TripScheduleInputForm } from "@/forms/orderGroup";
import { OrderScheduler } from "@/forms/orderGroup";
import { useAuth, useDriverOptions, useOrgSettingExtendedStorage, useVehicleOptions } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { orderGroupAtom } from "@/states/atoms/orderGroupAtom";
import { AnyType } from "@/types";
import { DriverInfo, OrderGroupInfo, OrderInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { isValidDate, parseDate } from "@/utils/date";
import { equalId, formatNumber } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { cn } from "@/utils/twcn";
import { formatError } from "@/utils/yup";

const initialValues: OrderScheduler = {
  pickupDate: new Date(),
  deliveryDate: new Date(),
  driver: {
    id: undefined,
  },
  vehicle: {
    id: undefined,
  },
  trips: [],
};

type OrderSchedulerModalProps = {
  open: boolean;
  onClose: () => void;
  selectedVehicle?: VehicleInfo | null;
  selectedOrderGroup?: OrderGroupInfo | null;
  onPressSelectVehicle?: () => void;
  onCreate?: (schedule: OrderScheduleInputForm) => Promise<void>;
  onUpdate?: (schedule: OrderScheduleInputForm) => Promise<void>;
  isEdit?: boolean;
};

export default function OrderSchedulerModal({
  open,
  onClose,
  selectedVehicle,
  selectedOrderGroup,
  onPressSelectVehicle,
  onCreate,
  onUpdate,
  isEdit = false,
}: OrderSchedulerModalProps) {
  const t = useTranslations();
  const { showNotification } = useNotification();
  const { orgId } = useAuth();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();

  const { drivers, isLoading: isDriverOptionsLoading } = useDriverOptions({
    organizationId: orgId,
    isFetchLicenseType: true,
    isFetchVehicle: false,
  });

  const { vehicles, isLoading: isVehicleOptionsLoading } = useVehicleOptions({
    organizationId: orgId,
    isFetchType: true,
  });

  const [selectedOrders, setSelectedOrders] = useState<OrderInfo[]>([]);
  const [{ selectedOrders: atomSelectedOrders }] = useAtom(orderGroupAtom);

  const formikRef = useRef<FormikProps<OrderScheduler>>(null);

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
    if (isEdit && selectedOrderGroup?.orders) {
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
  }, [isEdit, selectedOrderGroup?.orders, selectedOrders]);

  /**
   * Get latest delivery date from selected orders
   */
  const latestDeliveryDate = useMemo(() => {
    // If in edit mode and has selected order group with orders
    if (isEdit && selectedOrderGroup?.orders) {
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
  }, [isEdit, selectedOrderGroup?.orders, selectedOrders]);

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
    if (isEdit && selectedOrderGroup?.orders) {
      const currentOrders = selectedOrderGroup.orders as OrderInfo[];
      const currentTrips = currentOrders.map((order) => ({
        id: order.id,
        ...(isEdit && { tripId: order.trips?.[0]?.id }), // Only set tripId if in edit mode
        pickupTimeNotes: order.trips?.[0]?.pickupTimeNotes,
        deliveryTimeNotes: order.trips?.[0]?.deliveryTimeNotes,
      }));

      formikRef.current?.setFieldValue("trips", currentTrips);
      setSelectedOrders(currentOrders);
    } else if (!isEdit) {
      const currentOrders = atomSelectedOrders;
      const currentTrips = currentOrders.map((order) => ({
        id: order.id,
        pickupTimeNotes: (order.meta as AnyType)?.pickupTimeNotes,
        deliveryTimeNotes: (order.meta as AnyType)?.deliveryTimeNotes,
      }));

      formikRef.current?.setFieldValue("trips", currentTrips);
      setSelectedOrders(atomSelectedOrders);
    }
  }, [isEdit, selectedOrderGroup, atomSelectedOrders]);

  /**
   * Handle change time for each trip
   * @param id - Order id
   * @param date - Date
   */
  const handleNoteChange = useCallback(
    (id: number, type: keyof TripScheduleInputForm) => (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const currentTrips = formikRef.current?.values.trips ?? [];
      const tripIndex = currentTrips.findIndex((trip) => trip?.id === id);
      const newTrips = [...currentTrips];

      if (tripIndex === -1) {
        newTrips.push({
          id,
          ...(isEdit && { tripId: currentTrips[tripIndex]?.tripId }),
          [type]: event.target.value,
        });
      } else {
        newTrips[tripIndex] = {
          ...currentTrips[tripIndex],
          [type]: event.target.value,
        };
      }

      // Update the formik value
      formikRef.current?.setFieldValue("trips", newTrips);
    },
    [isEdit]
  );

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
    async (values: OrderScheduler, formikHelpers: FormikHelpers<OrderScheduler>) => {
      const tripSchedules: TripScheduleInputForm[] = [];

      selectedOrders.forEach((order) => {
        const inputTrip = values.trips.find((trip) => equalId(trip?.id, order.id));
        const deliveryDate = isEdit ? new Date(values.deliveryDate) : values.deliveryDate;

        if (!order.route?.id) {
          showNotification({
            color: "error",
            title: t("components.order_scheduler_modal.missing_route"),
            message: t("components.order_scheduler_modal.missing_route_message"),
          });
          return;
        }

        tripSchedules.push({
          ...(isEdit && { tripId: inputTrip?.tripId }), // Only set id if in edit mode
          orderId: order.id,
          orderCode: order.code,
          routeId: order.route.id,
          pickupDate: isEdit ? values.pickupDate : values.pickupDate.toISOString(),
          deliveryDate: deliveryDate.toISOString(),
          pickupTimeNotes: inputTrip?.pickupTimeNotes || null,
          deliveryTimeNotes: inputTrip?.deliveryTimeNotes || null,
          weight: order.weight ?? 0,
        });
      });

      if (values.driver?.id && values.vehicle?.id) {
        const orderSchedule: OrderScheduleInputForm = {
          organizationId: Number(orgId),
          driverId: values.driver.id,
          vehicleId: values.vehicle.id,
          ...(!isEdit && { driverExpenseRate: values.vehicle.type?.driverExpenseRate ?? 100 }),
          trips: tripSchedules,
        };
        if (isEdit && onUpdate) {
          await onUpdate(orderSchedule);
        } else if (onCreate) {
          await onCreate(orderSchedule);
        }
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("common.message.save_error_unknown", { name: t("components.order_scheduler_modal.title") }),
        });
      }
      formikHelpers.setSubmitting(false);
      formikHelpers.resetForm();
      onClose();
    },
    [selectedOrders, onClose, isEdit, showNotification, t, orgId, onUpdate, onCreate]
  );

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={orderSchedulerSchema}
      onSubmit={handleSubmitFormik}
    >
      {({ values, errors, touched, isSubmitting, submitForm }) => (
        <Modal open={open} onClose={onClose} size="7xl" showCloseButton allowOverflow>
          <ModalHeader
            title={
              isEdit
                ? t("components.order_scheduler_modal.update_schedule_title", { code: selectedOrderGroup?.code })
                : t("components.order_scheduler_modal.title")
            }
          />
          <ModalContent padding={false} className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden">
            <DescriptionProperty2 label={t("components.order_scheduler_modal.total_weight")} className="px-4 pt-6">
              <div>{totalQuantity || 0}</div>
            </DescriptionProperty2>
            <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ENABLE_CBM_FIELD} expect={true}>
              <DescriptionProperty2 label={t("components.order_scheduler_modal.total_cbm")} className="px-4 pb-4">
                {totalCbm ? round(totalCbm, 2) : t("common.empty")}
              </DescriptionProperty2>
            </VisibleWithSetting>

            <TableContainer variant="paper" inside horizontalScroll>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell className="max-w-[240px]">{t("components.order_scheduler_modal.customer")}</TableCell>
                    <TableCell className="max-w-[240px]">{t("components.order_scheduler_modal.route")}</TableCell>
                    <TableCell>{t("components.order_scheduler_modal.delivery_date")}</TableCell>
                    <TableCell>{t("components.order_scheduler_modal.quantity")}</TableCell>
                    <TableCell className="w-52">{t("components.order_scheduler_modal.pickup_time")}</TableCell>
                    <TableCell className="w-52">{t("components.order_scheduler_modal.delivery_time")}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {selectedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <InfoBox
                          label={order.customer?.name}
                          subLabel={order.customer?.code}
                          emptyLabel={t("common.empty")}
                          nowrap={false}
                        />
                      </TableCell>
                      <TableCell>
                        <InfoBox
                          label={order.route?.name}
                          subLabel={order.route?.code}
                          emptyLabel={t("common.empty")}
                          nowrap={false}
                        />
                      </TableCell>
                      <TableCell>
                        {isEdit ? (
                          <DateTimeLabel
                            value={selectedOrderGroup?.orders?.[0]?.trips?.[0]?.deliveryDate}
                            type="date"
                            emptyLabel={t("common.empty")}
                          />
                        ) : (
                          <DateTimeLabel value={order.deliveryDate} type="date" emptyLabel={t("common.empty")} />
                        )}
                      </TableCell>
                      <TableCell>
                        <NumberLabel value={order.weight} unit={order.unit.code} />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={values.trips.find((trip) => equalId(trip?.id, order.id))?.pickupTimeNotes}
                          onChange={handleNoteChange(order.id, "pickupTimeNotes")}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={values.trips.find((trip) => equalId(trip?.id, order.id))?.deliveryTimeNotes}
                          onChange={handleNoteChange(order.id, "deliveryTimeNotes")}
                        />
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
                  label={t("components.order_scheduler_modal.pickup_date")}
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
                  label={t("components.order_scheduler_modal.delivery_date")}
                  selected={isValidDate(values.deliveryDate) ? parseDate(values.deliveryDate) : undefined}
                  onChange={handleChangeDeliveryDate}
                  errorText={formatError(t, getIn(touched, "deliveryDate") && getIn(errors, "deliveryDate"))}
                />
              </div>
              {!values.vehicle?.id ? (
                <>
                  <div className="flex items-end justify-start sm:col-span-2">
                    <Button variant="outlined" onClick={onPressSelectVehicle}>
                      {t("components.order_scheduler_modal.select_vehicle")}
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
                  <div className="sm:col-span-3">
                    <Combobox
                      placement="top"
                      label={t("components.order_scheduler_modal.vehicle")}
                      items={vehicleOptions}
                      placeholder={t("components.order_scheduler_modal.select_vehicle")}
                      loading={isVehicleOptionsLoading}
                      value={ensureString(values.vehicle?.id)}
                      errorText={formatError(t, getIn(touched, "vehicle.id") && getIn(errors, "vehicle.id"))}
                      onChange={handleVehicleChange}
                    />
                  </div>
                  <div
                    className={cn("flex items-end sm:col-span-1", {
                      "mt-2 items-center":
                        (getIn(touched, "vehicle.id") && getIn(errors, "vehicle.id")) ||
                        (getIn(touched, "driver.id") && getIn(errors, "driver.id")),
                    })}
                  >
                    <Button variant="outlined" onClick={onPressSelectVehicle}>
                      {t("components.order_scheduler_modal.select_vehicle")}
                    </Button>
                  </div>
                  <div className="sm:col-span-3">
                    <Combobox
                      placement="top"
                      label={t("components.order_scheduler_modal.driver")}
                      items={driverOptions}
                      placeholder={t("components.order_scheduler_modal.select_driver")}
                      loading={isDriverOptionsLoading}
                      value={ensureString(values.driver?.id)}
                      errorText={formatError(t, getIn(touched, "driver.id") && getIn(errors, "driver.id"))}
                      onChange={handleDriverChange}
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
                {isEdit
                  ? t("components.order_scheduler_modal.update_schedule")
                  : t("components.order_scheduler_modal.create_schedule")}
              </Button>
            </div>
          </ModalActions>
        </Modal>
      )}
    </Formik>
  );
}
