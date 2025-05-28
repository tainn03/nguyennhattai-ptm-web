"use client";

import { AdvanceAdvanceType, AdvanceStatus, AdvanceType } from "@prisma/client";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Combobox, DatePicker, NumberField, RadioGroup, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { AdvanceOrderTripModal } from "@/components/organisms";
import { AdvanceInputForm } from "@/forms/advance";
import { useDriverOptions, useOrderTripOptions, useSubcontractorOptions } from "@/hooks";
import { ScreenMode } from "@/types/form";
import { DriverInfo, OrderTripInfo, SubcontractorInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

type AdvanceGeneralFormProps = {
  organizationId: number;
  currentStatus?: AdvanceStatus;
  screenMode?: ScreenMode;
};

const AdvanceGeneralForm = ({ organizationId, currentStatus, screenMode }: AdvanceGeneralFormProps) => {
  const t = useTranslations();
  const { values, touched, errors, handleChange, setFieldValue } = useFormikContext<AdvanceInputForm>();

  const [open, setOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<OrderTripInfo | null>(null);
  const [tripList, setTripList] = useState<ComboboxItem[]>([]);

  const { drivers, isLoading: isDriverLoading } = useDriverOptions({ organizationId });
  const { subcontractors, isLoading: isSubcontractorLoading } = useSubcontractorOptions({ organizationId });
  const { orderTrips, isLoading: isOrderTripLoading } = useOrderTripOptions({
    organizationId,
    monthOfTrip: values.monthOfTrip,
  });

  const typeOptions: RadioItem[] = [
    { value: AdvanceType.DRIVER, label: t("advance.driver") },
    { value: AdvanceType.SUBCONTRACTOR, label: t("advance.subcontractor") },
  ];

  const advanceTypeOptions: RadioItem[] = [
    { value: AdvanceAdvanceType.SALARY, label: t("advance.salary") },
    { value: AdvanceAdvanceType.COST, label: t("advance.cost") },
  ];

  useEffect(() => {
    if (!isOrderTripLoading && orderTrips.length > 0) {
      const newTripList: ComboboxItem[] = [];
      orderTrips
        .filter((trip) => !equalId(trip.id, selectedTrip ? selectedTrip.id : values?.orderTripId))
        .map((trip) => {
          newTripList.push({
            value: ensureString(trip.id),
            label: ensureString(trip.code),
            subLabel: trip.order?.customer?.name,
          });
        });
      if (selectedTrip) {
        newTripList.push({ value: ensureString(selectedTrip.id), label: ensureString(selectedTrip.code) });
      } else if (values.orderTripCode) {
        newTripList.push({ value: ensureString(values.orderTripId), label: ensureString(values.orderTripCode) });
      }
      setTripList(newTripList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrderTripLoading, orderTrips, values.orderTripCode, selectedTrip]);

  /**
   * Checks whether the current status is rejected.
   * @returns {boolean} True if the current status is rejected, otherwise false
   */
  const isRejected = useMemo(() => currentStatus === AdvanceStatus.REJECTED, [currentStatus]);

  /**
   * Checks whether the type is driver.
   * @returns {boolean} True if the type is driver, otherwise false
   */
  const isDriver = useMemo(() => values.type === AdvanceType.DRIVER, [values.type]);

  /**
   * Generates options for drivers combobox.
   * Maps drivers data to ComboboxItem format.
   * @returns {ComboboxItem[]} The array of driver options
   */
  const driverOptions: ComboboxItem[] = useMemo(
    () =>
      drivers?.map((item: DriverInfo) => ({
        value: ensureString(item.id),
        label: getFullName(item.firstName, item.lastName),
        subLabel: ensureString(item.vehicle?.vehicleNumber),
      })) || [],
    [drivers]
  );

  /**
   * Generates options for subcontractors combobox.
   * Maps subcontractors data to ComboboxItem format.
   * @returns {ComboboxItem[]} The array of subcontractor options
   */
  const subcontractorOptions: ComboboxItem[] = useMemo(
    () =>
      subcontractors?.map((item: SubcontractorInfo) => ({
        value: ensureString(item.id),
        label: ensureString(item.code),
        subLabel: ensureString(item.name),
      })) || [],
    [subcontractors]
  );

  /**
   * Handles the change of the advance type input.
   * Sets the type field value to the selected item's value.
   * If the selected item is SUBCONTRACTOR, sets the advanceType field value to SALARY.
   * @param {RadioItem} item The selected radio item
   */
  const handleTypeChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("type", item.value);
      if (item.value === AdvanceType.SUBCONTRACTOR) {
        setFieldValue("advanceType", AdvanceAdvanceType.SALARY);
      }
    },
    [setFieldValue]
  );

  /**
   * Handles the change of the order trip input.
   * Sets the orderTripId field value to the selected item.
   * @param item The selected item
   */
  const handleOrderTripChange = useCallback(
    (item: string) => {
      setFieldValue("orderTripId", Number(item));
    },
    [setFieldValue]
  );

  /**
   * Handles the change of the advance type input.
   * Sets the advanceType field value to the selected item's value.
   * @param item The selected radio item
   */
  const handleAdvanceTypeChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("advanceType", item.value);
    },
    [setFieldValue]
  );

  /**
   * Handles the change of the name input.
   * If the advance type is SUBCONTRACTOR, sets the subcontractorId field value to the selected item.
   * Otherwise, sets the driverId field value to the selected item.
   * @param item The selected item
   */
  const handleNameChange = useCallback(
    (item: string) => {
      if (values.type === AdvanceType.SUBCONTRACTOR) {
        setFieldValue("subcontractorId", Number(item));
      } else {
        setFieldValue("driverId", Number(item));
      }
    },
    [setFieldValue, values.type]
  );

  /**
   * Handles the change of the date input.
   * Sets the specified field value to the selected date.
   * @param name The name of the field to update
   */
  const handleDateChange = useCallback(
    (name: string) => (date: Date) => {
      setFieldValue(name, date);
    },
    [setFieldValue]
  );

  /**
   * Handles the toggle of the modal.
   */
  const handleToggleModal = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  /**
   * Handles the selection of the advance order trip.
   * Sets the orderTripId, monthOfTrip, and driverId field values to the selected trip's values.
   * Closes the modal.
   * @param {OrderTripInfo} trip The selected trip
   * @param {Date | null} month The selected month
   * @param {number | null} driverId The selected driver ID
   */
  const handleSelectAdvanceOrderTrip = useCallback(
    (trip: OrderTripInfo, month: Date | null, driverId: number | null) => {
      setSelectedTrip(trip);
      setFieldValue("orderTripId", trip.id);
      setFieldValue("monthOfTrip", month);
      setFieldValue("driverId", driverId);
      handleToggleModal();
    },
    [handleToggleModal, setFieldValue]
  );

  return (
    <>
      <div className="col-span-full">
        <RadioGroup
          label={t("advance.name")}
          name="type"
          items={typeOptions}
          disabled={isRejected}
          value={values.type}
          onChange={handleTypeChange}
        />
      </div>
      <div className="sm:col-span-4">
        <Combobox
          label={isDriver ? t("advance.driver") : t("advance.subcontractor")}
          items={isDriver ? driverOptions : subcontractorOptions}
          placeholder={isDriver ? t("advance.select_driver") : t("advance.select_subcontractor")}
          loading={isSubcontractorLoading || isDriverLoading}
          required
          disabled={isRejected}
          value={isDriver ? ensureString(values.driverId) : ensureString(values.subcontractorId)}
          onChange={handleNameChange}
          errorText={formatError(
            t,
            isDriver ? touched.driverId && errors.driverId : touched.subcontractorId && errors.subcontractorId
          )}
        />
      </div>
      {isDriver && (
        <div className="col-span-full">
          <RadioGroup
            label={t("advance.advance_type")}
            name="advanceType"
            items={advanceTypeOptions}
            disabled={isRejected}
            value={values.advanceType}
            onChange={handleAdvanceTypeChange}
          />
        </div>
      )}
      {isDriver && values.advanceType === AdvanceAdvanceType.COST && (
        <>
          <div className="sm:col-span-2">
            <Combobox
              label={t("advance.order_trip")}
              placeholder={t("advance.select_order_trip")}
              items={tripList}
              loading={isOrderTripLoading}
              required
              disabled={isRejected}
              value={ensureString(values.orderTripId)}
              onChange={handleOrderTripChange}
              errorText={formatError(t, touched.orderTripId && errors.orderTripId)}
              manageButtonText="Xem thêm"
              onManageButtonClick={handleToggleModal}
            />
          </div>
        </>
      )}
      <div className="sm:col-span-2">
        <NumberField
          label={t("advance.amount")}
          name="amount"
          suffixText={t("advance.currency")}
          required
          disabled={isRejected}
          value={values.amount}
          onChange={handleChange}
          errorText={formatError(t, touched.amount && errors.amount)}
        />
      </div>
      {screenMode === "EDIT" && currentStatus === AdvanceStatus.PAYMENT && (
        <div className="sm:col-span-2 ">
          <DatePicker
            required
            label={t("advance.payment_date")}
            name="paymentDate"
            disabled={isRejected}
            selected={values.paymentDate}
            onChange={handleDateChange("paymentDate")}
            errorText={formatError(t, touched.paymentDate && errors.paymentDate)}
          />
        </div>
      )}
      <div className="col-span-full">
        <TextField
          label={t("advance.advance_note")}
          name="reason"
          multiline
          rows={4}
          maxLength={500}
          showCount
          disabled={isRejected}
          value={ensureString(values.reason)}
          onChange={handleChange}
          errorText={formatError(t, touched.reason && errors.reason)}
        />
      </div>

      <AdvanceOrderTripModal
        driverOptions={driverOptions}
        driverId={values.driverId}
        month={values.monthOfTrip}
        open={open}
        onClose={handleToggleModal}
        onSelected={handleSelectAdvanceOrderTrip}
      />
    </>
  );
};

export default AdvanceGeneralForm;
