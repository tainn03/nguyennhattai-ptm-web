"use client";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { CustomFieldType, UnitOfMeasureType } from "@prisma/client";
import { HttpStatusCode } from "axios";
import clsx from "clsx";
import { Formik, FormikHelpers, FormikProps, getIn } from "formik";
import { useTranslations } from "next-intl";
import numeral from "numeral";
import React, { ChangeEvent, MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { BsBoxSeam as BsBoxSeamIcon } from "react-icons/bs";
import { mutate } from "swr";
import * as yup from "yup";

import {
  Checkbox,
  DescriptionProperty2,
  Link,
  ModalActions,
  ModalContent,
  ModalHeader,
  NumberLabel,
} from "@/components/atoms";
import { Alert, Button, Combobox, DatePicker, Modal, NumberField, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { CustomField, NewDriverModal, RecentOrderTripNoteModal } from "@/components/organisms";
import { DateTimeDisplayType } from "@/constants/organizationSettingExtended";
import { orderTripFormSchema, OrderTripInputForm } from "@/forms/orderTrip";
import { useAuth, useDriverOptions, useOrgSettingExtendedStorage, useVehicleOptions } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { createOrderTrip, updateOrderTrip } from "@/services/client/orderTrip";
import { ErrorType, YubObjectSchema } from "@/types";
import { ApiResult } from "@/types/api";
import { CustomFieldMetaType, Meta } from "@/types/customField";
import { CustomFieldInfo, DriverInfo, OrderTripInfo, VehicleInfo } from "@/types/strapi";
import { getAccountInfo, getFullName } from "@/utils/auth";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { isValidDate, parseDate } from "@/utils/date";
import { getGeneralDispatchVehicleInfo, getOrderTripStatusFlags } from "@/utils/order";
import { ensureString } from "@/utils/string";
import { cn } from "@/utils/twcn";
import { formatError } from "@/utils/yup";

import { RouteDriverExpenseDetailModal } from ".";

const initialFormValues: OrderTripInputForm = {
  vehicle: {
    id: 0,
  },
  driver: {
    id: 0,
  },
  order: {
    id: 0,
  },
  weight: null,
  remainingWeight: null,
  pickupDate: null,
  deliveryDate: null,
  driverCost: null,
  subcontractorCost: null,
  bridgeToll: null,
  otherCost: null,
  isUseRouteDriverExpenses: true,
  notes: "",
  numberTripDelivery: 1,
  driverExpenseRate: 0,
};

type DispatchVehicleModalProps = {
  open: boolean;
  vehicle?: Partial<VehicleInfo>;
  editedTrip?: Partial<OrderTripInfo>;
  onConfirm?: (isMaxPayloadReached: boolean) => void;
  onClose?: () => void;
};

const DispatchVehicleModal = ({ open, vehicle, editedTrip, onConfirm, onClose }: DispatchVehicleModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink, user } = useAuth();
  const { order } = useOrderState();
  const { showNotification } = useNotification();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();
  const [isExceedPayload, setIsExceedPayload] = useState(false);
  const [isRouteDriverExpenseOpen, setIsRouteDriverExpenseOpen] = useState(false);
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
  const [isRecentOrderTripNoteModalOpen, setIsRecentOrderTripNoteModalOpen] = useState(false);
  const [validationSchema, setValidationSchema] = useState<YubObjectSchema<OrderTripInputForm>>(orderTripFormSchema);
  const [customFields, setCustomFields] = useState<CustomFieldInfo[]>([]);

  const orderTripRef = useRef<OrderTripInputForm>();
  const formikRef = useRef<FormikProps<OrderTripInputForm>>(null);

  const { drivers, isLoading: isDriversLoading, mutate: mutateDriver } = useDriverOptions({ organizationId: orgId });
  const { vehicles, isLoading: isVehiclesLoading } = useVehicleOptions({
    organizationId: editedTrip?.id ? orgId : undefined,
  });
  const { isCompleted, isDelivered } = useMemo(() => getOrderTripStatusFlags(editedTrip), [editedTrip]);
  const dispatchInfo = useMemo(() => getGeneralDispatchVehicleInfo(order), [order]);
  const [orderCode, orderId, trips] = useMemo(
    () => [ensureString(order?.code), Number(order?.id), order?.trips || []],
    [order]
  );
  const [tonPayloadCapacity, palletCapacity, cubicMeterCapacity] = useMemo(() => {
    const { trailer, tonPayloadCapacity: ton, palletCapacity: pallet, cubicMeterCapacity: cubic } = vehicle || {};
    return [
      trailer?.tonPayloadCapacity || ton,
      trailer?.palletCapacity || pallet,
      trailer?.cubicMeterCapacity || cubic,
    ];
  }, [vehicle]);

  /**
   * The list of driver options for the combobox.
   */
  const driverOptions: ComboboxItem[] = useMemo(
    () =>
      drivers?.map((item: DriverInfo) => ({
        value: ensureString(item.id),
        label: getFullName(item.firstName, item.lastName),
      })) || [],
    [drivers]
  );

  /**
   * The list of vehicle options for the combobox.
   */
  const vehicleOptions: ComboboxItem[] = useMemo(
    () =>
      vehicles.map((item: VehicleInfo) => ({
        value: ensureString(item.id),
        label: item.vehicleNumber,
      })),
    [vehicles]
  );

  /**
   * Toggles the visibility of the new driver modal.
   */
  const handleToggleNewDriverModal = useCallback(() => {
    setIsNewDriverModalOpen((prev) => !prev);
  }, []);

  /**
   * Handles the submit event of the form.
   * @param {OrderTripInputForm} values - The form values.
   * @param {FormikHelpers<OrderTripInputForm>} formikHelpers - The formik helpers.
   * @returns {Promise<void>} - A promise that resolves when the submit is complete.
   */
  const handleSubmitFormik = useCallback(
    async (values: OrderTripInputForm, formikHelpers: FormikHelpers<OrderTripInputForm>) => {
      let result: ApiResult<OrderTripInfo> | undefined;
      if (editedTrip?.id) {
        const { weight, pickupDate, deliveryDate, notes, vehicle, driver, meta, ...rest } =
          processingCustomField<OrderTripInputForm>(customFields as CustomFieldInfo[], values);

        result = await updateOrderTrip(orgLink, ensureString(order?.code), {
          id: Number(editedTrip.id),
          code: editedTrip?.code,
          weight,
          pickupDate,
          deliveryDate,
          vehicle: { id: Number(vehicle?.id) },
          driver: { id: Number(driver?.id) },
          notes,
          lastUpdatedAt: editedTrip?.updatedAt,
          driverCost: rest.driverCost ?? null,
          subcontractorCost: rest.subcontractorCost ?? null,
          bridgeToll: rest.bridgeToll ?? null,
          otherCost: rest.otherCost ?? null,
          meta,
        });
      } else {
        result = await createOrderTrip(orgLink, {
          ...processingCustomField<OrderTripInputForm>(customFields as CustomFieldInfo[], values),
          driverExpenseRate: vehicle?.type?.driverExpenseRate || 100,
          order: {
            id: Number(orderId),
            code: orderCode,
            route: { id: order?.route?.id },
          },
          vehicle: { id: Number(vehicle?.id) },
          driver: { id: Number(values?.driver?.id) },
          ...(trips?.length && { orderTripCount: trips.length }),
          fullName: getAccountInfo(user).displayName,
        });
      }

      formikHelpers.setSubmitting(false);
      formikHelpers.resetForm({ values: initialFormValues });
      setIsExceedPayload(false);
      if (!result) {
        return;
      }

      const resultCode = ensureString(result.data);
      if (result.status !== HttpStatusCode.Ok) {
        let message = "";
        switch (result.message) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: resultCode });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: resultCode });
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
          message: t("common.message.save_success_message", { name: resultCode }),
        });
      }
      mutate([`order-dispatch-vehicle-info/${orderCode}`, { organizationId: orgId, code: orderCode }]);
      mutate(["orders-statuses", { organizationId: orgId, code: orderCode }]);
      onConfirm && onConfirm((values.weight ?? 0) * (values.numberTripDelivery ?? 1) >= dispatchInfo.remainingWeight);
    },
    [
      editedTrip?.id,
      editedTrip?.code,
      editedTrip?.updatedAt,
      orderCode,
      orgId,
      onConfirm,
      dispatchInfo.remainingWeight,
      orgLink,
      order?.code,
      order?.route?.id,
      customFields,
      vehicle?.type?.driverExpenseRate,
      vehicle?.id,
      orderId,
      trips.length,
      user,
      showNotification,
      t,
    ]
  );

  /**
   * Updates the value of a field in a form with a specified name to a new driver value.
   * @param {string} value - The new driver value to be set for the field.
   */
  const handleDriverChange = useCallback((value: string) => {
    formikRef.current?.setFieldValue("driver", { id: value ? Number(value) : null });
  }, []);

  /**
   * Updates the value of a field in a form with a specified name to a new vehicle value.
   * @param {string} value - The new vehicle value to be set for the field.
   */
  const handleVehicleChange = useCallback((value: string) => {
    formikRef.current?.setFieldValue("vehicle", { id: Number(value) });
  }, []);

  /**
   * Updates the value of a field in a form with a specified name to a new date value.
   * @param {string} name - The name of the field in the form.
   * @param {Date} value - The new date value to be set for the field.
   */
  const handleDateChange = useCallback(
    (name: string) => (value: Date) => {
      formikRef.current?.setFieldValue(name, value);
    },
    []
  );

  /**
   * Closes the form, resets values, and triggers the onClose callback.
   */
  const handleClose = useCallback(() => {
    onClose && onClose();
    setTimeout(() => {
      formikRef.current?.resetForm({ values: initialFormValues });
      setIsExceedPayload(false);
    }, 300);
  }, [onClose]);

  /**
   * Handles the change event of the weight field.
   * @param {ChangeEvent<HTMLInputElement>} event - The change event.
   */
  const handleWeightChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const name = event.target.name;
      const value = numeral(event.target.value).value() as number;

      switch (dispatchInfo.unitType) {
        case UnitOfMeasureType.TON:
          setIsExceedPayload(!!tonPayloadCapacity && value > tonPayloadCapacity);
          break;
        case UnitOfMeasureType.KILOGRAM:
          setIsExceedPayload(!!tonPayloadCapacity && value > tonPayloadCapacity * 1000);
          break;
        case UnitOfMeasureType.PALLET:
          setIsExceedPayload(!!palletCapacity && value > palletCapacity);
          break;
        case UnitOfMeasureType.CUBIC_METER:
          setIsExceedPayload(!!cubicMeterCapacity && value > cubicMeterCapacity);
          break;
        default:
          break;
      }

      formikRef.current?.setFieldValue(name, numeral(event.target.value).value());
    },
    [cubicMeterCapacity, dispatchInfo.unitType, palletCapacity, tonPayloadCapacity]
  );

  /**
   * This function is used to handle the action of opening the driver expense detail.
   */
  const handleOpenRouteDriverExpense = useCallback(() => {
    setIsRouteDriverExpenseOpen(true);
  }, []);

  /**
   * This function is used to handle the action of closing the driver expense detail.
   */
  const handleCloseRouteDriverExpense = useCallback(() => {
    setIsRouteDriverExpenseOpen(false);
  }, []);

  /**
   * Handles the submission of the new driver modal form.
   * Closes the modal, triggers data mutation, and updates the form field with the selected driver's ID.
   *
   * @param {number} id - The ID of the selected driver.
   */
  const handleNewDriverModalSubmit = useCallback(
    (id: number) => {
      mutateDriver();
      setIsNewDriverModalOpen(false);
      formikRef.current?.setFieldValue("driver", { id });
    },
    [mutateDriver]
  );

  /**
   * Handle open recent order note modal
   * @param {MouseEvent<HTMLAnchorElement>} event - The mouse event of the anchor element
   */
  const handleOpenRecentOrderTripNoteModal = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (formikRef.current?.isSubmitting) {
      return;
    }
    setIsRecentOrderTripNoteModalOpen(true);
  }, []);

  /**
   * Handle close recent order note modal
   */
  const handleCloseRecentOrderTripNoteModal = useCallback(() => {
    setIsRecentOrderTripNoteModalOpen(false);
  }, []);

  /**
   * Handle select recent order note
   * @param {string | null} note - The note of the recent order
   */
  const handleSelectRecentOrderTripNote = useCallback((note: string | null) => {
    formikRef.current?.setFieldValue("notes", note);
  }, []);

  /**
   * Callback function to handle the loading of custom fields.
   *
   * @param schema - The YubObjectSchema of the order trip input form.
   * @param customFields - An array of custom field information.
   */
  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<OrderTripInputForm>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }).concat(orderTripFormSchema));
      orderTripRef.current = { ...orderTripRef.current, customFields };
      setCustomFields(customFields);
    },
    []
  );

  const initialValues = useMemo(() => {
    let availableWeight = 0;
    let driverId = vehicle?.driver?.id;
    let customFieldMeta: Meta;
    let customFieldMetaFileList: CustomFieldMetaType[];
    if (!editedTrip?.id) {
      const result = generateCustomFieldMeta(customFields as CustomFieldInfo[], null);
      customFieldMeta = result[0];
      customFieldMetaFileList = result[1];
      orderTripRef.current = { ...orderTripRef.current, ...customFieldMeta };

      // Get the available weight based on the unit type.
      switch (dispatchInfo.unitType) {
        case UnitOfMeasureType.TON:
          availableWeight = tonPayloadCapacity || 0;
          break;
        case UnitOfMeasureType.KILOGRAM:
          availableWeight = (tonPayloadCapacity || 0) * 1000;
          break;
        case UnitOfMeasureType.PALLET:
          availableWeight = palletCapacity || 0;
          break;
        case UnitOfMeasureType.CUBIC_METER:
          availableWeight = cubicMeterCapacity || 0;
          break;
        default:
          break;
      }

      if (!driverId) {
        const driverOwnedBySubcontractor = drivers.filter((driver) => driver.isOwnedBySubcontractor)?.pop();
        if (driverOwnedBySubcontractor?.id) {
          driverId = driverOwnedBySubcontractor.id;
        }
      }

      // If the remaining weight is less than the available weight, set the available weight to the remaining weight.
      if (dispatchInfo.remainingWeight < availableWeight) {
        availableWeight = dispatchInfo.remainingWeight;
      }
    } else {
      const result = generateCustomFieldMeta(orderTripRef.current?.customFields as CustomFieldInfo[], editedTrip.meta);
      customFieldMeta = result[0];
      customFieldMetaFileList = result[1];
      orderTripRef.current = { ...orderTripRef.current, ...editedTrip, ...customFieldMeta };
    }

    return {
      ...initialFormValues,
      ...(!editedTrip?.id
        ? {
            ...(availableWeight > 0 && { weight: availableWeight }),
            pickupDate: new Date(ensureString(order?.orderDate)),
            deliveryDate: order?.deliveryDate
              ? new Date(ensureString(order?.deliveryDate))
              : new Date(ensureString(order?.orderDate)),
            driver: { id: driverId },
            remainingWeight: dispatchInfo.remainingWeight,
          }
        : {
            ...editedTrip,
            remainingWeight: dispatchInfo.remainingWeight + (editedTrip?.weight || 0),
          }),
      ...customFieldMeta,
      prevCustomFields: customFieldMetaFileList,
    };
  }, [
    cubicMeterCapacity,
    customFields,
    dispatchInfo.remainingWeight,
    dispatchInfo.unitType,
    drivers,
    editedTrip,
    order?.deliveryDate,
    order?.orderDate,
    palletCapacity,
    tonPayloadCapacity,
    vehicle?.driver?.id,
  ]);

  return (
    <>
      <Modal open={open} size="4xl" showCloseButton onClose={handleClose} allowOverflow>
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={handleSubmitFormik}
        >
          {({ isSubmitting, values, touched, errors, handleChange, handleSubmit }) => (
            <form onSubmit={handleSubmit}>
              <ModalHeader title={t("order.vehicle_dispatch_modal.title")} />
              <ModalContent className="divide-y divide-gray-200 ">
                {/* Order Info */}
                <div className="grid grid-cols-1 gap-x-3 pb-3 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <DescriptionProperty2 label={t("order.vehicle_dispatch_modal.amount")}>
                      <NumberLabel value={dispatchInfo.weight} unit={dispatchInfo.unitCode} emptyLabel="0" />
                    </DescriptionProperty2>
                  </div>
                  <div className="sm:col-span-2">
                    <DescriptionProperty2 label={t("order.vehicle_dispatch_modal.total_trip_weight")}>
                      <NumberLabel
                        value={dispatchInfo.totalTripWeight - (editedTrip?.weight ?? 0)}
                        unit={dispatchInfo.unitCode}
                        emptyLabel="0"
                      />
                    </DescriptionProperty2>
                  </div>
                  <div className="sm:col-span-2">
                    <DescriptionProperty2 label={t("order.vehicle_dispatch_modal.remainingWeight")}>
                      <NumberLabel
                        value={dispatchInfo.remainingWeight + (editedTrip?.weight || 0)}
                        emptyLabel="0"
                        unit={dispatchInfo.unitCode}
                      />
                    </DescriptionProperty2>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="grid grid-cols-1 gap-x-3 py-3 md:grid-cols-6">
                  {editedTrip?.id ? (
                    <>
                      <div className="pb-3 md:col-span-2">
                        <Combobox
                          label={t("order.vehicle_dispatch_modal.vehicle")}
                          items={vehicleOptions}
                          placeholder={t("order.vehicle_dispatch_modal.vehicle_placeholder")}
                          loading={isVehiclesLoading}
                          required={true}
                          value={ensureString(values.vehicle?.id)}
                          onChange={handleVehicleChange}
                          disabled={isCompleted || isDelivered || isSubmitting}
                        />
                      </div>
                      <div className="pb-3 md:col-span-2">
                        <Combobox
                          label={t("order.vehicle_dispatch_modal.driver")}
                          items={driverOptions}
                          placeholder={t("order.vehicle_dispatch_modal.driver_placeholder")}
                          loading={isDriversLoading}
                          required={true}
                          value={ensureString(values.driver?.id)}
                          onChange={handleDriverChange}
                          disabled={isCompleted || isDelivered || isSubmitting}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="md:col-span-3">
                        <DescriptionProperty2 label={t("order.vehicle_dispatch_modal.vehicle_number")}>
                          {vehicle?.vehicleNumber}
                        </DescriptionProperty2>
                        <Combobox
                          required
                          placeholder={t("order.vehicle_dispatch_modal.driver_placeholder")}
                          label={t("order.vehicle_dispatch_modal.driver")}
                          items={driverOptions}
                          loading={isDriversLoading}
                          value={ensureString(values.driver?.id)}
                          onChange={handleDriverChange}
                          disabled={isCompleted || isDelivered || isSubmitting}
                          newButtonText={t("vehicle.new_driver")}
                          emptyLabel={t("vehicle.none_select_label_driver")}
                          onNewButtonClick={handleToggleNewDriverModal}
                          errorText={formatError(t, getIn(touched, "driver.id") && getIn(errors, "driver.id"))}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <DescriptionProperty2 label={t("order.vehicle_dispatch_modal.vehicle_type")}>
                          {vehicle?.type?.name}
                        </DescriptionProperty2>
                        <DescriptionProperty2 label={t("order.vehicle_dispatch_modal.vehicle_size")}>
                          {vehicle?.maxLength || vehicle?.maxWidth || vehicle?.maxHeight ? (
                            <span className="inline-flex flex-row [&>span::after]:mx-1 [&>span::after]:content-['x'] [&>span:last-child::after]:content-none">
                              <span>
                                <NumberLabel
                                  value={Number(vehicle?.maxLength)}
                                  emptyLabel="--"
                                  unit={t("common.unit.meter").toLowerCase()}
                                  useSpace={false}
                                />
                              </span>
                              <span>
                                <NumberLabel
                                  value={Number(vehicle?.maxWidth)}
                                  emptyLabel="--"
                                  unit={t("common.unit.meter").toLowerCase()}
                                  useSpace={false}
                                />
                              </span>
                              <span>
                                <NumberLabel
                                  value={Number(vehicle?.maxHeight)}
                                  emptyLabel="--"
                                  unit={t("common.unit.meter").toLowerCase()}
                                  useSpace={false}
                                />
                              </span>
                            </span>
                          ) : (
                            <>-</>
                          )}
                        </DescriptionProperty2>
                        <DescriptionProperty2 label={t("order.vehicle_dispatch_modal.trailer_size")}>
                          {vehicle?.trailer?.maxLength || vehicle?.trailer?.maxWidth || vehicle?.trailer?.maxHeight ? (
                            <>
                              <span className="inline-flex flex-row [&>span::after]:mx-1 [&>span::after]:content-['x'] [&>span:last-child::after]:content-none">
                                <span>
                                  <NumberLabel
                                    value={Number(vehicle?.trailer?.maxLength)}
                                    emptyLabel="--"
                                    unit={t("common.unit.meter").toLowerCase()}
                                    useSpace={false}
                                  />
                                </span>
                                <span>
                                  <NumberLabel
                                    value={Number(vehicle?.trailer?.maxWidth)}
                                    emptyLabel="--"
                                    unit={t("common.unit.meter").toLowerCase()}
                                    useSpace={false}
                                  />
                                </span>
                                <span>
                                  <NumberLabel
                                    value={Number(vehicle?.trailer?.maxHeight)}
                                    emptyLabel="--"
                                    unit={t("common.unit.meter").toLowerCase()}
                                    useSpace={false}
                                  />
                                </span>
                              </span>
                            </>
                          ) : (
                            <>-</>
                          )}
                        </DescriptionProperty2>
                        <DescriptionProperty2 colons label={t("order.vehicle_dispatch_modal.capacity")}>
                          {tonPayloadCapacity || palletCapacity || cubicMeterCapacity ? (
                            <span className="inline-flex flex-row gap-x-1 [&>span::after]:content-[','] [&>span:last-child::after]:content-none">
                              {tonPayloadCapacity && (
                                <span>
                                  <NumberLabel value={tonPayloadCapacity} unit={t("common.unit.ton").toLowerCase()} />
                                </span>
                              )}
                              {palletCapacity && (
                                <span>
                                  <NumberLabel value={palletCapacity} unit={t("common.unit.pallet").toLowerCase()} />
                                </span>
                              )}
                              {cubicMeterCapacity && (
                                <span>
                                  <NumberLabel
                                    value={cubicMeterCapacity}
                                    unit={t("common.unit.cubic_meter").toLowerCase()}
                                  />
                                </span>
                              )}
                            </span>
                          ) : (
                            <>-</>
                          )}
                        </DescriptionProperty2>
                      </div>
                    </>
                  )}
                </div>

                {/* Warning exceed payload */}
                <div
                  className={cn("grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-12", {
                    "pt-3": customFields.length === 0,
                    "pb-6 pt-3": customFields.length > 0,
                  })}
                >
                  {isExceedPayload && (
                    <div className="col-span-full">
                      <Alert color="warning" title={t("order.vehicle_dispatch_modal.exceed_payload_title")} />
                    </div>
                  )}

                  {/* Dispatch Info */}
                  <div
                    className={clsx({
                      "sm:col-span-3": !editedTrip?.id,
                      "sm:col-span-4": editedTrip?.id && editedTrip?.id > 0,
                    })}
                  >
                    <NumberField
                      label={t("order.vehicle_dispatch_modal.weight")}
                      required
                      name="weight"
                      id="weight"
                      onChange={handleWeightChange}
                      value={values.weight}
                      suffixText={dispatchInfo.unitCode.toUpperCase()}
                      errorText={formatError(t, touched.weight && errors.weight)}
                      disabled={isCompleted || isDelivered || isSubmitting}
                    />
                  </div>

                  {!editedTrip?.id && (
                    <div
                      className={clsx({
                        "sm:col-span-3": !editedTrip?.id,
                        "sm:col-span-4": editedTrip?.id && editedTrip?.id > 0,
                      })}
                    >
                      <NumberField
                        label={t("order.vehicle_dispatch_modal.number_trip_delivery")}
                        required
                        name="numberTripDelivery"
                        id="numberTripDelivery"
                        onChange={handleChange}
                        value={values.numberTripDelivery}
                        suffixText={t("order.list_item.dispatch_detail.trip_unit")}
                        errorText={formatError(t, touched.numberTripDelivery && errors.numberTripDelivery)}
                        disabled={isCompleted || isDelivered || isSubmitting}
                      />
                    </div>
                  )}
                  <div
                    className={clsx({
                      "sm:col-span-3": !editedTrip?.id,
                      "sm:col-span-4": editedTrip?.id && editedTrip?.id > 0,
                    })}
                  >
                    <DatePicker
                      required
                      label={t("order.vehicle_dispatch_modal.pickup_date")}
                      name="pickupDate"
                      onChange={handleDateChange("pickupDate")}
                      selected={isValidDate(values.pickupDate) ? parseDate(values.pickupDate) : undefined}
                      errorText={formatError(t, touched.pickupDate && errors.pickupDate)}
                      disabled={isCompleted || isDelivered || isSubmitting}
                      {...(organizationOrderRelatedDateFormat === DateTimeDisplayType.DATETIME_NO_SECOND && {
                        dateFormat: "dd/MM/yyyy HH:mm",
                        mask: "99/99/9999 99:99",
                        showTimeSelect: true,
                      })}
                    />
                  </div>
                  <div
                    className={clsx({
                      "sm:col-span-3": !editedTrip?.id,
                      "sm:col-span-4": editedTrip?.id && editedTrip?.id > 0,
                    })}
                  >
                    <DatePicker
                      required
                      label={t("order.vehicle_dispatch_modal.delivery_date")}
                      name="deliveryDate"
                      onChange={handleDateChange("deliveryDate")}
                      selected={isValidDate(values.deliveryDate) ? parseDate(values.deliveryDate) : undefined}
                      errorText={formatError(t, touched.deliveryDate && errors.deliveryDate)}
                      disabled={isCompleted || isDelivered || isSubmitting}
                      {...(organizationOrderRelatedDateFormat === DateTimeDisplayType.DATETIME_NO_SECOND && {
                        dateFormat: "dd/MM/yyyy HH:mm",
                        mask: "99/99/9999 99:99",
                        showTimeSelect: true,
                      })}
                    />
                  </div>

                  <div className="col-span-full">
                    <TextField
                      label={t("order.vehicle_dispatch_modal.notes")}
                      name="notes"
                      maxLength={255}
                      onChange={handleChange}
                      value={ensureString(ensureString(values.notes))}
                      hintComponent={
                        !isCompleted &&
                        !isDelivered && (
                          <Link
                            useDefaultStyle
                            onClick={handleOpenRecentOrderTripNoteModal}
                            className={cn("mt-2 flex flex-nowrap items-center gap-x-2 self-end", {
                              "cursor-not-allowed opacity-50": isSubmitting,
                            })}
                            href=""
                          >
                            <BsBoxSeamIcon className="h-4 w-4 flex-shrink-0" />
                            {t("order.vehicle_dispatch_modal.copy_note")}
                          </Link>
                        )
                      }
                      multiline
                      errorText={formatError(t, touched.notes && errors.notes)}
                      disabled={isCompleted || isDelivered || isSubmitting}
                    />
                  </div>

                  {!editedTrip?.id && (
                    <div className="col-span-full flex">
                      <Checkbox
                        name="isUseRouteDriverExpenses"
                        label={t("order.vehicle_dispatch_modal.use_route_driver_expenses")}
                        checked={values.isUseRouteDriverExpenses}
                        disabled={isSubmitting}
                        onClick={handleChange}
                      />
                      <div className="inline cursor-pointer space-x-1 pl-2 text-sm text-blue-700 hover:text-blue-500">
                        <InformationCircleIcon className="ml-1 inline h-5 w-5" aria-hidden="true" />
                        <span onClick={handleOpenRouteDriverExpense}>
                          {t("order.vehicle_dispatch.route_driver_expense.view_detail")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className={cn("grid grid-cols-1 gap-3 py-3 sm:grid-cols-6", {
                    "invisible p-0": customFields.length === 0,
                  })}
                >
                  <CustomField
                    title={t("custom_field.input_group_title")}
                    type={CustomFieldType.ORDER_TRIP}
                    onLoaded={handleCustomFieldLoaded}
                  />
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
          )}
        </Formik>
      </Modal>

      {!editedTrip?.id && (
        <RouteDriverExpenseDetailModal
          open={isRouteDriverExpenseOpen}
          route={{ ...order?.route }}
          vehicleType={vehicle?.type}
          onClose={handleCloseRouteDriverExpense}
        />
      )}

      {/* New Driver Modal */}
      <NewDriverModal
        orgId={orgId as number}
        orgLink={orgLink}
        open={isNewDriverModalOpen}
        onClose={handleToggleNewDriverModal}
        onSubmit={handleNewDriverModalSubmit}
      />

      {/* Recent order trip note modal */}
      {isRecentOrderTripNoteModalOpen && (
        <RecentOrderTripNoteModal
          open={isRecentOrderTripNoteModalOpen}
          customerId={order?.customer?.id ?? null}
          onSelect={handleSelectRecentOrderTripNote}
          onClose={handleCloseRecentOrderTripNoteModal}
        />
      )}
    </>
  );
};

export default DispatchVehicleModal;
