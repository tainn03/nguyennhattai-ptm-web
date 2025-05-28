"use client";

import { MaintenanceTypeType } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
} from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal, NewMaintenanceTypeModal, NewTrailerModal, NewVehicleModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { MaintenanceInputForm, maintenanceInputFormSchema } from "@/forms/maintenance";
import {
  useMaintenanceTypeOptions,
  useOrganizationMemberOptions,
  usePermission,
  useTrailerOptions,
  useVehicleOptions,
} from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useMaintenanceState } from "@/redux/states";
import { createMaintenance, getMaintenance, updateMaintenance } from "@/services/client/maintenance";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ScreenMode } from "@/types/form";
import { MutationResult } from "@/types/graphql";
import { LocaleType } from "@/types/locale";
import { MaintenanceInfo, OrganizationMemberInfo, TrailerInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: MaintenanceInputForm = {
  type: MaintenanceTypeType.VEHICLE,
  otherMaintenanceType: "",
  description: "",
  actualCost: null,
  estimateCost: null,
  costBearerId: null,
  repeatDate: null,
  maintenanceDate: null,
  isRepeat: true,
  maintenanceTypeId: undefined,
  vehicleId: undefined,
  trailerId: undefined,
};

export type MaintenanceProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const MaintenanceTypeForm = ({ orgId, orgLink, userId, user, screenMode, id, encryptedId }: MaintenanceProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useMaintenanceState();
  const { canEdit, canEditOwn } = usePermission("maintenance");
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isOpenNewMaintenanceTypeModal, setIsOpenNewMaintenanceTypeModal] = useState(false);
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [isNewTrailerModalOpen, setIsNewTrailerModalOpen] = useState(false);
  const [awaitFetchData, setAwaitFetchData] = useState(true);

  const { canNew: canNewVehicle } = usePermission("vehicle");
  const { canNew: canNewMaintenanceType } = usePermission("maintenance-type");
  const { canNew: canNewTrailer } = usePermission("trailer");

  const maintenanceRef = useRef<MaintenanceInfo>();

  const typeOptions: RadioItem[] = [
    { value: MaintenanceTypeType.VEHICLE, label: t("maintenance.vehicle") },
    { value: MaintenanceTypeType.TRAILER, label: t("maintenance.trailer") },
  ];

  const repeatOptions: RadioItem[] = [
    { value: "true", label: t("maintenance.remind_next_period") },
    { value: "false", label: t("maintenance.no_remind") },
  ];

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    let maintenanceName;
    if (maintenanceRef.current?.type === MaintenanceTypeType.VEHICLE) {
      maintenanceName = maintenanceRef.current?.vehicle.vehicleNumber;
    } else {
      maintenanceName = maintenanceRef.current?.trailer.trailerNumber;
    }
    const payload: BreadcrumbItem[] = [
      { name: t("maintenance.manage"), link: ensureString(orgLink) },
      { name: t("maintenance.title"), link: `${orgLink}/maintenances${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/maintenances/new` });
    }
    if (editMode) {
      payload.push({
        name: maintenanceName || ensureString(encryptedId),
        link: `${orgLink}/maintenances/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maintenanceRef.current, orgLink, searchQueryString]);

  /**
   * Fetching vehicle and trailer options for comboboxes.
   */
  const {
    vehicles,
    isLoading: isVehicleOptionsLoading,
    mutate: mutateVehicle,
  } = useVehicleOptions({ organizationId: orgId });

  /**
   * Fetching trailer options for comboboxes.
   */
  const {
    trailers,
    isLoading: isTrailerOptionsLoading,
    mutate: mutateTrailer,
  } = useTrailerOptions({
    organizationId: orgId,
  });

  /**
   * Creating combobox options for vehicles.
   */
  const vehicleOptions: ComboboxItem[] = useMemo(
    () => vehicles.map((item: VehicleInfo) => ({ value: ensureString(item.id), label: item.vehicleNumber ?? "" })),
    [vehicles]
  );

  /**
   * Creating combobox options for trailers.
   */
  const trailerOptions: ComboboxItem[] = useMemo(
    () => trailers.map((item: TrailerInfo) => ({ value: ensureString(item.id), label: item.trailerNumber ?? "" })),
    [trailers]
  );

  /**
   * Fetching maintenance type options for comboboxes.
   */
  const {
    maintenanceTypes,
    isLoading: isMaintenanceTypeOptionsLoading,
    mutate,
  } = useMaintenanceTypeOptions({ organizationId: orgId });

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a maintenance form using Formik.
   *
   * @param {MaintenanceInputForm} values - The form values representing a maintenance
   * @param {FormikHelpers<MaintenanceInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles maintenance creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: MaintenanceInputForm, formikHelpers: FormikHelpers<MaintenanceInputForm>) => {
      // Check if it's a new maintenance or an update
      let result: MutationResult<MaintenanceInfo> | undefined;

      if (newMode) {
        result = await createMaintenance({
          ...(values as MaintenanceInfo),
          organizationId: orgId,
          vehicleId: Number(values.vehicleId),
          trailerId: Number(values.trailerId),
          maintenanceTypeId: ensureString(values.maintenanceTypeId) !== "other" ? values.maintenanceTypeId : null,
          isOtherType: ensureString(values.maintenanceTypeId) === "other",
          otherMaintenanceType:
            ensureString(values.maintenanceTypeId) === "other" ? ensureString(values.otherMaintenanceType) : "",
          createdById: userId,
        });
      } else {
        if (maintenanceRef.current?.id) {
          result = await updateMaintenance(
            {
              ...(values as MaintenanceInfo),
              id: Number(id),
              organizationId: orgId,
              vehicleId: Number(values.vehicleId),
              trailerId: Number(values.trailerId),
              maintenanceTypeId: ensureString(values.maintenanceTypeId) !== "other" ? values.maintenanceTypeId : null,
              isOtherType: ensureString(values.maintenanceTypeId) === "other",
              otherMaintenanceType:
                ensureString(values.maintenanceTypeId) === "other" ? ensureString(values.otherMaintenanceType) : "",
              updatedById: userId,
            },
            maintenanceRef.current?.updatedAt
          );
        }
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      const currentName =
        values.type === MaintenanceTypeType.VEHICLE
          ? vehicleOptions.find((e) => {
              return ensureString(e.value) === ensureString(values?.vehicleId);
            })?.label
          : trailerOptions.find((e) => {
              return ensureString(e.value) === ensureString(values?.trailerId);
            })?.label;

      if (result.error) {
        // Handle different error types
        let message = "";
        switch (result.error) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: currentName });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: currentName });
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
        // Show a success notification and navigate to the maintenance  page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("maintenance.save_success_message", { license_plates: currentName }),
        });
        setItemString(SESSION_FLASHING_ID, ensureString(result.data?.id), {
          security: false,
        });
        router.push(`${orgLink}/maintenances${searchQueryString}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newMode, userId, orgId, id, vehicleOptions, showNotification, t, router, orgLink, searchQueryString]
  );

  const { values, touched, errors, dirty, isSubmitting, handleChange, handleSubmit, setFieldValue, resetForm } =
    useFormik({
      initialValues: initialFormValues,
      validationSchema: maintenanceInputFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

  /**
   * Creating combobox options for maintenance types based on the selected type.
   */
  const maintenanceTypeOptions: ComboboxItem[] = useMemo(() => {
    const options: ComboboxItem[] = [];

    for (const item of maintenanceTypes) {
      if (item.type === values.type) {
        options.push({
          value: ensureString(item.id),
          label: item?.name ?? "",
        });
      }
    }
    options.push({
      value: "other",
      label: "Loại bảo trì khác",
    });

    return options;
  }, [maintenanceTypes, values.type]);

  /**
   * Fetching maintenance data when in edit or copy mode.
   * If the data is found, it sets the maintenance initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the maintenance  settings page.
   */
  const fetchMaintenance = useCallback(async () => {
    const result = await getMaintenance(orgId, Number(id));
    setAwaitFetchData(false);

    if (result) {
      maintenanceRef.current = result;
      const { vehicle, trailer, maintenanceType, isOtherType, costBearer } = result;
      resetForm({
        values: {
          ...result,
          vehicleId: vehicle?.id,
          trailerId: trailer?.id,
          maintenanceTypeId: !isOtherType ? ensureString(maintenanceType?.id) : "other",
          costBearerId: costBearer?.id,
        },
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/maintenances${searchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching maintenance data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchMaintenance();
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
   * The action component of the page header.
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
   * Handle Date Change
   */
  const handleDateChange = useCallback(
    (type: string) => (date: Date | null) => {
      setFieldValue(type, date);
    },
    [setFieldValue]
  );

  /**
   * Handle isRepeat Change
   */
  const handleRepeatChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("isRepeat", item.value === "true");
    },
    [setFieldValue]
  );

  /**
   * Fetching organization member options for comboboxes.
   */
  const { organizationMembers } = useOrganizationMemberOptions({
    organization: { id: orgId },
    member: { id: undefined },
  });

  /**
   * Creating combobox options for organization members.
   */
  const orgMembersOptions: ComboboxItem[] = useMemo(
    () =>
      organizationMembers
        .filter((item) => item.member)
        .map((item: OrganizationMemberInfo) => ({
          label: getFullName(
            item.member.detail?.firstName,
            item.member.detail?.lastName,
            user.setting.locale as LocaleType
          ),
          value: String(item.member.id),
          imageSrc: item.member.detail?.avatar?.url,
        })),
    [organizationMembers, user.setting.locale]
  );

  /**
   * Handle costBearer Change
   */
  const handleOrgMembersChange = useCallback(
    (id: string) => setFieldValue("costBearerId", Number(id)),
    [setFieldValue]
  );

  /**
   * Handle maintenance type change.
   * @param {RadioItem} item - The radio item that is selected.
   */
  const handlerTypeChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("type", item.value);
      if ((editMode || copyMode) && maintenanceRef.current) {
        if (item.value === MaintenanceTypeType.VEHICLE && maintenanceRef.current.vehicle?.id) {
          setFieldValue("maintenanceTypeId", maintenanceRef.current.maintenanceType.id);
        } else if (item.value === MaintenanceTypeType.TRAILER && maintenanceRef.current.trailer?.id) {
          setFieldValue("maintenanceTypeId", maintenanceRef.current.maintenanceType.id);
        }
      } else {
        setFieldValue("maintenanceTypeId", "");
      }
      mutate();
    },
    [copyMode, editMode, mutate, setFieldValue]
  );

  /**
   * Handle Maintenance Type Options Change
   * @param {string} value - The value of the selected item.
   */
  const handleMaintenanceTypeOptionsChange = useCallback(
    (value: string) => {
      setFieldValue("maintenanceTypeId", value);
    },
    [setFieldValue]
  );

  /**
   * Handle Open New Maintenance Type Modal
   */
  const handleOpenNewMaintenanceTypeModal = useCallback(() => {
    setIsOpenNewMaintenanceTypeModal(true);
  }, []);

  /**
   * Handle Close New Maintenance Type Modal
   */
  const handleCloseNewMaintenanceTypeModal = useCallback(() => {
    setIsOpenNewMaintenanceTypeModal(false);
  }, []);

  /**
   * Handle Submit New Maintenance Type Modal
   */
  const handleSubmitNewMaintenanceTypeModal = useCallback(
    (id?: number) => {
      if (id) {
        setIsOpenNewMaintenanceTypeModal(false);
        mutate();
      }
    },
    [mutate]
  );

  /**
   * Handle Select Change
   * @param {string} name - The name of the selected item.
   * @param {string} value - The value of the selected item.
   */
  const handleSelectChange = useCallback(
    (name: string) => (value: string) => {
      setFieldValue(name, value);
    },
    [setFieldValue]
  );

  /**
   * Handle New Vehicle Modal Close
   */
  const handleNewVehicleModalClose = useCallback(() => {
    setIsNewVehicleModalOpen(false);
  }, []);

  /**
   * Handle New Vehicle Modal Open
   */
  const handleNewVehicleModalOpen = useCallback(() => {
    setIsNewVehicleModalOpen(true);
  }, []);

  /**
   * Handle New Vehicle Modal Submit
   * @param {number} id - The id of the created item.
   */
  const handleNewVehicleModalSubmit = useCallback(
    (id: number) => {
      setIsNewVehicleModalOpen(false);
      if (id) {
        setFieldValue("vehicleId", id);
        mutateVehicle();
      }
    },
    [mutateVehicle, setFieldValue]
  );

  /**
   * Handle New Trailer Modal Close
   */
  const handleNewTrailerModalClose = useCallback(() => {
    setIsNewTrailerModalOpen(false);
  }, []);

  /**
   * Handle New Trailer Modal Open
   */
  const handleNewTrailerModalOpen = useCallback(() => {
    setIsNewTrailerModalOpen(true);
  }, []);

  /**
   * Handle New Trailer Modal Submit
   * @param {number} id - The id of the created item.
   */
  const handleNewTrailerModalSubmit = useCallback(
    (id?: number) => {
      setIsNewTrailerModalOpen(false);
      if (id) {
        setFieldValue("trailerId", id);
        mutateTrailer();
      }
    },
    [mutateTrailer, setFieldValue]
  );

  return (
    <Authorization
      showAccessDenied
      resource="maintenance"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(maintenanceRef.current?.createdByUser?.id, userId)
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("maintenance.title")}
          description={t("maintenance.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />

        <div className="space-y-12">
          <InputGroup title={t("maintenance.title")} description={t("maintenance.title_description")}>
            <div className="col-span-full">
              <RadioGroup
                label={t("maintenance.transportation_type")}
                items={typeOptions}
                value={ensureString(values?.type)}
                onChange={handlerTypeChange}
                name="type"
              />
            </div>

            <div className="sm:col-span-3 sm:col-start-1">
              {values.type === MaintenanceTypeType.VEHICLE ? (
                <Combobox
                  label={t("maintenance.vehicle")}
                  items={vehicleOptions}
                  value={ensureString(values.vehicleId)}
                  onChange={handleSelectChange("vehicleId")}
                  placeholder={isVehicleOptionsLoading ? t("common.loading") : t("vehicle.select_vehicle_type")}
                  newButtonText={canNewVehicle() ? t("maintenance.add_vehicle") : undefined}
                  onNewButtonClick={canNewVehicle() ? handleNewVehicleModalOpen : undefined}
                  required
                  errorText={formatError(t, touched.vehicleId && errors.vehicleId)}
                />
              ) : (
                <Combobox
                  label={t("maintenance.trailer")}
                  items={trailerOptions}
                  value={ensureString(values.trailerId)}
                  onChange={handleSelectChange("trailerId")}
                  placeholder={isTrailerOptionsLoading ? t("common.loading") : t("maintenance.trailer_place_holder")}
                  newButtonText={canNewTrailer() ? t("maintenance.add_trailer") : undefined}
                  onNewButtonClick={canNewTrailer() ? handleNewTrailerModalOpen : undefined}
                  required
                  errorText={formatError(t, touched.trailerId && errors.trailerId)}
                />
              )}
            </div>

            <div className="sm:col-span-3">
              <Combobox
                placeholder={
                  isMaintenanceTypeOptionsLoading ? t("common.loading") : t("maintenance.maintenance_type_place_holder")
                }
                items={maintenanceTypeOptions}
                value={ensureString(values.maintenanceTypeId)}
                onChange={handleMaintenanceTypeOptionsChange}
                label={t("maintenance.maintenance_type")}
                newButtonText={canNewMaintenanceType() ? t("maintenance.add_maintenance") : undefined}
                onNewButtonClick={canNewMaintenanceType() ? handleOpenNewMaintenanceTypeModal : undefined}
                required
                errorText={formatError(t, touched.maintenanceTypeId && errors.maintenanceTypeId)}
              />
            </div>

            {ensureString(values.maintenanceTypeId) === "other" && (
              <div className="col-span-full">
                <TextField
                  label={t("maintenance.maintenance_name")}
                  name="otherMaintenanceType"
                  onChange={handleChange}
                  value={ensureString(values?.otherMaintenanceType)}
                  errorText={formatError(t, touched.otherMaintenanceType && errors.otherMaintenanceType)}
                />
              </div>
            )}

            <div className="sm:col-span-3 sm:col-start-1">
              <DatePicker
                label={t("maintenance.maintenance_date")}
                placeholder="DD/MM/YYYY"
                selected={values.maintenanceDate && new Date(values.maintenanceDate)}
                onChange={handleDateChange("maintenanceDate")}
                name="maintenanceDate"
              />
            </div>

            <div className="sm:col-span-2 sm:col-start-1">
              <NumberField
                label={t("maintenance.estimate_cost")}
                suffixText={t("common.unit.currency")}
                name="estimateCost"
                onChange={handleChange}
                value={values.estimateCost}
                errorText={formatError(t, touched.estimateCost && errors.estimateCost)}
              />
            </div>
            <div className="sm:col-span-2">
              <NumberField
                label={t("maintenance.actual_cost")}
                suffixText={t("common.unit.currency")}
                name="actualCost"
                value={values.actualCost}
                onChange={handleChange}
                errorText={formatError(t, touched.actualCost && errors.actualCost)}
              />
            </div>
            <div className="sm:col-span-2">
              <Combobox
                showAvatar
                items={orgMembersOptions}
                value={ensureString(values.costBearerId)}
                onChange={handleOrgMembersChange}
                label={t("maintenance.payment_by")}
              />
            </div>

            <div className="col-span-full">
              <TextField
                label={t("maintenance.description")}
                name="description"
                value={ensureString(values.description)}
                multiline
                rows={4}
                maxLength={500}
                showCount
                onChange={handleChange}
                errorText={formatError(t, touched.description && errors.description)}
              />
            </div>
          </InputGroup>

          <InputGroup title={t("maintenance.remind_plan")}>
            <div className="col-span-full">
              <RadioGroup
                label={t("maintenance.remind")}
                name="isRepeat"
                items={repeatOptions}
                value={ensureString(values.isRepeat)}
                onChange={handleRepeatChange}
              />
            </div>

            {values.isRepeat && (
              <div className="sm:col-span-2 sm:col-start-1">
                <DatePicker
                  selected={values?.repeatDate && new Date(values?.repeatDate)}
                  label={t("maintenance.remind_date")}
                  onChange={handleDateChange("repeatDate")}
                  name="repeatDate"
                />
              </div>
            )}
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

      {/* New Maintenance Type Modal */}
      <NewMaintenanceTypeModal
        open={isOpenNewMaintenanceTypeModal}
        onClose={handleCloseNewMaintenanceTypeModal}
        onSubmit={handleSubmitNewMaintenanceTypeModal}
        type={values.type}
      />

      {/* New Vehicle Modal */}
      <NewVehicleModal
        open={isNewVehicleModalOpen}
        onClose={handleNewVehicleModalClose}
        onSubmit={handleNewVehicleModalSubmit}
      />
      {/* New Trailer Modal */}
      <NewTrailerModal
        open={isNewTrailerModalOpen}
        onClose={handleNewTrailerModalClose}
        onSubmit={handleNewTrailerModalSubmit}
      />
    </Authorization>
  );
};

export default MaintenanceTypeForm;
