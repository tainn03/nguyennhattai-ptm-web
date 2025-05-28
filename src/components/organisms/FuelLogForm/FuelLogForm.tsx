"use client";

import { FuelType } from "@prisma/client";
import { FormikHelpers, getIn, useFormik } from "formik";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Authorization,
  Button,
  Combobox,
  DatePicker,
  InputGroup,
  NumberField,
  PageHeader,
  RadioGroup,
  TextField,
  UploadInput,
} from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { FuelLogInputForm, fuelLogInputFormSchema } from "@/forms/fuelLog";
import {
  useDriverOptions,
  useGasStationOptions,
  useOrgSettingExtendedStorage,
  usePermission,
  useVehicleOptions,
} from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useFuelLogState } from "@/redux/states";
import { createFuelLog, getFuelLog, updateFuelLog } from "@/services/client/fuelLog";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { ScreenMode } from "@/types/form";
import { LocaleType } from "@/types/locale";
import { DriverInfo, FuelLogInfo, GasStationInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { setItemString } from "@/utils/storage";
import { ensureString, getDetailAddress } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: FuelLogInputForm = {
  vehicle: { id: undefined },
  driver: { id: undefined },
  gasStation: { id: undefined },
  date: null,
  liters: null,
  notes: null,
  fuelCost: 0,
  fuelType: FuelType.DIESEL,
  fuelMeterImage: undefined,
  odometerReading: undefined,
  odometerImage: undefined,
  latitude: null,
  longitude: null,
  lastFuelLogImageId: undefined,
  lastOdometerImageId: undefined,
};

export type FuelLogFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const FuelLogForm = ({ orgId, orgLink, userId, screenMode, id, encryptedId }: FuelLogFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useFuelLogState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [fuelLog, setFuelLog] = useState<FuelLogInfo>();
  const [awaitFetchData, setAwaitFetchData] = useState(true);

  const { canEditOwn, canEdit } = usePermission("report-statistics-fuel-log");

  const { drivers } = useDriverOptions({ organizationId: orgId });
  const { vehicles } = useVehicleOptions({ organizationId: orgId });
  const { gasStations } = useGasStationOptions({ organizationId: orgId });
  const locale = useLocale();

  const { useFuelCostManagement } = useOrgSettingExtendedStorage();

  const driverOptions: ComboboxItem[] = useMemo(
    () =>
      drivers.map((item: DriverInfo) => ({
        value: ensureString(item.id),
        label: getFullName(item.firstName, item.lastName),
        subLabel: ensureString(item.vehicle?.vehicleNumber),
      })),
    [drivers]
  );

  const vehicleOptions: ComboboxItem[] = useMemo(
    () =>
      vehicles.map((item: VehicleInfo) => ({
        value: ensureString(item.id),
        label: getFullName(item.vehicleNumber),
      })),
    [vehicles]
  );

  const gasStationOptions: ComboboxItem[] = useMemo(
    () =>
      gasStations.map((item: GasStationInfo) => ({
        value: ensureString(item.id),
        label: item.name,
        subLabel: getDetailAddress(item.address),
      })),
    [gasStations]
  );

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const fuelLogTypeOptions: RadioItem[] = useMemo(
    () => [
      { value: FuelType.GASOLINE, label: t("report.fuel_log.type.gasoline") },
      { value: FuelType.DIESEL, label: t("report.fuel_log.type.diesel") },
    ],
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("report.feature"), link: `${orgLink}/dashboard` },
      { name: t("report.fuel_log.title"), link: `${orgLink}/reports/fuel-logs${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/reports/fuel-logs/new` });
    }
    if (editMode) {
      payload.push({
        name: fuelLog?.vehicle?.vehicleNumber || ensureString(encryptedId),
        link: `${orgLink}/reports/fuel-logs/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgLink, searchQueryString, fuelLog?.vehicle.vehicleNumber]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a fuel log form using Formik.
   *
   * @param {FuelLogInputForm} values - The form values representing a fuel log.
   * @param {FormikHelpers<FuelLogInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles fuel log creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: FuelLogInputForm, formikHelpers: FormikHelpers<FuelLogInputForm>) => {
      // Check if it's a new fuel log or an update
      let result: ApiResult<number> | undefined;
      if (newMode) {
        result = await createFuelLog(
          {
            ...values,
            organizationId: orgId,
            createdById: userId,
          },
          locale as LocaleType
        );
      } else {
        if (fuelLog?.id) {
          result = await updateFuelLog({
            ...values,
            organizationId: orgId,
            id: Number(fuelLog.id),
            updatedAt: fuelLog.updatedAt,
            updatedById: userId,
          });
        }
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.status !== HttpStatusCode.Ok) {
        // Handle different error types
        let message = "";
        switch (result.code) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: t("report.fuel_log.info") });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: t("report.fuel_log.info") });
            break;
          default:
            break;
        }

        // Show an error notification
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message,
        });
      } else {
        // Show a success notification and navigate to the fuel logs page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: t("report.fuel_log.info") }),
        });
        setItemString(SESSION_FLASHING_ID, ensureString(result.data), {
          security: false,
        });
        router.push(`${orgLink}/reports/fuel-logs${searchQueryString}`);
      }
    },
    [
      fuelLog?.id,
      fuelLog?.updatedAt,
      locale,
      newMode,
      orgId,
      orgLink,
      router,
      searchQueryString,
      showNotification,
      t,
      userId,
    ]
  );

  const {
    values,
    touched,
    errors,
    dirty,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldValue,
    setValues,
    resetForm,
  } = useFormik({
    initialValues: initialFormValues,
    validationSchema: fuelLogInputFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * Fetching fuel log data when in edit or copy mode.
   * If the data is found, it sets the fuel log initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the fuel logs settings page.
   */
  const fetchFuelLog = useCallback(async () => {
    if (!id) {
      setAwaitFetchData(false);
      return;
    }

    const result = await getFuelLog(orgId, id);
    setAwaitFetchData(false);
    if (result) {
      setFuelLog(result);

      resetForm({
        values: {
          ...result,
          oldDate: result.date,
          ...(copyMode && { fuelMeterImage: undefined, odometerImage: undefined }),
          ...(editMode && {
            lastFuelLogImageId: Number(result.fuelMeterImage?.id),
            lastOdometerImageId: Number(result.odometerImage?.id),
          }),
        },
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/reports/fuel-logs${searchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching fuel log data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchFuelLog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Show confirmation to the user before leaving the page if there are unsaved changes.
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = t("common.cancel_message");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  /**
   * Handle the cancel button click event. If there are unsaved changes (dirty),
   * it opens a confirmation dialog. Otherwise, it navigates back to the previous page.
   */
  const handleCancelClick = useCallback(() => {
    if (dirty) {
      setIsCancelConfirmOpen(true);
    } else {
      router.back();
    }
  }, [dirty, router]);

  /**
   * Handle the cancellation of confirmation dialog.
   */
  const handleCancel = useCallback(() => {
    setIsCancelConfirmOpen(false);
  }, []);

  /**
   * This function handles the change event for the select fields.
   * @param {string} name - The name of the select field.
   * @returns {function} - A function that takes the selected value and updates the form values.
   */
  const handleSelectChange = useCallback(
    (name: string) => (value: string) => {
      const data = value ? Number(value) : undefined;
      let driverId: number | undefined;
      let vehicleId: number | undefined;
      let fuelType: FuelType = FuelType.DIESEL;

      if (value) {
        if (name === "vehicle.id") {
          const vehicle = vehicles.find((item) => equalId(value, item.id));

          // Auto select fuel type by fuel type of vehicle
          if (vehicle?.fuelType === FuelType.GASOLINE) {
            fuelType = FuelType.GASOLINE;
          }

          // Auto select driver by driver of vehicle
          if (vehicle?.driver?.id && !values.driver?.id) {
            driverId = Number(vehicle.driver.id);
          }
        } else if (name === "driver.id") {
          const driver = drivers.find((item) => equalId(value, item.id));

          // Auto select vehicle by vehicle of driver
          if (driver?.vehicle?.id && !values.vehicle?.id) {
            vehicleId = Number(driver.vehicle.id);

            const vehicle = vehicles.find((item) => equalId(vehicleId, item.id));
            // Auto select fuel type by fuel type of vehicle
            if (vehicle?.fuelType === FuelType.GASOLINE) {
              fuelType = FuelType.GASOLINE;
            }
          }
        }
      }
      setValues({
        ...values,
        ...(name === "driver.id" && { driver: { id: data } }),
        ...(name === "vehicle.id" && { vehicle: { id: data } }),
        ...(name === "gasStation.id" && { gasStation: { id: data } }),
        ...(driverId && { driver: { id: driverId } }),
        ...(vehicleId && { vehicle: { id: vehicleId } }),
        fuelType,
      });
    },
    [drivers, setValues, values, vehicles]
  );

  /**
   * This function handles the change event for the fuel type radio buttons.
   * @param {RadioItem} item - The selected radio button item.
   */
  const handleFuelTypeChange = useCallback((item: RadioItem) => setFieldValue("fuelType", item.value), [setFieldValue]);

  /**
   * This component renders the action buttons for the form.
   */
  const actionComponent = useMemo(
    () => (
      <div className="flex flex-row justify-end gap-x-4">
        <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    ),
    [handleCancelClick, isSubmitting, t]
  );

  /**
   * This function handles the change event for the file input fields.
   * @param {string} name - The name of the file input field.
   * @returns {function} - A function that takes the selected file and updates the file field value.
   */
  const handleFileChange = useCallback(
    (name: string) => (file?: UploadInputValue) => {
      setFieldValue(name, file);
    },
    [setFieldValue]
  );

  /**
   * This function handles the change event for the date picker.
   * @returns {function} - A function that takes the selected date and updates the 'date' field value.
   */
  const handleDateChange = useCallback(
    (date: Date) => {
      setFieldValue("date", date);
    },
    [setFieldValue]
  );

  return (
    <Authorization
      showAccessDenied
      resource="report-statistics-fuel-log"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData && editMode && !canEdit() && canEditOwn() && !equalId(fuelLog?.createdByUser?.id, userId)
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("report.fuel_log.title")}
          description={t("report.fuel_log.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />

        <div className="space-y-12">
          <InputGroup title={t("report.fuel_log.general_title")}>
            <div className="sm:col-span-3">
              <Combobox
                label={t("report.fuel_log.driver")}
                placeholder={t("report.fuel_log.driver_placeholder")}
                value={ensureString(values.driver?.id)}
                onChange={handleSelectChange("driver.id")}
                items={driverOptions}
                emptyLabel={t("report.fuel_log.driver_placeholder")}
                required
                errorText={formatError(t, getIn(touched, "driver.id") && getIn(errors, "driver.id"))}
              />
            </div>
            <div className="sm:col-span-3">
              <Combobox
                label={t("report.fuel_log.vehicle")}
                placeholder={t("report.fuel_log.vehicle_placeholder")}
                value={ensureString(values.vehicle?.id)}
                onChange={handleSelectChange("vehicle.id")}
                items={vehicleOptions}
                emptyLabel={t("report.fuel_log.vehicle_placeholder")}
                required
                errorText={formatError(t, getIn(touched, "vehicle.id") && getIn(errors, "vehicle.id"))}
              />
            </div>
            <div className="sm:col-span-4">
              <Combobox
                label={t("report.fuel_log.gas_station")}
                placeholder={t("report.fuel_log.gas_station_placeholder")}
                value={ensureString(values.gasStation?.id)}
                onChange={handleSelectChange("gasStation.id")}
                items={gasStationOptions}
                emptyLabel={t("report.fuel_log.gas_station_placeholder")}
                required
                errorText={formatError(t, getIn(touched, "gasStation.id") && getIn(errors, "gasStation.id"))}
                hideSelectedSubLabel
              />
            </div>
            <div className="sm:col-span-2">
              <DatePicker
                label={t("report.fuel_log.date")}
                name="date"
                placeholder="DD/MM/YYYY"
                selected={values.date ? new Date(values.date) : new Date()}
                onChange={handleDateChange}
                maxDate={new Date()}
                required
              />
            </div>
            <div className="col-span-full">
              <TextField
                label={t("report.fuel_log.notes")}
                name="notes"
                value={ensureString(values.notes)}
                multiline
                rows={4}
                maxLength={500}
                showCount
                onChange={handleChange}
                errorText={formatError(t, touched.notes && errors.notes)}
              />
            </div>
          </InputGroup>

          <InputGroup title={t("report.fuel_log.detail_title")}>
            <div className="sm:col-span-2">
              <NumberField
                label={t("report.fuel_log.liters")}
                name="liters"
                value={values.liters}
                onChange={handleChange}
                errorText={formatError(t, touched.liters && errors.liters)}
                suffixText={t("report.fuel_log.liters").toUpperCase()}
                required
              />
            </div>
            <div className="sm:col-span-4">
              <RadioGroup
                label={t("report.fuel_log.fuel_type")}
                name="fuelType"
                items={fuelLogTypeOptions}
                value={ensureString(values.fuelType)}
                onChange={handleFuelTypeChange}
              />
            </div>
            {useFuelCostManagement && (
              <div className="sm:col-span-3">
                <NumberField
                  label={t("report.fuel_log.fuel_cost")}
                  name="fuelCost"
                  suffixText={t("advance.currency")}
                  value={values.fuelCost}
                  onChange={handleChange}
                  errorText={formatError(t, touched.fuelCost && errors.fuelCost)}
                />
              </div>
            )}

            <div className="col-span-full">
              <UploadInput
                value={
                  !values?.fuelMeterImage
                    ? undefined
                    : {
                        name: values?.fuelMeterImage?.name ?? "",
                        url: values?.fuelMeterImage?.url ?? "",
                      }
                }
                label={t("report.fuel_log.fuel_meter_image")}
                type="FUEL_METER"
                name="fuelMeterImage"
                onChange={handleFileChange("fuelMeterImage")}
              />
            </div>

            <div className="sm:col-span-2">
              <NumberField
                label={t("report.fuel_log.odometer")}
                name="odometerReading"
                value={values.odometerReading}
                onChange={handleChange}
                errorText={formatError(t, touched.odometerReading && errors.odometerReading)}
                suffixText={t("report.fuel_log.odometer_unit").toUpperCase()}
                required
              />
            </div>
            <div className="col-span-full">
              <UploadInput
                value={
                  !values?.odometerImage
                    ? undefined
                    : {
                        name: values?.odometerImage?.name ?? "",
                        url: values?.odometerImage?.url ?? "",
                      }
                }
                label={t("report.fuel_log.odometer_image")}
                type="ODOMETER"
                name="odometerImage"
                onChange={handleFileChange("odometerImage")}
              />
            </div>
          </InputGroup>
        </div>

        <div className="mt-4 max-sm:px-4">{actionComponent}</div>
      </form>

      {/* Cancel confirmation dialog */}
      <ConfirmModal
        open={isCancelConfirmOpen}
        icon="question"
        title={t("common.confirmation.cancel_title")}
        message={t("common.confirmation.cancel_message")}
        onClose={handleCancel}
        onCancel={handleCancel}
        onConfirm={goBack}
      />
    </Authorization>
  );
};

export default FuelLogForm;
