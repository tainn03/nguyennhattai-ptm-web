"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AddressInformation,
  Authorization,
  Button,
  InputGroup,
  NumberField,
  PageHeader,
  RadioGroup,
  TextField,
} from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { GasStationInputForm, gasStationInputFormSchema } from "@/forms/gasStation";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useGasStationState } from "@/redux/states";
import { createGasStation, getGasStation, updateGasStation } from "@/services/client/gasStation";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { ScreenMode } from "@/types/form";
import { GasStationInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: GasStationInputForm = {
  name: "",
  fuelCapacity: null,
  description: "",
  address: {
    addressLine1: "",
  },
  isActive: true,
};

export type GasStationFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const GasStationForm = ({ orgId, orgLink, userId, screenMode, id, encryptedId }: GasStationFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useGasStationState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const { canEdit, canEditOwn } = usePermission("gas-station");
  const [awaitFetchData, setAwaitFetchData] = useState(true);
  const gasStationRef = useRef<GasStationInfo>();

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const statusOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("gas_station.status_active") },
      { value: "false", label: t("gas_station.status_inactive") },
    ],
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
      { name: t("gas_station.title"), link: `${orgLink}/settings/gas-stations${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/settings/gas-stations/new` });
    }
    if (editMode) {
      payload.push({
        name: gasStationRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/settings/gas-stations/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgLink, gasStationRef.current, searchQueryString]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a gas station form using Formik.
   *
   * @param {GasStationInputForm} values - The form values representing a gas station.
   * @param {FormikHelpers<GasStationInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles gas station creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: GasStationInputForm, formikHelpers: FormikHelpers<GasStationInputForm>) => {
      // Check if it's a new gas station or an update
      let result: ApiResult<number> | undefined;
      if (newMode) {
        result = await createGasStation({
          ...values,
          organizationId: orgId,
          createdById: userId,
        });
      } else {
        if (gasStationRef.current?.id) {
          result = await updateGasStation({
            ...values,
            organizationId: orgId,
            id: Number(gasStationRef.current.id),
            updatedAt: gasStationRef.current.updatedAt,
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
          case ErrorType.EXISTED:
            message = errorExists("gas_station.name");
            formikHelpers.setFieldError("name", message);
            return;
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: values.name });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: values.name });
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
        // Show a success notification and navigate to the gas stations page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });
        setItemString(SESSION_FLASHING_ID, ensureString(result.data), {
          security: false,
        });
        router.push(`${orgLink}/settings/gas-stations${searchQueryString}`);
      }
    },
    [newMode, orgId, orgLink, router, searchQueryString, showNotification, t, userId]
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
    resetForm,
    getFieldMeta,
  } = useFormik({
    initialValues: initialFormValues,
    validationSchema: gasStationInputFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * Fetching gas station data when in edit or copy mode.
   * If the data is found, it sets the gas station initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the gas stations settings page.
   */
  const fetchGasStation = useCallback(async () => {
    if (!id) {
      setAwaitFetchData(false);
      return;
    }
    const result = await getGasStation(orgId, id);
    setAwaitFetchData(false);

    if (result) {
      gasStationRef.current = result;
      resetForm({
        values: { ...result },
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/settings/gas-stations${searchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching gas station data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchGasStation();
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
   * Handle changes to the "isActive" field in a form.
   *
   * @param {RadioItem} item - The selected radio item containing the new value.
   */
  const handleActiveChange = useCallback(
    (item: RadioItem) => setFieldValue("isActive", item.value === "true"),
    [setFieldValue]
  );

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

  return (
    <Authorization
      showAccessDenied
      resource="gas-station"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(gasStationRef.current?.createdByUser?.id, userId)
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("gas_station.title")}
          description={t("gas_station.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />

        <div className="space-y-12">
          <InputGroup title={t("gas_station.general_title")}>
            <div className="sm:col-span-4">
              <TextField
                label={t("gas_station.name")}
                name="name"
                value={values.name}
                required
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
              />
            </div>
            <div className="sm:col-span-2">
              <NumberField
                label={t("gas_station.fuel_capacity_label", { unit: t("gas_station.fuel_capacity_unit") })}
                name="fuelCapacity"
                value={values.fuelCapacity}
                onChange={handleChange}
                errorText={formatError(t, touched.fuelCapacity && errors.fuelCapacity)}
                suffixText={t("gas_station.fuel_capacity_unit").toUpperCase()}
              />
            </div>

            <AddressInformation
              address={values.address}
              setFieldValue={setFieldValue}
              getFieldMeta={getFieldMeta}
              parentName="address"
            />

            <div className="col-span-full">
              <TextField
                label={t("gas_station.description")}
                name="description"
                value={values.description as string}
                multiline
                rows={4}
                maxLength={500}
                showCount
                onChange={handleChange}
                errorText={formatError(t, touched.description && errors.description)}
              />
            </div>

            <div className="col-span-full">
              <RadioGroup
                label={t("gas_station.status")}
                name="status"
                items={statusOptions}
                value={ensureString(values.isActive)}
                onChange={handleActiveChange}
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

export default GasStationForm;
