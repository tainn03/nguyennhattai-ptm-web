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
  InputGroup,
  PageHeader,
  TextField,
  UploadInput,
} from "@/components/molecules";
import { RadioGroup } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal, CustomField } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import {
  initialFormValues,
  SubcontractorInputForm,
  subcontractorInputFormSchema,
  SubcontractorUpdateForm,
} from "@/forms/subcontractor";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useSubcontractorState } from "@/redux/states";
import { createSubcontractor, getSubcontractor, updateSubcontractor } from "@/services/client/subcontractor";
import { BreadcrumbItem, ErrorType, YubObjectSchema } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { MetaObject } from "@/types/customField";
import { UploadInputValue } from "@/types/file";
import { ScreenMode } from "@/types/form";
import { CustomFieldInfo, SubcontractorInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { equalId } from "@/utils/number";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

type SubcontractorWithMeta = MetaObject<SubcontractorInfo>;

export type SubcontractorFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const SubcontractorForm = ({ orgId, orgLink, userId, screenMode, id, encryptedId }: SubcontractorFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useSubcontractorState();

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const { canEdit, canEditOwn } = usePermission("subcontractor");
  const [deleteDocument, setDeleteDocument] = useState(false);
  const [isFetched, setIsFetched] = useState(false);
  const [isCustomFieldLoaded, setIsCustomFieldLoaded] = useState(false);

  const documentValue = useRef<UploadInputValue>();
  const subcontractorRef = useRef<SubcontractorWithMeta>();
  const formikRef = useRef<FormikProps<SubcontractorInputForm>>(null);
  const [validationSchema, setValidationSchema] =
    useState<YubObjectSchema<SubcontractorInputForm>>(subcontractorInputFormSchema);

  const isActiveOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("subcontractor.status_active") },
      { value: "false", label: t("subcontractor.status_inactive") },
    ],
    [t]
  );

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
      { name: t("subcontractor.management"), link: orgLink },
      { name: t("subcontractor.title"), link: `${orgLink}/subcontractors${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/subcontractors/new` });
    }
    if (editMode) {
      payload.push({
        name: subcontractorRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/subcontractors/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcontractorRef.current, orgLink, searchQueryString]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handle the form submission using Formik for creating or updating a customer.
   * Depending on the mode (new or edit), either a new customer is created or an existing one is updated.
   * Displays success or error notifications based on the result.
   *
   * @param values - Form values containing customer details and bank account information.
   * @param formikHelpers - Formik's form helper functions.
   */
  const handleSubmitFormik = useCallback(
    async (values: SubcontractorInputForm, formikHelpers: FormikHelpers<SubcontractorInputForm>) => {
      // Check if it's a new subcontractor or an update
      let result: ApiResult | undefined;
      const customFields: CustomFieldInfo[] = subcontractorRef.current?.customFields as CustomFieldInfo[];
      const processedValues = processingCustomField<SubcontractorWithMeta>(customFields, values);

      if (newMode) {
        result = await createSubcontractor(orgLink, {
          ...processedValues,
          document: documentValue?.current?.name,
          userId: values.user?.id,
        });
      } else {
        if (subcontractorRef.current?.id) {
          result = await updateSubcontractor(
            orgLink,
            {
              ...processedValues,
              userId: values.user?.id ? values.user?.id : values.userId,
              lastUpdatedAt: subcontractorRef.current?.updatedAt,
              deleteDocument,
              document:
                values?.documents?.[0] && values?.documents?.[0].name === documentValue?.current?.name
                  ? ""
                  : documentValue?.current?.name,
              oldDocumentId: values.documentsId ? values.documentsId : null,
              oldMemberUserId: values.userId ? values.userId : null,
            } as SubcontractorUpdateForm,
            encryptedId
          );
        }
      }
      formikHelpers.setSubmitting(false);

      if (!result) {
        return;
      }

      if (result.status === HttpStatusCode.Ok) {
        // Show a success notification and navigate to the subcontractor page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });
        setItemString(SESSION_FLASHING_ID, ensureString(result.data?.id), {
          security: false,
        });
        router.push(`${orgLink}/subcontractors${searchQueryString}`);
      } else {
        // Handle different error types
        let message = "";
        switch (result.message) {
          case `${ErrorType.EXISTED}-${values.code}`:
            message = errorExists("subcontractor.code");
            formikHelpers.setFieldError("code", message);
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
      }
    },
    [newMode, orgLink, encryptedId, deleteDocument, showNotification, t, router, searchQueryString]
  );

  /**
   * Fetch subcontractor details from the server and populate the form with the retrieved data for editing.
   * Display an error notification if the data is not found or deleted.
   */
  const fetchSubcontractor = useCallback(async () => {
    if (!id && !copyMode && !editMode) {
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        subcontractorRef.current?.customFields as CustomFieldInfo[],
        null
      );
      subcontractorRef.current = { ...subcontractorRef.current, ...customFieldMeta };
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

    const result = await getSubcontractor(orgId, Number(id));
    if (result) {
      const { meta, ...otherProps } = result;
      const document = otherProps.documents?.[0] || {};

      // Handle get meta data for custom field
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        subcontractorRef.current?.customFields as CustomFieldInfo[],
        meta
      );

      if (copyMode) {
        const customFields = (subcontractorRef.current?.customFields || []) as CustomFieldInfo[];
        const fieldFiles = customFields.filter((field) => field.dataType === CustomFieldDataType.FILE);

        if (fieldFiles.length > 0) {
          fieldFiles.map((fieldFile) => {
            customFieldMeta[fieldFile.id] = null;
          });
        }
      }

      subcontractorRef.current = { ...subcontractorRef.current, ...result, ...customFieldMeta };
      formikRef.current?.resetForm({
        values: {
          ...formikRef.current?.values,
          ...otherProps,
          documentsId: document?.id,
          userId: result.user?.id,
          ...customFieldMeta,
          prevCustomFields: customFieldMetaFileList,
        },
      });

      if (!copyMode && (otherProps.documents ?? [])?.length > 0) {
        documentValue.current = {
          id: document.id,
          name: document.name ?? "",
          url: document.name ?? "",
        };
      }
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/subcontractors${searchQueryString}`);
      }
    }

    setIsFetched(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching customer type data when in edit or copy mode.
   */
  useEffect(() => {
    if (isCustomFieldLoaded) {
      fetchSubcontractor();
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
        event.returnValue = t("common.confirmation.cancel_message");
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
   * Handle changes when a file is uploaded. It updates the document value.
   *
   * @param file - The uploaded file, if available.
   */
  const handleUploadFileChange = useCallback((file?: UploadInputValue) => {
    if (file) {
      documentValue.current = {
        id: documentValue?.current?.id,
        name: file.name,
        url: file.url,
      };
    } else {
      setDeleteDocument(true);
      documentValue.current = {
        id: documentValue?.current?.id,
        name: "",
        url: "",
      };
    }
  }, []);

  /**
   * Callback function to handle the loading of custom fields.
   *
   * @param schema - The YubObjectSchema of the customer input form.
   * @param customFields - An array of custom field information.
   */
  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<SubcontractorInputForm>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }).concat(subcontractorInputFormSchema));
      subcontractorRef.current = { ...subcontractorRef.current, customFields };
      setIsCustomFieldLoaded(true);
    },
    []
  );

  return (
    <Authorization
      showAccessDenied
      resource="subcontractor"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        isFetched &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(subcontractorRef.current?.createdByUser?.id, userId)
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
            <PageHeader
              title={t("subcontractor.feature")}
              description={t("subcontractor.title_description")}
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
            <div className="space-y-12">
              <InputGroup title={t("subcontractor.general_title")} description={t("subcontractor.general_description")}>
                <div className="col-span-full">
                  <TextField
                    label={t("subcontractor.code")}
                    name="code"
                    value={ensureString(values.code)}
                    maxLength={20}
                    onChange={handleChange}
                    errorText={formatError(t, touched.code && errors.code)}
                    required
                  />
                </div>
                <div className="sm:col-span-4">
                  <TextField
                    label={t("subcontractor.subcontractor_name")}
                    name="name"
                    value={ensureString(values.name)}
                    required
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.name && errors.name)}
                    helperText={t("subcontractor.name_helper_text")}
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextField
                    label={t("subcontractor.tax_code")}
                    name="taxCode"
                    value={ensureString(values.taxCode)}
                    maxLength={20}
                    onChange={handleChange}
                    errorText={formatError(t, touched.taxCode && errors.taxCode)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <TextField
                    label={t("subcontractor.email_address")}
                    name="email"
                    value={ensureString(values.email)}
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.email && errors.email)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <TextField
                    label={t("subcontractor.phone_number")}
                    name="phoneNumber"
                    value={ensureString(values.phoneNumber)}
                    maxLength={20}
                    onChange={handleChange}
                    errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
                  />
                </div>
                <div className="col-span-full">
                  <TextField
                    label={t("subcontractor.website")}
                    name="website"
                    value={ensureString(values.website)}
                    maxLength={2048}
                    onChange={handleChange}
                    errorText={formatError(t, touched.website && errors.website)}
                  />
                </div>
                <div className="col-span-full">
                  <TextField
                    label={t("subcontractor.address")}
                    name="businessAddress"
                    value={ensureString(values.businessAddress)}
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.businessAddress && errors.businessAddress)}
                  />
                </div>
                <div className="col-span-full">
                  <UploadInput
                    uploadLabel={t("components.upload_file.upload_document")}
                    label={t("subcontractor.document")}
                    type="SUBCONTRACTOR_DOCUMENT"
                    onChange={handleUploadFileChange}
                    value={documentValue.current}
                    showPreview
                  />
                </div>
                <div className="col-span-full">
                  <TextField
                    label={t("subcontractor.description")}
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
                    label={t("subcontractor.status")}
                    name="status"
                    items={isActiveOptions}
                    value={ensureString(values.isActive)}
                    onChange={(item) => setFieldValue("isActive", item.value === "true")}
                  />
                </div>
              </InputGroup>

              <InputGroup title={t("subcontractor.payment_title")} description={t("subcontractor.payment_description")}>
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
                type={CustomFieldType.SUBCONTRACTOR}
                onLoaded={handleCustomFieldLoaded}
              />
            </div>

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

export default SubcontractorForm;
