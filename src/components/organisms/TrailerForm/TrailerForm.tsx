"use client";

import { CustomFieldDataType, CustomFieldType, TrailerOwnerType } from "@prisma/client";
import clsx from "clsx";
import { Formik, FormikHelpers, FormikProps } from "formik";
import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as yup from "yup";

import { ModalActions, ModalHeader } from "@/components/atoms";
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
import { SelectItem } from "@/components/molecules/Select/Select";
import {
  ConfirmModal,
  CustomField,
  NewSubcontractorModal,
  NewTrailerTypeModal,
  NewVehicleModal,
} from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { initialFormValues, TrailerInputForm, trailerInputFormSchema } from "@/forms/trailer";
import { usePermission, useSubcontractorOptions, useVehiclesForTrailer } from "@/hooks";
import { useTrailerTypeOptions } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useTrailerState } from "@/redux/states";
import { createTrailer, getTrailer, updateTrailer } from "@/services/client/trailer";
import { BreadcrumbItem, ErrorType, YubObjectSchema } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { ScreenMode } from "@/types/form";
import { CustomFieldInfo, SubcontractorInfo, TrailerInfo, TrailerTypeInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { equalId } from "@/utils/number";
import { deleteProperties } from "@/utils/object";
import { moveDisabledToBottom } from "@/utils/sort";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists, formatError, formatErrorMessage } from "@/utils/yup";

export type TrailerFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
  inModal?: boolean;
  onCancelModal?: () => void;
  onSubmitModal?: (id?: number) => void;
};

const TrailerForm = ({
  orgId,
  orgLink,
  userId,
  screenMode,
  id,
  encryptedId,
  inModal,
  onCancelModal,
  onSubmitModal,
}: TrailerFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useTrailerState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const { canEdit, canEditOwn } = usePermission("trailer");
  const { canNew: canNewSubcontractor } = usePermission("subcontractor");
  const { canNew: canNewTrailerType } = usePermission("trailer-type");
  const { canNew: canNewVehicle } = usePermission("vehicle");

  const [deleteImage, setDeleteImage] = useState<number[]>([]);
  const [deleteRegistrationCertificate, setDeleteRegistrationCertificate] = useState<boolean>(false);
  const [deleteTechnicalSafetyCertificate, setDeleteTechnicalSafetyCertificate] = useState<boolean>(false);
  const [deleteLiabilityInsuranceCertificate, setDeleteLiabilityInsuranceCertificate] = useState<boolean>(false);
  const [isNewTrailerTypeModalOpen, setIsNewTrailerTypeModalOpen] = useState(false);
  const [isNewSubcontractorModalOpen, setIsNewSubcontractorModalOpen] = useState(false);
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [fileImages, setFileImages] = useState<UploadInputValue[]>([]);
  const [isFetched, setIsFetched] = useState(false);
  const [isCustomFieldLoaded, setIsCustomFieldLoaded] = useState(false);

  const trailerRef = useRef<TrailerInputForm>();
  const formikRef = useRef<FormikProps<TrailerInputForm>>(null);
  const [validationSchema, setValidationSchema] = useState<YubObjectSchema<TrailerInputForm>>(trailerInputFormSchema);

  const statusOptions: RadioItem[] = [
    { value: "true", label: t("trailer.status_active") },
    { value: "false", label: t("trailer.status_inactive") },
  ];

  const ownerOptions: RadioItem[] = [
    { value: TrailerOwnerType.ORGANIZATION, label: t("trailer.organization") },
    { value: TrailerOwnerType.SUBCONTRACTOR, label: t("trailer.subcontractor") },
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
    const payload: BreadcrumbItem[] = [
      { name: t("trailer.manage"), link: orgLink },
      { name: t("trailer.title"), link: `${orgLink}/trailers${searchQueryString}` },
    ];

    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/trailers/new` });
    }
    if (editMode) {
      payload.push({
        name: trailerRef.current?.trailerNumber || ensureString(encryptedId),
        link: `${orgLink}/trailers/${encryptedId}/edit`,
      });
    }

    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailerRef.current, orgLink, searchQueryString]);

  /**
   * Fetching subcontractor data.
   */
  const {
    subcontractors,
    isLoading: isSubcontractorOptionsLoading,
    mutate: mutateSubcontractor,
  } = useSubcontractorOptions({
    organizationId: orgId,
  });

  /**
   * Create a list of subcontractor options for the combobox.
   */
  const subcontractorOptions: ComboboxItem[] = useMemo(
    () =>
      subcontractors.map((item: SubcontractorInfo) => ({
        value: ensureString(item.id),
        label: ensureString(item.code),
        subLabel: ensureString(item.name),
      })),
    [subcontractors]
  );

  /**
   * Fetching vehicle data.
   */
  const {
    vehicles,
    isLoading: isVehicleOptionsLoading,
    mutate: mutateVehicle,
  } = useVehiclesForTrailer({
    organizationId: orgId,
  });

  /**
   * Create a list of vehicle options for the combobox.
   */
  const vehicleOptions: ComboboxItem[] = useMemo(
    () =>
      moveDisabledToBottom(
        vehicles.map((item: VehicleInfo) => ({
          value: ensureString(item.id),
          label: item.vehicleNumber,
          subLabel: item.driver && getFullName(item.driver.firstName, item.driver.lastName),
          disabled:
            (!editMode && !isEmpty(item.trailer)) ||
            (editMode && !isEmpty(item.trailer) && !equalId(item.trailer?.id, trailerRef.current?.id)),
        }))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicles, editMode, trailerRef.current]
  );

  /**
   * Fetching trailer type data.
   */
  const {
    trailerTypes,
    isLoading: isTrailerTypeOptionsLoading,
    mutate: mutateTrailerType,
  } = useTrailerTypeOptions({ organizationId: orgId });

  const trailerTypeOptions: ComboboxItem[] = useMemo(() => {
    return trailerTypes.map((item: TrailerTypeInfo) => ({
      value: ensureString(item.id),
      label: item.name,
    }));
  }, [trailerTypes]);

  /**
   * A list of years for the year select list.
   */
  const yearSelectList: SelectItem[] = useMemo(
    () =>
      Array.from({ length: new Date().getFullYear() - 1800 }, (_, i) => {
        const year = new Date().getFullYear() - i;
        return { label: year.toString(), value: year.toString() };
      }),
    []
  );

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a trailer form using Formik.
   *
   * @param values - The form values representing a trailer
   * @param formikHelpers - Formik form helpers.
   * @returns  A promise that handles trailer creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: TrailerInputForm, formikHelpers: FormikHelpers<TrailerInputForm>) => {
      // Check if it's a new vehicle or an update
      let result: ApiResult<TrailerInfo> | undefined;
      const customFields: CustomFieldInfo[] = (trailerRef.current?.customFields ?? []) as CustomFieldInfo[];
      const processedValues = processingCustomField<TrailerInputForm>(customFields, values);

      if (newMode) {
        result = await createTrailer(orgLink, {
          ...processedValues,
          vehicleId: values.vehicleId ? values.vehicleId : null,
          subcontractorId: values.subcontractorId,
          images: fileImages,
          registrationCertificate:
            values.registrationCertificate && values.registrationCertificate?.[0]?.name
              ? values.registrationCertificate
              : null,
          liabilityInsuranceCertificate:
            values.liabilityInsuranceCertificate && values.liabilityInsuranceCertificate?.[0]?.name
              ? values.liabilityInsuranceCertificate
              : null,
          technicalSafetyCertificate:
            values.technicalSafetyCertificate && values.technicalSafetyCertificate?.[0]?.name
              ? values.technicalSafetyCertificate
              : null,
        });
      } else {
        if (id) {
          result = await updateTrailer(
            orgLink,
            {
              ...processedValues,
              vehicleId: values.vehicleId ? values.vehicleId : null,
              subcontractorId: values.subcontractorId,
              lastUpdatedAt: trailerRef.current?.updatedAt,
              images: fileImages,
              imagesIdOld: trailerRef.current?.images?.[0]?.id ?? null,
              registrationCertificate:
                trailerRef.current?.registrationCertificate?.[0]?.name === values.registrationCertificate?.[0]?.name
                  ? null
                  : values.registrationCertificate,
              registrationCertificateId: values.registrationCertificateId ?? null,
              technicalSafetyCertificate:
                trailerRef.current?.technicalSafetyCertificate?.[0]?.name ===
                values.technicalSafetyCertificate?.[0]?.name
                  ? null
                  : values.technicalSafetyCertificate,
              technicalSafetyCertificateId: values.technicalSafetyCertificateId ?? null,
              liabilityInsuranceCertificate:
                trailerRef.current?.liabilityInsuranceCertificate?.[0]?.name ===
                values.liabilityInsuranceCertificate?.[0]?.name
                  ? null
                  : values.liabilityInsuranceCertificate,
              liabilityInsuranceCertificateId: values.liabilityInsuranceCertificateId ?? null,
              deleteImage,
              deleteLiabilityInsuranceCertificate,
              deleteRegistrationCertificate,
              deleteTechnicalSafetyCertificate,
            },
            encryptedId
          );
        }
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }
      if (result.status === HttpStatusCode.Ok) {
        // Show a success notification and navigate to the maintenance types page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.trailerNumber }),
        });
        if (inModal) {
          formikHelpers.resetForm({ values: initialFormValues });

          onSubmitModal && onSubmitModal(result.data?.id);
          onCancelModal && onCancelModal();
        } else {
          setItemString(SESSION_FLASHING_ID, ensureString(result.data?.id), {
            security: false,
          });

          router.push(`${orgLink}/trailers${searchQueryString}`);
        }
      } else {
        // Handle different error types
        let message = "";
        switch (result.message) {
          case `${ErrorType.EXISTED}-${values.trailerNumber}`:
            message = errorExists("trailer.trailer_number");
            formikHelpers.setFieldError("trailerNumber", message);
            return;
          case `${ErrorType.EXISTED}-${values.idNumber}`:
            message = errorExists("trailer.trailer_id_number");
            formikHelpers.setFieldError("idNumber", message);
            return;
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: values.trailerNumber });
            break;
          case ErrorType.UNKNOWN:
            message = formatErrorMessage("common.message.save_error_unknown", {
              name: "trailer.trailer_number",
            });
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
      }
    },
    [
      deleteImage,
      deleteLiabilityInsuranceCertificate,
      deleteRegistrationCertificate,
      deleteTechnicalSafetyCertificate,
      encryptedId,
      fileImages,
      id,
      inModal,
      newMode,
      onCancelModal,
      onSubmitModal,
      orgLink,
      router,
      searchQueryString,
      showNotification,
      t,
    ]
  );

  /**
   * A callback function for fetching and initializing the vehicle data for editing or viewing.
   */
  const fetchTrailer = useCallback(async () => {
    if (!id && !copyMode && !editMode) {
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        trailerRef.current?.customFields as CustomFieldInfo[],
        null
      );
      trailerRef.current = { ...trailerRef.current, ...customFieldMeta };
      formikRef.current?.resetForm({
        values: {
          ...formikRef.current?.values,
          ...customFieldMeta,
          prevCustomFields: customFieldMetaFileList,
        },
      });
      setIsFetched(true);
      return;
    }

    const result = await getTrailer(orgId, Number(id));
    if (result) {
      const {
        registrationCertificate,
        technicalSafetyCertificate,
        liabilityInsuranceCertificate,
        meta,
        ...otherProps
      } = result;

      // Handle get meta data for custom field
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        trailerRef.current?.customFields as CustomFieldInfo[],
        meta
      );

      if (copyMode) {
        const customFields = trailerRef.current?.customFields as CustomFieldInfo[];
        const fieldFiles = customFields.filter((field) => field.dataType === CustomFieldDataType.FILE);

        if (fieldFiles.length > 0) {
          fieldFiles.map((fieldFile) => {
            customFieldMeta[fieldFile.id] = null;
          });
        }
      }

      trailerRef.current = { ...trailerRef.current, ...result, ...customFieldMeta };
      formikRef.current?.resetForm({
        values: {
          ...formikRef.current?.values,
          ...(editMode && {
            images: otherProps.images,
            registrationCertificate,
            technicalSafetyCertificate,
            liabilityInsuranceCertificate,
            vehicleId: otherProps.vehicle?.id || null,
            registrationCertificateId: registrationCertificate?.[0]?.id || null,
            technicalSafetyCertificateId: technicalSafetyCertificate?.[0]?.id || null,
            liabilityInsuranceCertificateId: liabilityInsuranceCertificate?.[0]?.id || null,
            typeId: otherProps.type?.id || null,
          }),
          ...deleteProperties(otherProps, ["type", "vehicle", "images"]),
          ...customFieldMeta,
          prevCustomFields: customFieldMetaFileList,
        },
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      editMode && router.push(`${orgLink}/trailers${searchQueryString}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching vehicle data data when in edit or copy mode.
   */
  useEffect(() => {
    if (isCustomFieldLoaded) {
      fetchTrailer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomFieldLoaded]);

  /**
   * Initialize the form values when in edit mode.
   */
  useEffect(() => {
    if (editMode && trailerRef.current && trailerRef.current.images) {
      setFileImages(
        trailerRef.current.images.map((item) => ({
          id: item.id,
          name: item.name ?? "",
          url: item.url ?? "",
        }))
      );
    }
  }, [editMode, trailerRef?.current?.images]);

  /**
   * Show confirmation to the user before leaving the page if there are unsaved changes.
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (formikRef.current?.dirty) {
        event.preventDefault();
        event.returnValue = t("common.cancel_message");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [t]);

  /**
   * Handle the cancel button click event. If there are unsaved changes (dirty),
   * it opens a confirmation dialog. Otherwise, it navigates back to the previous page.
   */
  const handleCancelClick = useCallback(() => {
    if (formikRef.current?.dirty) {
      setIsCancelConfirmOpen(true);
    } else {
      router.back();
    }
  }, [router]);

  /**
   * Handle the cancellation of confirmation dialog.
   */
  const handleCancel = useCallback(() => {
    setIsCancelConfirmOpen(false);
  }, []);

  /**
   * Handle changes to file upload inputs in a form.
   *
   * @param {string} name - The name of the file input.
   * @param {UploadInputValue | undefined} file - The selected file or undefined if removed.
   */
  const handleFileChange = useCallback(
    (name: string) => (file?: UploadInputValue) => {
      const fieldName = `${name}[0]`;

      if (!file) {
        switch (name) {
          case "registrationCertificate":
            setDeleteRegistrationCertificate(true);
            break;
          case "technicalSafetyCertificate":
            setDeleteTechnicalSafetyCertificate(true);
            break;
          case "liabilityInsuranceCertificate":
            setDeleteLiabilityInsuranceCertificate(true);
            break;
          default:
            break;
        }
      }

      formikRef.current?.setFieldValue(fieldName, file);
    },
    []
  );

  /**
   * Handle changes to select inputs in a form.
   *
   * @param {string} name - The name of the select input.
   * @param {string} value - The selected value.
   */
  const handleSelectChange = useCallback(
    (name: string) => (value: string) => {
      formikRef.current?.setFieldValue(name, value);
    },
    []
  );

  /**
   * Handle changes to date inputs in a form.
   *
   * @param {string} name - The name of the date input.
   * @param {Date} date - The selected date.
   */
  const handleDateChange = useCallback(
    (name: string) => (date: Date) => {
      formikRef.current?.setFieldValue(name, date);
    },
    []
  );

  /**
   * Handle the toggle of the new trailer type modal.
   */
  const handleToggleNewTrailerTypeModal = useCallback(() => {
    setIsNewTrailerTypeModalOpen((prev) => !prev);
  }, []);

  /**
   * Handle the submission of the new trailer type modal.
   */
  const handleNewTrailerTypeModalSubmit = useCallback(
    (id?: number) => {
      handleToggleNewTrailerTypeModal();
      if (id) {
        formikRef.current?.setFieldValue("typeId", id);
        mutateTrailerType();
      }
    },
    [handleToggleNewTrailerTypeModal, mutateTrailerType]
  );

  /**
   * Handle the toggle of the new subcontractor modal.
   */
  const handleToggleNewSubcontractorModal = useCallback(() => {
    setIsNewSubcontractorModalOpen((prev) => !prev);
  }, []);

  /**
   * Handle the submission of the new subcontractor modal.
   */
  const handleNewSubcontractorModalSubmit = useCallback(
    (id?: number) => {
      handleToggleNewSubcontractorModal();
      if (id) {
        formikRef.current?.setFieldValue("subcontractorId", id);
        mutateSubcontractor();
      }
    },
    [mutateSubcontractor, handleToggleNewSubcontractorModal]
  );

  /**
   * Handle the toggle of the new vehicle modal.
   */
  const handleToggleNewVehicleModal = useCallback(() => {
    setIsNewVehicleModalOpen((prev) => !prev);
  }, []);

  /**
   * Handle the submission of the new vehicle modal.
   * @param {number} [id] - The ID of the selected vehicle.
   */
  const handleNewVehicleModalSubmit = useCallback(
    (id: number) => {
      handleToggleNewVehicleModal();
      if (id) {
        formikRef.current?.setFieldValue("vehicleId", id);
        mutateVehicle();
      }
    },
    [handleToggleNewVehicleModal, mutateVehicle]
  );

  /**
   * Handle changes to multiple file inputs in a form.
   *
   * @param {number} [index] - Optional index to specify the position of the file to change.
   * @param {UploadInputValue} [file] - The new file to add or the file to remove (if specified by index).
   */
  const handleMultiFileChange = useCallback(
    (index?: number) => (file?: UploadInputValue) => {
      if (file) {
        setFileImages((prevFileImages) => [...prevFileImages, file]);
      } else {
        const updatedFileImages = [...fileImages];
        const removedItem = updatedFileImages.splice(Number(index), 1)[0];
        if (removedItem && removedItem.id) {
          setDeleteImage([...deleteImage, removedItem.id]);
        }

        setFileImages(updatedFileImages);
      }
    },
    [deleteImage, fileImages]
  );

  /**
   * Handle the cancellation of trailer modal.
   */
  const handleCancelModalClick = useCallback(() => {
    onCancelModal && onCancelModal();
  }, [onCancelModal]);

  /**
   * A component for the cancel confirmation dialog.
   *
   * @returns {JSX.Element} - The cancel confirmation component.
   */
  const viewMultipleFile = useMemo(
    () =>
      fileImages.map((item, index) => (
        <div key={index} className="sm:col-span-3">
          <UploadInput
            key={index}
            value={{
              name: item.name ?? "",
              url: item.url ?? "",
            }}
            type="TRAILER"
            name="image"
            onChange={handleMultiFileChange(index)}
          />
        </div>
      )),
    [fileImages, handleMultiFileChange]
  );

  /**
   * Callback function to handle the loading of custom fields.
   *
   * @param schema - The YubObjectSchema of the customer input form.
   * @param customFields - An array of custom field information.
   */
  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<TrailerInputForm>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }).concat(trailerInputFormSchema));
      trailerRef.current = { ...trailerRef.current, customFields };
      setIsCustomFieldLoaded(true);
    },
    []
  );

  return (
    <Authorization
      showAccessDenied
      resource="trailer"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        isFetched && editMode && !canEdit() && canEditOwn() && !equalId(trailerRef.current?.createdByUser?.id, userId)
      }
    >
      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmitFormik}
      >
        {({ isSubmitting, values, touched, errors, setFieldValue, handleChange, handleSubmit }) => (
          <form method="POST" onSubmit={handleSubmit}>
            {inModal ? (
              <ModalHeader
                title={t("trailer.new_trailer_type_modal.title")}
                subTitle={t("trailer.new_trailer_type_modal.title_description")}
              />
            ) : (
              <PageHeader
                title={t("trailer.new_trailer_type_modal.title")}
                description={t("trailer.new_trailer_type_modal.title_description")}
                actionHorizontal
                actionComponent={
                  <>
                    <div className="flex flex-row justify-end gap-x-4">
                      <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
                        {t("common.cancel")}
                      </Button>
                      <Button type="submit" loading={isSubmitting}>
                        {t("common.save")}
                      </Button>
                    </div>
                  </>
                }
              />
            )}

            <div className={clsx("space-y-12", { "px-4 pt-5 sm:p-6 sm:pb-0": inModal })}>
              <InputGroup title={t("trailer.general_title")} description={t("trailer.general_description")}>
                <div className="col-span-full">
                  <RadioGroup
                    label={t("trailer.owner")}
                    name="owner"
                    items={ownerOptions}
                    value={values.ownerType}
                    onChange={(item) => setFieldValue("ownerType", item.value)}
                  />
                </div>

                {values.ownerType === TrailerOwnerType.SUBCONTRACTOR && (
                  <div className="sm:col-span-4">
                    <Combobox
                      label={t("trailer.subcontractor")}
                      items={subcontractorOptions}
                      value={ensureString(values.subcontractorId)}
                      onChange={handleSelectChange("subcontractorId")}
                      placeholder={
                        isSubcontractorOptionsLoading ? t("common.loading") : t("trailer.select_subcontractor")
                      }
                      newButtonText={canNewSubcontractor() ? t("trailer.new_subcontractor_modal.title") : undefined}
                      onNewButtonClick={canNewSubcontractor() ? handleToggleNewSubcontractorModal : undefined}
                    />
                  </div>
                )}

                <div className="sm:col-span-2 sm:col-start-1">
                  <TextField
                    label={t("trailer.trailer_number")}
                    name="trailerNumber"
                    value={values.trailerNumber}
                    required
                    maxLength={20}
                    onChange={handleChange}
                    errorText={formatError(t, touched.trailerNumber && errors.trailerNumber)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <TextField
                    label={t("trailer.trailer_id_number")}
                    name="idNumber"
                    value={ensureString(values.idNumber)}
                    maxLength={20}
                    onChange={handleChange}
                    errorText={formatError(t, touched.idNumber && errors.idNumber)}
                  />
                </div>

                <div className="sm:col-span-3">
                  <Combobox
                    label={t("trailer.trailer_type")}
                    items={trailerTypeOptions}
                    value={ensureString(values.typeId)}
                    onChange={handleSelectChange("typeId")}
                    placeholder={isTrailerTypeOptionsLoading ? t("common.loading") : t("trailer.select_trailer_type")}
                    newButtonText={
                      canNewTrailerType() ? t("trailer.new_trailer_type_modal.btn_new_trailer_type") : undefined
                    }
                    onNewButtonClick={canNewTrailerType() ? handleToggleNewTrailerTypeModal : undefined}
                  />
                </div>

                <div className="sm:col-span-3">
                  <TextField
                    label={t("trailer.brand")}
                    name="brand"
                    value={ensureString(values.brand)}
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.brand && errors.brand)}
                  />
                </div>

                <div className="sm:col-span-1 sm:col-start-1">
                  <TextField
                    type="color"
                    label={t("trailer.color")}
                    name="color"
                    value={ensureString(values.color)}
                    onChange={handleChange}
                    errorText={formatError(t, touched.color && errors.color)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Combobox
                    label={t("trailer.year_of_manufacture")}
                    items={yearSelectList}
                    value={ensureString(values.yearOfManufacture)}
                    onChange={handleSelectChange("yearOfManufacture")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <DatePicker
                    label={t("trailer.usage_date")}
                    name="startUsageDate"
                    placeholder="DD/MM/YYYY"
                    selected={values.startUsageDate && new Date(values.startUsageDate)}
                    onChange={handleDateChange("startUsageDate")}
                  />
                </div>

                {!inModal && (
                  <>
                    {viewMultipleFile}
                    <div className="col-span-full">
                      <UploadInput
                        label={t("trailer.picture")}
                        name="image"
                        showPreview={false}
                        type="TRAILER"
                        multiple
                        onChange={handleMultiFileChange(undefined)}
                      />
                    </div>

                    <div className="col-span-full">
                      <TextField
                        label={t("trailer.description")}
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

                    <div className="col-span-full">
                      <RadioGroup
                        label={t("trailer.status")}
                        name="status"
                        items={statusOptions}
                        value={values.isActive?.toString()}
                        onChange={(item) => setFieldValue("isActive", item.value === "true")}
                      />
                    </div>
                  </>
                )}
              </InputGroup>

              <InputGroup
                title={t("trailer.transportation_info_title")}
                description={t("trailer.transportation_info_description")}
                showBorderBottom={!inModal}
              >
                <div className="sm:col-span-2 sm:col-start-1">
                  <NumberField
                    label={t("trailer.length")}
                    name="maxLength"
                    value={values.maxLength}
                    onChange={handleChange}
                    errorText={formatError(t, touched.maxLength && errors.maxLength)}
                    suffixText={t("common.unit.meter")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <NumberField
                    label={t("trailer.width")}
                    name="maxWidth"
                    value={values.maxWidth}
                    onChange={handleChange}
                    errorText={formatError(t, touched.maxWidth && errors.maxWidth)}
                    suffixText={t("common.unit.meter")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <NumberField
                    label={t("trailer.height")}
                    name="maxHeight"
                    value={values.maxHeight}
                    onChange={handleChange}
                    errorText={formatError(t, touched.maxHeight && errors.maxHeight)}
                    suffixText={t("common.unit.meter")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <NumberField
                    label={t("trailer.cube_meter")}
                    name="cubicMeterCapacity"
                    value={values.cubicMeterCapacity}
                    onChange={handleChange}
                    errorText={formatError(t, touched.cubicMeterCapacity && errors.cubicMeterCapacity)}
                    suffixText={t("common.unit.cubic_meter")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <NumberField
                    label={t("trailer.weight_ton")}
                    name="tonPayloadCapacity"
                    value={values.tonPayloadCapacity}
                    onChange={handleChange}
                    errorText={formatError(t, touched.tonPayloadCapacity && errors.tonPayloadCapacity)}
                    suffixText={t("common.unit.ton")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <NumberField
                    label={t("trailer.weight_pallet")}
                    name="palletCapacity"
                    value={values.palletCapacity}
                    onChange={handleChange}
                    errorText={formatError(t, touched.palletCapacity && errors.palletCapacity)}
                    suffixText={t("common.unit.pallet")}
                  />
                </div>
              </InputGroup>
              {!inModal && (
                <>
                  <InputGroup
                    title={t("trailer.license_info_title")}
                    description={t("trailer.license_info_description")}
                  >
                    <div className="sm:col-span-3">
                      <DatePicker
                        label={t("trailer.license_registration_date")}
                        name="registrationDate"
                        placeholder="DD/MM/YYYY"
                        selected={values.registrationDate && new Date(values.registrationDate)}
                        onChange={handleDateChange("registrationDate")}
                        errorText={formatError(t, touched.registrationDate && errors.registrationDate)}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <DatePicker
                        label={t("trailer.license_expiration_date")}
                        name="registrationExpirationDate"
                        placeholder="DD/MM/YYYY"
                        selected={values.registrationExpirationDate && new Date(values.registrationExpirationDate)}
                        onChange={handleDateChange("registrationExpirationDate")}
                        errorText={formatError(
                          t,
                          touched.registrationExpirationDate && errors.registrationExpirationDate
                        )}
                      />
                    </div>

                    <div className="col-span-full">
                      <UploadInput
                        value={
                          !values?.registrationCertificate?.[0]
                            ? undefined
                            : {
                                name: values?.registrationCertificate?.[0]?.name ?? "",
                                url: values?.registrationCertificate?.[0]?.url ?? "",
                              }
                        }
                        label={t("trailer.license_certificate")}
                        type="TRAILER"
                        name="registrationCertificate"
                        onChange={handleFileChange("registrationCertificate")}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <DatePicker
                        label={t("trailer.insurance_registration_date")}
                        name="liabilityInsuranceRegistrationDate"
                        placeholder="DD/MM/YYYY"
                        selected={
                          values.liabilityInsuranceRegistrationDate &&
                          new Date(values.liabilityInsuranceRegistrationDate)
                        }
                        onChange={handleDateChange("liabilityInsuranceRegistrationDate")}
                        errorText={formatError(
                          t,
                          touched.liabilityInsuranceRegistrationDate && errors.liabilityInsuranceRegistrationDate
                        )}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <DatePicker
                        label={t("trailer.insurance_expiration_date")}
                        name="liabilityInsuranceExpirationDate"
                        placeholder="DD/MM/YYYY"
                        selected={
                          values.liabilityInsuranceExpirationDate && new Date(values.liabilityInsuranceExpirationDate)
                        }
                        onChange={handleDateChange("liabilityInsuranceExpirationDate")}
                        errorText={formatError(
                          t,
                          touched.liabilityInsuranceExpirationDate && errors.liabilityInsuranceExpirationDate
                        )}
                      />
                    </div>

                    <div className="col-span-full">
                      <UploadInput
                        value={
                          !values?.liabilityInsuranceCertificate?.[0]
                            ? undefined
                            : {
                                name: values?.liabilityInsuranceCertificate?.[0]?.name ?? "",
                                url: values?.liabilityInsuranceCertificate?.[0]?.url ?? "",
                              }
                        }
                        label={t("trailer.insurance")}
                        type="TRAILER"
                        name="liabilityInsuranceCertificate"
                        onChange={handleFileChange("liabilityInsuranceCertificate")}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <DatePicker
                        label={t("trailer.technical_safety_registration_date")}
                        name="technicalSafetyRegistrationDate"
                        placeholder="DD/MM/YYYY"
                        selected={
                          values.technicalSafetyRegistrationDate && new Date(values.technicalSafetyRegistrationDate)
                        }
                        onChange={handleDateChange("technicalSafetyRegistrationDate")}
                        errorText={formatError(
                          t,
                          touched.technicalSafetyRegistrationDate && errors.technicalSafetyRegistrationDate
                        )}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <DatePicker
                        label={t("trailer.technical_safety_expiration_date")}
                        name="technicalSafetyExpirationDate"
                        placeholder="DD/MM/YYYY"
                        selected={
                          values.technicalSafetyExpirationDate && new Date(values.technicalSafetyExpirationDate)
                        }
                        onChange={handleDateChange("technicalSafetyExpirationDate")}
                        errorText={formatError(
                          t,
                          touched.technicalSafetyExpirationDate && errors.technicalSafetyExpirationDate
                        )}
                      />
                    </div>

                    <div className="col-span-full">
                      <UploadInput
                        value={
                          !values?.technicalSafetyCertificate?.[0]
                            ? undefined
                            : {
                                name: values?.technicalSafetyCertificate?.[0]?.name ?? "",
                                url: values?.technicalSafetyCertificate?.[0]?.url ?? "",
                              }
                        }
                        label={t("trailer.technical_safety_certificate")}
                        type="TRAILER"
                        name="technicalSafetyCertificate"
                        onChange={handleFileChange("technicalSafetyCertificate")}
                      />
                    </div>
                  </InputGroup>

                  <InputGroup
                    title={t("trailer.truck_vehicle_info_title")}
                    description={t("trailer.truck_vehicle_info_description")}
                  >
                    <div className="sm:col-span-3">
                      <Combobox
                        label={t("trailer.truck_vehicle")}
                        items={vehicleOptions}
                        value={ensureString(values.vehicleId)}
                        onChange={handleSelectChange("vehicleId")}
                        loading={isVehicleOptionsLoading}
                        placeholder={t("trailer.select_truck_vehicle")}
                        placement="top"
                        emptyLabel={t("trailer.no_truck_vehicle")}
                        newButtonText={canNewVehicle() ? t("trailer.new_truck_vehicle") : undefined}
                        onNewButtonClick={canNewVehicle() ? handleToggleNewVehicleModal : undefined}
                      />
                    </div>
                  </InputGroup>
                </>
              )}

              {!inModal && (
                <CustomField
                  variant="input-group"
                  title={t("custom_field.input_group_title")}
                  type={CustomFieldType.TRAILER}
                  onLoaded={handleCustomFieldLoaded}
                />
              )}
            </div>

            {inModal ? (
              <ModalActions>
                <Button
                  type="button"
                  variant="outlined"
                  color="secondary"
                  disabled={isSubmitting}
                  onClick={handleCancelModalClick}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  {t("common.save")}
                </Button>
              </ModalActions>
            ) : (
              <div className="mt-4 max-sm:px-4">
                <div className="flex flex-row justify-end gap-x-4">
                  <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    {t("common.save")}
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}
      </Formik>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        open={isCancelConfirmOpen}
        icon="question"
        title={t("common.confirmation.cancel_title")}
        message={t("common.confirmation.cancel_message")}
        onClose={handleCancel}
        onCancel={handleCancel}
        onConfirm={goBack}
      />

      {/* New Trailer Type Modal */}
      <NewTrailerTypeModal
        open={isNewTrailerTypeModalOpen}
        onClose={handleToggleNewTrailerTypeModal}
        onSubmit={handleNewTrailerTypeModalSubmit}
      />

      {/* New Vehicle Modal */}
      <NewVehicleModal
        open={isNewVehicleModalOpen}
        onClose={handleToggleNewVehicleModal}
        onSubmit={handleNewVehicleModalSubmit}
      />

      {/* New Subcontractor Modal */}
      <NewSubcontractorModal
        open={isNewSubcontractorModalOpen}
        onClose={handleToggleNewSubcontractorModal}
        onSubmit={handleNewSubcontractorModalSubmit}
      />
    </Authorization>
  );
};

export default TrailerForm;
