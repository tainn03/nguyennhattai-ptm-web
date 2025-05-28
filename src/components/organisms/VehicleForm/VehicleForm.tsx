"use client";

import { CustomFieldDataType, CustomFieldType, VehicleOwnerType } from "@prisma/client";
import clsx from "clsx";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as yup from "yup";

import { ModalActions, ModalHeader } from "@/components/atoms";
import {
  Authorization,
  Button,
  Combobox,
  InputGroup,
  PageHeader,
  VehicleGeneralInfoForm,
  VehicleLicenseForm,
  VehicleTransportationInfoForm,
} from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { ConfirmModal, CustomField, NewDriverModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { initialFormValues, vehicleInfoInputFormSchema, VehicleInputForm } from "@/forms/vehicle";
import { useDriverOptions, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useVehicleState } from "@/redux/states";
import { getSubcontractorName } from "@/services/client/subcontractor";
import { createVehicle, getVehicle, updateVehicle } from "@/services/client/vehicle";
import { BreadcrumbItem, ErrorType, YubObjectSchema } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { ScreenMode } from "@/types/form";
import { DriverInfo, VehicleInfo } from "@/types/strapi";
import { CustomFieldInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { equalId } from "@/utils/number";
import { deleteProperties } from "@/utils/object";
import { moveDisabledToBottom } from "@/utils/sort";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists } from "@/utils/yup";

export type VehicleFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  inModal?: boolean;
  id?: number | null;
  encryptedId?: string | null;
  subcontractorId?: number | null;
  onCancelModal?: () => void;
  onSubmitModal?: (id: number) => void;
};

const VehicleForm = ({
  orgId,
  orgLink,
  userId,
  screenMode,
  id,
  encryptedId,
  subcontractorId,
  inModal,
  onCancelModal,
  onSubmitModal,
}: VehicleFormProps) => {
  const t = useTranslations();
  const { encryptedId: encryptedSubcontractorId } = useIdParam({ name: "subcontractorId" });
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useVehicleState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const { canEdit, canEditOwn } = usePermission("vehicle");
  const { canNew: canNewDriver } = usePermission("driver");
  const [deleteImage, setDeleteImage] = useState<number[]>([]);
  const [deleteRegistrationCertificate, setDeleteRegistrationCertificate] = useState<boolean>(false);
  const [deleteTechnicalSafetyCertificate, setDeleteTechnicalSafetyCertificate] = useState<boolean>(false);
  const [deleteLiabilityInsuranceCertificate, setDeleteLiabilityInsuranceCertificate] = useState<boolean>(false);
  const [fileImages, setFileImages] = useState<UploadInputValue[]>([]);
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
  const [isFetched, setIsFetched] = useState(false);
  const [isCustomFieldLoaded, setIsCustomFieldLoaded] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleInfo>();

  const formikRef = useRef<FormikProps<VehicleInputForm>>(null);
  const vehicleRef = useRef<VehicleInputForm>();
  const [validationSchema, setValidationSchema] =
    useState<YubObjectSchema<VehicleInputForm>>(vehicleInfoInputFormSchema);

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  /**
   * Updates the breadcrumb trail based on the current state, including whether it's a new or edit mode,
   * and whether the vehicle is associated with a subcontractor.
   * The breadcrumb is used for navigation and provides a hierarchical structure.
   */
  const updateBreadcrumb = useCallback(async () => {
    const payload: BreadcrumbItem[] = [{ name: t("vehicle.manage"), link: orgLink }];
    let subcontractorName;
    if (subcontractorId) {
      subcontractorName = await getSubcontractorName(orgId, subcontractorId);
    }
    if (subcontractorId) {
      payload.push({ name: t("subcontractor.title"), link: `${orgLink}/subcontractors` });
      payload.push({
        name: subcontractorName || ensureString(encryptedSubcontractorId),
        link: searchQueryString
          ? `${orgLink}/subcontractors/${encryptedSubcontractorId}${searchQueryString}&tab=vehicles`
          : `${orgLink}/subcontractors/${encryptedSubcontractorId}?tab=vehicles`,
      });
      payload.push({
        name: t("subcontractor.vehicle"),
        link: `${orgLink}/subcontractors/${encryptedSubcontractorId}/vehicles`,
      });

      if (newMode) {
        payload.push({
          name: t("common.new"),
          link: `${orgLink}/subcontractors/${encryptedSubcontractorId}/vehicles/new`,
        });
      }
      if (editMode) {
        payload.push({
          name: vehicle?.vehicleNumber || ensureString(encryptedId),
          link: `${orgLink}/subcontractors/${encryptedSubcontractorId}vehicles/${encryptedId}/edit`,
        });
      }
    } else {
      payload.push({ name: t("vehicle.feature"), link: `${orgLink}/vehicles${searchQueryString}` });
      if (newMode) {
        payload.push({ name: t("common.new"), link: `${orgLink}/vehicles/new` });
      }
      if (editMode) {
        payload.push({
          name: vehicle?.vehicleNumber || ensureString(encryptedId),
          link: `${orgLink}/vehicles/${encryptedId}/edit`,
        });
      }
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, orgLink, searchQueryString, subcontractorId]);

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    if (!inModal) {
      updateBreadcrumb();
    }
  }, [updateBreadcrumb, inModal]);

  const { drivers, isLoading: isDriverOptionsLoading, mutate } = useDriverOptions({ organizationId: orgId });

  const driverOptions: ComboboxItem[] = useMemo(() => {
    const driversWithoutTrailer: ComboboxItem[] = [];
    const driversWithTrailer: ComboboxItem[] = [];
    drivers.map((item: DriverInfo) => {
      const fullName = getFullName(item.firstName, item.lastName);
      if (!item.vehicle) {
        driversWithoutTrailer.push({
          value: ensureString(item.id),
          label: fullName,
        });
      } else {
        driversWithTrailer.push({
          value: ensureString(item.id),
          label: fullName,
          subLabel: item.vehicle.vehicleNumber,
          disabled: editMode && vehicle?.driver?.id === item.id ? false : true,
        });
      }
    });
    return moveDisabledToBottom([...driversWithoutTrailer, ...driversWithTrailer]);
  }, [drivers, editMode, vehicle?.driver?.id]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of the vehicle form, either for creating a new vehicle or updating an existing one.
   * Makes API requests to save the vehicle data and handles success/failure scenarios.
   *
   * @param {VehicleInputForm} values - Form values representing the vehicle data.
   * @param {FormikHelpers<VehicleInputForm>} formikHelpers - Formik helpers for managing form state.
   */
  const handleSubmitFormik = useCallback(
    async (values: VehicleInputForm, formikHelpers: FormikHelpers<VehicleInputForm>) => {
      // Check if it's a new vehicle or an update
      let result: ApiResult<VehicleInfo> | undefined;
      const customFields: CustomFieldInfo[] = (vehicleRef.current?.customFields ?? []) as CustomFieldInfo[];
      const processedValues = processingCustomField<VehicleInputForm>(customFields, values);

      if (newMode) {
        // Handle creating a new vehicle
        result = await createVehicle(orgLink, {
          ...processedValues,
          subcontractorId: values.subcontractorId,
          images: fileImages,
          registrationCertificate: values.registrationCertificate?.[0]?.name ? values.registrationCertificate : null,
          liabilityInsuranceCertificate: values.liabilityInsuranceCertificate?.[0]?.name
            ? values.liabilityInsuranceCertificate
            : null,
          technicalSafetyCertificate: values.technicalSafetyCertificate?.[0]?.name
            ? values.technicalSafetyCertificate
            : null,
        });
      } else {
        if (vehicle?.id) {
          // Handle updating an existing vehicle
          result = await updateVehicle(
            orgLink,
            {
              ...processedValues,
              id: vehicle?.id,
              subcontractorId: values.subcontractorId,
              lastUpdatedAt: vehicle?.updatedAt,
              images: fileImages,
              imagesIdOld: vehicle?.images?.[0]?.id ?? null,
              registrationCertificate:
                vehicle?.registrationCertificate?.[0]?.name === values.registrationCertificate?.[0]?.name
                  ? null
                  : values.registrationCertificate,
              registrationCertificateImageId: vehicle?.registrationCertificate?.[0]?.id ?? null,
              technicalSafetyCertificate:
                vehicle?.technicalSafetyCertificate?.[0]?.name === values.technicalSafetyCertificate?.[0]?.name
                  ? null
                  : values.technicalSafetyCertificate,
              technicalSafetyCertificateImageId: vehicle?.technicalSafetyCertificate?.[0]?.id ?? null,
              liabilityInsuranceCertificate:
                vehicle?.liabilityInsuranceCertificate?.[0]?.name === values.liabilityInsuranceCertificate?.[0]?.name
                  ? null
                  : values.liabilityInsuranceCertificate,
              liabilityInsuranceCertificateImageId: vehicle?.liabilityInsuranceCertificate?.[0]?.id ?? null,
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
        // Show a success notification and navigate to the appropriate page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.vehicleNumber }),
        });

        if (inModal) {
          onSubmitModal && onSubmitModal(Number(result.data?.id));
          onCancelModal && onCancelModal();
        } else {
          setItemString(SESSION_FLASHING_ID, ensureString(result.data?.id), {
            security: false,
          });

          if (subcontractorId) {
            router.push(
              searchQueryString
                ? `${orgLink}/subcontractors/${encryptedSubcontractorId}${searchQueryString}&tab=vehicles`
                : `${orgLink}/subcontractors/${encryptedSubcontractorId}?tab=vehicles`
            );
          } else {
            router.push(`${orgLink}/vehicles${searchQueryString}`);
          }
        }
      } else {
        // Handle different error types and show an error notification
        let message = "";
        switch (result.message) {
          case `${ErrorType.EXISTED}-${values.vehicleNumber}`:
            message = errorExists("vehicle.vehicle_number");
            formikHelpers.setFieldError("vehicleNumber", message);
            return;
          case `${ErrorType.EXISTED}-${values.idNumber}`:
            message = errorExists("vehicle.vehicle_id_number");
            formikHelpers.setFieldError("idNumber", message);
            return;
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: values.vehicleNumber });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: values.vehicleNumber });
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
      encryptedSubcontractorId,
      fileImages,
      inModal,
      newMode,
      onCancelModal,
      onSubmitModal,
      orgLink,
      router,
      searchQueryString,
      showNotification,
      subcontractorId,
      t,
      vehicle?.id,
      vehicle?.images,
      vehicle?.liabilityInsuranceCertificate,
      vehicle?.registrationCertificate,
      vehicle?.technicalSafetyCertificate,
      vehicle?.updatedAt,
    ]
  );

  /**
   * A callback function for fetching and initializing the vehicle data for editing or viewing.
   */
  const fetchVehicle = useCallback(async () => {
    if (!id && !copyMode && !editMode) {
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        vehicleRef.current?.customFields as CustomFieldInfo[],
        null
      );
      vehicleRef.current = { ...vehicleRef.current, ...customFieldMeta };
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

    const result = await getVehicle(Number(orgId), Number(id));
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
        vehicleRef.current?.customFields as CustomFieldInfo[],
        meta
      );

      if (copyMode) {
        const customFields = (vehicleRef.current?.customFields || []) as CustomFieldInfo[];
        const fieldFiles = customFields.filter((field) => field.dataType === CustomFieldDataType.FILE);

        if (fieldFiles.length > 0) {
          fieldFiles.map((fieldFile) => {
            customFieldMeta[fieldFile.id] = null;
          });
        }
      }

      setVehicle((prev) => ({ ...prev, ...result, ...customFieldMeta }));
      vehicleRef.current = { ...vehicleRef.current, ...result, ...customFieldMeta };
      formikRef.current?.resetForm({
        values: {
          ...formikRef.current?.values,
          ...(editMode && {
            images: otherProps.images,
            trailerId: otherProps.trailer?.id || null,
            driverId: otherProps.driver?.id || null,
            registrationCertificate: registrationCertificate || undefined,
            technicalSafetyCertificate: technicalSafetyCertificate || undefined,
            liabilityInsuranceCertificate: liabilityInsuranceCertificate || undefined,
            typeId: otherProps.type?.id || null,
          }),
          ...deleteProperties(otherProps, ["type", "driver", "trailer", "images"]),
          ...customFieldMeta,
          prevCustomFields: customFieldMetaFileList,
        },
      });

      if (editMode && (otherProps.images || []).length > 0) {
        setFileImages(
          (otherProps.images || []).map((item) => ({
            id: item.id,
            name: item.name ?? "",
            url: item.url ?? "",
          }))
        );
      }
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        if (subcontractorId) {
          router.push(
            searchQueryString
              ? `${orgLink}/subcontractors/${encryptedSubcontractorId}${searchQueryString}&tab=vehicles`
              : `${orgLink}/subcontractors/${encryptedSubcontractorId}?tab=vehicles`
          );
        } else {
          router.push(`${orgLink}/vehicles${searchQueryString}`);
        }
      }
    }
    setIsFetched(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching vehicle data data when in edit or copy mode.
   */
  useEffect(() => {
    if (isCustomFieldLoaded) {
      fetchVehicle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomFieldLoaded]);

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
   * Handle the cancellation of vehicle modal.
   */
  const handleCancelModalClick = useCallback(() => {
    onCancelModal && onCancelModal();
  }, [onCancelModal]);

  /**
   * Handle changes to file upload inputs in a form.
   *
   * @param {string} name - The name of the file input.
   * @param {UploadInputValue | undefined} file - The selected file or undefined if removed.
   */
  const handleFileChange = useCallback((name: string, file?: UploadInputValue) => {
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
  }, []);

  /**
   * Handle changes to multiple file inputs in a form.
   *
   * @param {number} [index] - Optional index to specify the position of the file to change.
   * @param {UploadInputValue} [file] - The new file to add or the file to remove (if specified by index).
   */
  const handleMultiFileChange = useCallback(
    (file?: UploadInputValue, index?: number) => {
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
   * Effect hook that sets form field values related to subcontractor when subcontractorId changes.
   * If subcontractorId is provided, it sets ownerType to SUBCONTRACTOR and subcontractorId in the formikRef.
   */
  useEffect(() => {
    if (subcontractorId) {
      formikRef.current?.setFieldValue("ownerType", VehicleOwnerType.SUBCONTRACTOR);
      formikRef.current?.setFieldValue("subcontractorId", subcontractorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcontractorId]);

  /**
   * Generates the action component for a form, including buttons for canceling and saving.
   *
   * @param {boolean} isSubmitting - Indicates whether the form is in a submitting state.
   * @returns {JSX.Element} The JSX element representing the action component.
   */
  const renderActionComponent = useCallback(
    (isSubmitting: boolean): JSX.Element => (
      <div className="flex flex-row justify-end gap-x-4">
        <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    ),
    [handleCancelClick, t]
  );

  /**
   * Toggles the visibility of the new driver modal.
   */
  const handleToggleNewDriverModal = useCallback(() => {
    setIsNewDriverModalOpen((prev) => !prev);
  }, []);

  /**
   * Handles the submission of the new driver modal form.
   * Closes the modal, triggers data mutation, and updates the form field with the selected driver's ID.
   *
   * @param {number} id - The ID of the selected driver.
   */
  const handleNewDriverModalSubmit = useCallback(
    (id: number) => {
      setIsNewDriverModalOpen(false);
      mutate();
      formikRef.current?.setFieldValue("driverId", id);
    },
    [mutate]
  );

  /**
   * Callback function to handle the loading of custom fields.
   *
   * @param schema - The YubObjectSchema of the customer input form.
   * @param customFields - An array of custom field information.
   */
  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<VehicleInputForm>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }).concat(vehicleInfoInputFormSchema));
      vehicleRef.current = { ...vehicleRef.current, customFields };
      setIsCustomFieldLoaded(true);
    },
    []
  );

  return (
    <>
      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmitFormik}
      >
        {({ values, isSubmitting, setFieldValue, handleSubmit }) => (
          <Authorization
            showAccessDenied
            resource="vehicle"
            action={["new", "edit", "edit-own"]}
            type="oneOf"
            isAccessDenied={
              isFetched && editMode && !canEdit() && canEditOwn() && !equalId(vehicle?.createdByUser?.id, userId)
            }
          >
            <form method="POST" onSubmit={handleSubmit}>
              {inModal ? (
                <ModalHeader title={t("vehicle.new_vehicle_title")} subTitle={t("vehicle.new_vehicle_description")} />
              ) : (
                <PageHeader
                  title={t("vehicle.feature")}
                  description={t("vehicle.feature_description")}
                  actionHorizontal
                  actionComponent={renderActionComponent(isSubmitting)}
                />
              )}
              <div className={clsx("space-y-12", { "px-4 pb-4 pt-5 sm:p-6": inModal })}>
                <InputGroup title={t("vehicle.general_title")} description={t("vehicle.general_description")}>
                  <VehicleGeneralInfoForm
                    screenMode={screenMode}
                    orgLink={orgLink}
                    orgId={orgId}
                    subcontractorId={subcontractorId}
                    onMultiFileChange={handleMultiFileChange}
                    fileImages={fileImages}
                    inModal={inModal}
                    vehicleInfo={vehicle}
                  />
                </InputGroup>

                <InputGroup
                  title={t("vehicle.transportation_info_title")}
                  description={t("vehicle.transportation_info_description")}
                  showBorderBottom={!inModal}
                >
                  <VehicleTransportationInfoForm />
                </InputGroup>
                {!inModal && (
                  <>
                    <InputGroup
                      title={t("vehicle.license_info_title")}
                      description={t("vehicle.license_info_description")}
                    >
                      <VehicleLicenseForm onFileChange={handleFileChange} />
                    </InputGroup>

                    <InputGroup
                      title={t("vehicle.driver_info_title")}
                      description={t("vehicle.driver_info_description")}
                    >
                      <div className="sm:col-span-3">
                        <Combobox
                          placement="top"
                          label={t("vehicle.driver")}
                          value={ensureString(values.driverId)}
                          items={driverOptions}
                          placeholder={isDriverOptionsLoading ? t("common.loading") : t("vehicle.select_driver")}
                          newButtonText={canNewDriver() ? t("vehicle.new_driver") : undefined}
                          onNewButtonClick={canNewDriver() ? handleToggleNewDriverModal : undefined}
                          emptyLabel={t("vehicle.none_select_label_driver")}
                          onChange={(value) => setFieldValue("driverId", value)}
                        />
                      </div>
                    </InputGroup>
                  </>
                )}

                {!inModal && (
                  <CustomField
                    variant="input-group"
                    title={t("custom_field.input_group_title")}
                    type={CustomFieldType.VEHICLE}
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
                <div className="mt-4 max-sm:px-4">{renderActionComponent(isSubmitting)}</div>
              )}
            </form>
          </Authorization>
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

      {/* New Driver Modal */}
      <NewDriverModal
        orgId={orgId}
        orgLink={orgLink}
        open={isNewDriverModalOpen}
        onClose={handleToggleNewDriverModal}
        onSubmit={handleNewDriverModalSubmit}
      />
    </>
  );
};

export default VehicleForm;
