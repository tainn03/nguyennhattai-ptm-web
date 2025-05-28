"use client";
import { CustomFieldDataType, CustomFieldType } from "@prisma/client";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as yup from "yup";

import {
  Authorization,
  BankAccountForm,
  Button,
  DriverContactForm,
  DriverContractForm,
  DriverLicenseForm,
  DriverPersonalInfoForm,
  InputGroup,
  PageHeader,
} from "@/components/molecules";
import { ConfirmModal, CustomField } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { DriverInputForm, driverInputFormSchema, DriverUpdateInputForm, initialFormValues } from "@/forms/driver";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverState } from "@/redux/states";
import { createDriver, getDriver, updateDriver } from "@/services/client/driver";
import { BreadcrumbItem, ErrorType, YubObjectSchema } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { MetaObject } from "@/types/customField";
import { ScreenMode } from "@/types/form";
import { DriverInfo } from "@/types/strapi";
import { CustomFieldInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { equalId } from "@/utils/number";
import { deleteProperties } from "@/utils/object";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists } from "@/utils/yup";

type DriverWithMeta = MetaObject<DriverInfo>;

export type DriverFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const DriverForm = ({ orgId, orgLink, userId, screenMode, id, encryptedId }: DriverFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useDriverState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [driverDetails, setDriverDetails] = useState<DriverInfo>();
  const { canEdit, canEditOwn } = usePermission("driver");
  const [isFetched, setIsFetched] = useState(false);
  const [isCustomFieldLoaded, setIsCustomFieldLoaded] = useState(false);

  const formikRef = useRef<FormikProps<DriverInputForm>>(null);
  const driverRef = useRef<DriverWithMeta>();

  const [validationSchema, setValidationSchema] = useState<YubObjectSchema<DriverInputForm>>(driverInputFormSchema);

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
      { name: t("driver.manage"), link: `${orgLink}/settings` },
      { name: t("driver.title"), link: `${orgLink}/drivers${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/drivers/new` });
    }
    if (editMode) {
      payload.push({
        name: getFullName(driverDetails?.firstName, driverDetails?.lastName) || ensureString(encryptedId),
        link: `${orgLink}/drivers/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverDetails?.firstName, driverDetails?.lastName, orgLink, searchQueryString]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a driver form using Formik.
   *
   * @param {DriverInputForm} values - The form values representing a driver.
   * @param {FormikHelpers<DriverInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles driver creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: DriverInputForm, formikHelpers: FormikHelpers<DriverInputForm>) => {
      // Check if it's a new driver or an update
      let result: ApiResult<number> | undefined;
      const customFields: CustomFieldInfo[] = (driverRef.current?.customFields || []) as CustomFieldInfo[];
      const processedValues = processingCustomField<DriverInputForm>(
        customFields,
        deleteProperties(values, ["createdByUser", "defaultUnit"])
      );

      if (newMode) {
        const { status, code, data } = await createDriver(orgLink, {
          ...processedValues,
        } as DriverInputForm);
        result = { status, code, data };
      } else {
        const { licenseFrontImage, licenseBackImage, contractDocuments } = values;
        if (driverDetails?.id) {
          const { status, code, data } = await updateDriver(
            orgLink,
            {
              ...processedValues,
              licenseFrontImage:
                licenseFrontImage?.name === driverDetails.licenseFrontImage?.name ? null : licenseFrontImage,
              licenseBackImage:
                licenseBackImage?.name === driverDetails.licenseBackImage?.name ? null : licenseBackImage,
              contractDocuments:
                contractDocuments?.name === driverDetails?.contractDocuments?.[0]?.name ? null : contractDocuments,
              lastUpdatedAt: driverDetails.updatedAt,
            } as DriverUpdateInputForm,
            encryptedId
          );

          result = { status, code, data };
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
            message = t("common.message.save_error_exclusive", { name: values.firstName });
            break;
          case ErrorType.EXISTED:
            formikHelpers.setFieldError("idNumber", errorExists("driver.id_number"));
            return;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: values.firstName });
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
        // Show a success notification and navigate to the drivers page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.firstName }),
        });
        setItemString(SESSION_FLASHING_ID, ensureString(result.data), {
          security: false,
        });
        router.push(`${orgLink}/drivers${searchQueryString}`);
      }
    },
    [
      driverDetails?.contractDocuments,
      driverDetails?.id,
      driverDetails?.licenseBackImage?.name,
      driverDetails?.licenseFrontImage?.name,
      driverDetails?.updatedAt,
      encryptedId,
      newMode,
      orgLink,
      router,
      searchQueryString,
      showNotification,
      t,
    ]
  );

  /**
   * Fetching driver data when in edit or copy mode.
   * If the data is found, it sets the driver initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the drivers settings page.
   */
  const fetchDriver = useCallback(async () => {
    if (!id && !copyMode && !editMode) {
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        driverRef.current?.customFields as CustomFieldInfo[],
        null
      );
      driverRef.current = { ...driverRef.current, ...customFieldMeta };
      formikRef.current?.resetForm({
        values: { ...initialFormValues, ...customFieldMeta, prevCustomFields: customFieldMetaFileList },
      });
      setIsFetched(true);
      return;
    }
    const result = await getDriver(orgId, Number(id));
    if (result) {
      const { address, licenseType, licenseFrontImage, licenseBackImage, contractDocuments, meta, ...otherProps } =
        result;
      // Handle get meta data for custom field
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        driverRef.current?.customFields as CustomFieldInfo[],
        meta
      );

      if (copyMode) {
        const customFields = (driverRef.current?.customFields || []) as CustomFieldInfo[];
        const fieldFiles = customFields.filter((field) => field.dataType === CustomFieldDataType.FILE);

        if (fieldFiles.length > 0) {
          fieldFiles.map((fieldFile) => {
            customFieldMeta[fieldFile.id] = null;
          });
        }
      }
      const driverData = {
        ...formikRef.current?.values,
        ...otherProps,
        ...(address && { address: { ...address, id: Number(address.id) } }),
        ...(licenseType && { licenseTypeId: licenseType.id }),
        ...(licenseFrontImage && editMode && { licenseFrontImageId: licenseFrontImage.id, licenseFrontImage }),
        ...(licenseBackImage && editMode && { licenseBackImageId: licenseBackImage.id, licenseBackImage }),
        ...((contractDocuments?.length ?? 0) > 0 &&
          editMode && {
            contractDocumentIds: contractDocuments?.[0]?.id,
            contractDocuments: contractDocuments?.[0],
          }),
        ...customFieldMeta,
        prevCustomFields: customFieldMetaFileList,
      };
      setDriverDetails((prev) => ({ ...prev, ...result, ...customFieldMeta }));
      driverRef.current = { ...driverRef.current, ...result, ...customFieldMeta };
      formikRef.current?.resetForm({
        values: driverData,
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/drivers${searchQueryString}`);
      }
    }
    setIsFetched(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching driver data when in edit or copy mode.
   */
  useEffect(() => {
    if (isCustomFieldLoaded) {
      fetchDriver();
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

  const actionComponent = useCallback(
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
   * Callback function to handle the loading of custom fields.
   *
   * @param schema - The YubObjectSchema of the customer input form.
   * @param customFields - An array of custom field information.
   */
  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<DriverInputForm>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }).concat(driverInputFormSchema));
      driverRef.current = { ...driverRef.current, customFields };
      setIsCustomFieldLoaded(true);
    },
    []
  );

  return (
    <Authorization
      showAccessDenied
      resource="driver"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        isFetched && editMode && !canEdit() && canEditOwn() && !equalId(driverDetails?.createdByUser?.id, userId)
      }
    >
      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmitFormik}
      >
        {({ values, isSubmitting, touched, errors, setFieldValue, handleSubmit }) => (
          <form method="POST" onSubmit={handleSubmit}>
            <PageHeader
              title={t("driver.title")}
              description={t("driver.title_description")}
              actionHorizontal
              actionComponent={actionComponent(isSubmitting)}
            />
            <div className="space-y-12">
              <InputGroup title={t("driver.general_title")} description={t("driver.general_description")}>
                <DriverPersonalInfoForm editMode={editMode} />
              </InputGroup>

              <InputGroup title={t("driver.contact_title")} description={t("driver.contact_description")}>
                <DriverContactForm />
              </InputGroup>

              <InputGroup title={t("driver.driver_license_title")} description={t("driver.driver_license_description")}>
                <DriverLicenseForm organizationId={orgId} mode={screenMode} />
              </InputGroup>
              <InputGroup title={t("driver.contract_title")} description={t("driver.contract_description")}>
                <DriverContractForm mode={screenMode} />
              </InputGroup>

              <InputGroup
                title={t("driver.bank_account_info_title")}
                description={t("driver.bank_account_info_description")}
              >
                <BankAccountForm
                  column="bankAccount"
                  values={values.bankAccount}
                  touched={touched}
                  errors={errors}
                  setFieldValue={setFieldValue}
                />
              </InputGroup>

              <CustomField
                variant="input-group"
                title={t("custom_field.input_group_title")}
                type={CustomFieldType.DRIVER}
                onLoaded={handleCustomFieldLoaded}
              />

              {/* <InputGroup
                title={newMode ? t("driver.link_new_account") : t("driver.link_account")}
                description={t("driver.link_account_description")}
              >
                <DriverLinkedAccountForm
                  organizationId={orgId}
                  linkedUserId={driverRef.current?.id}
                  mode={screenMode}
                />
              </InputGroup> */}
            </div>
            <div className="mt-4 max-sm:px-4">{actionComponent(isSubmitting)}</div>
          </form>
        )}
      </Formik>

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

export default DriverForm;
