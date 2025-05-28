"use client";

import { CustomerType, CustomFieldDataType, CustomFieldType } from "@prisma/client";
import clsx from "clsx";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as yup from "yup";

import {
  Authorization,
  BankAccountForm,
  Button,
  Combobox,
  InputGroup,
  NumberField,
  PageHeader,
  RadioGroup,
  TextField,
} from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal, CustomField, NewUnitOfMeasureModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { CustomerInputForm, customerInputFormSchema } from "@/forms/customer";
import { usePermission, useUnitOfMeasureOptions } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useCustomerState } from "@/redux/states";
import { createCustomer, getCustomer, updateCustomer } from "@/services/client/customers";
import { BreadcrumbItem, ErrorType, YubObjectSchema } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { ScreenMode } from "@/types/form";
import { CustomFieldInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { equalId } from "@/utils/number";
import { deleteProperties } from "@/utils/object";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: CustomerInputForm = {
  code: "",
  name: "",
  taxCode: "",
  email: "",
  phoneNumber: "",
  website: "",
  businessAddress: "",
  isActive: true,
  contactName: "",
  contactPosition: "",
  contactEmail: "",
  contactPhoneNumber: "",
  bankAccountId: null,
  bankAccount: {
    accountNumber: "",
    holderName: "",
    bankName: "",
    bankBranch: "",
  },
};

export type CustomerFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const CustomerForm = ({ orgId, orgLink, userId, screenMode, id, encryptedId }: CustomerFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useCustomerState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isUnitOfMeasureModalOpen, setIsUnitOfMeasureModalOpen] = useState(false);
  const { canEdit, canEditOwn } = usePermission("customer");
  const [isFetched, setIsFetched] = useState(false);
  const [isCustomFieldLoaded, setIsCustomFieldLoaded] = useState(false);
  const { canNew: canNewUnit, canFind: canFindUnit } = usePermission("unit-of-measure");

  const isActiveOptions: RadioItem[] = [
    { value: "true", label: t("customer.status_active") },
    { value: "false", label: t("customer.status_inactive") },
  ];

  const customerRef = useRef<CustomerInputForm>();
  const formikRef = useRef<FormikProps<CustomerInputForm>>(null);
  const { unitOfMeasures, isLoading, mutate } = useUnitOfMeasureOptions({ organizationId: orgId });
  const [validationSchema, setValidationSchema] = useState<YubObjectSchema<CustomerInputForm>>(customerInputFormSchema);
  const unitOfMeasureOptions: ComboboxItem[] = useMemo(() => {
    const options: ComboboxItem[] = unitOfMeasures.map((item) => {
      return { label: item.code, subLabel: item.name, value: ensureString(item.id) };
    });

    return options;
  }, [unitOfMeasures]);

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
      { name: t("customer.manage"), link: orgLink },
      { name: t("customer.title"), link: `${orgLink}/customers${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/customers/new` });
    }
    if (editMode) {
      payload.push({
        name: customerRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/customers/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerRef.current, orgLink, searchQueryString]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handle the form submission using Formik for creating or updating a customer.
   *
   * @param values - Form values containing customer details and bank account information.
   * @param formikHelpers - Formik's form helper functions.
   */
  const handleSubmitFormik = useCallback(
    async (values: CustomerInputForm, formikHelpers: FormikHelpers<CustomerInputForm>) => {
      // Check if it's a new maintenance type or an update
      let result: ApiResult | undefined;
      const customFields: CustomFieldInfo[] = customerRef.current?.customFields as CustomFieldInfo[];
      const processedValues = processingCustomField<CustomerInputForm>(
        customFields as CustomFieldInfo[],
        deleteProperties(values, ["createdByUser", "defaultUnit"])
      );
      if (newMode) {
        result = await createCustomer(orgLink, {
          ...processedValues,
        });
      } else {
        if (customerRef.current?.id) {
          result = await updateCustomer(orgLink, encryptedId, {
            ...processedValues,
            lastUpdatedAt: customerRef.current?.updatedAt,
          });
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
          message: t("common.message.save_success_message", { name: values.name }),
        });
        setItemString(SESSION_FLASHING_ID, ensureString(result.data.id), {
          security: false,
        });
        router.push(`${orgLink}/customers${searchQueryString}`);
      } else {
        // Handle different error types
        let message = "";
        switch (result.message) {
          case `${ErrorType.EXISTED}-${values.code}`:
            formikHelpers.setFieldError("code", errorExists("customer.customer_code"));
            return;
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: values.name });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.error_unknown", { name: values.name });
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
    [encryptedId, newMode, orgLink, router, searchQueryString, showNotification, t]
  );

  /**
   * Fetch customer details from the server and populate the form with the retrieved data for editing.
   * Display an error notification if the data is not found or deleted.
   */
  const fetchCustomer = useCallback(async () => {
    if (!id && !copyMode && !editMode) {
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        customerRef.current?.customFields as CustomFieldInfo[],
        null
      );
      customerRef.current = { ...customerRef.current, ...customFieldMeta };
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

    const result = await getCustomer(orgId, Number(id));
    if (result) {
      const { id: customerId, meta, bankAccount, defaultUnit, ...otherProps } = result;
      // Handle get meta data for custom field
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        customerRef.current?.customFields as CustomFieldInfo[],
        meta
      );

      if (copyMode) {
        const customFields = customerRef.current?.customFields as CustomFieldInfo[];
        const fieldFiles = customFields.filter((field) => field.dataType === CustomFieldDataType.FILE);

        if (fieldFiles.length > 0) {
          fieldFiles.map((fieldFile) => {
            customFieldMeta[fieldFile.id] = null;
          });
        }
      }

      customerRef.current = { ...customerRef.current, ...result, ...customFieldMeta };

      // Set value of custom field in to formik form
      formikRef.current?.resetForm({
        values: {
          ...formikRef.current?.values,
          ...otherProps,
          bankAccountId: Number(bankAccount?.id),
          bankAccount: bankAccount,
          id: customerId,
          unitOfMeasureId: defaultUnit?.id,
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
      if (editMode) {
        router.push(`${orgLink}/customers${searchQueryString}`);
      }
    }

    if (customerRef.current?.type !== CustomerType.FIXED) {
      router.push(`${orgLink}/customers`);
    }
    setIsFetched(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching customer type data when in edit or copy mode.
   */
  useEffect(() => {
    if (isCustomFieldLoaded) {
      fetchCustomer();
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
  }, [formikRef.current?.dirty, t]);

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
   * Handle toggle the new unit of measure modal.
   */
  const toggleUnitOfMeasureModal = useCallback(() => {
    setIsUnitOfMeasureModalOpen((prev) => !prev);
  }, []);

  /**
   * Handle submitting the new unit of measure modal.
   *
   * @param {number} id - The id of the newly created unit of measure.
   */
  const handleNewUnitOfMeasureModalSubmit = useCallback(
    (id?: number) => {
      if (id) {
        formikRef.current?.setFieldValue("unitOfMeasureId", id);
        mutate();
        toggleUnitOfMeasureModal();
      }
    },
    [mutate, toggleUnitOfMeasureModal]
  );

  /**
   * Handle opening unit of measure management page.
   */
  const handleManageUnitOfMeasure = useCallback(() => {
    window.open(`${orgLink}/settings/unit-of-measures`, "_blank");
  }, [orgLink]);

  /**
   * Callback function to handle the loading of custom fields.
   *
   * @param schema - The YubObjectSchema of the customer input form.
   * @param customFields - An array of custom field information.
   */
  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<CustomerInputForm>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }).concat(customerInputFormSchema));
      customerRef.current = { ...customerRef.current, customFields };
      setIsCustomFieldLoaded(true);
    },
    []
  );

  return (
    <Authorization
      showAccessDenied
      resource="customer"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        isFetched && editMode && !canEdit() && canEditOwn() && !equalId(customerRef.current?.createdByUser?.id, userId)
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
              title={t("customer.feature")}
              description={t("customer.title_description")}
              actionHorizontal
              actionComponent={
                <div className="flex flex-row justify-end gap-x-4">
                  <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    {t("common.save")}
                  </Button>
                </div>
              }
            />
            <div className="space-y-12">
              <InputGroup title={t("customer.general_title")} description={t("customer.general_description")}>
                <div
                  className={clsx("sm:col-span-2", {
                    "sm:row-start-1": editMode,
                  })}
                >
                  <TextField
                    label={t("customer.customer_code")}
                    name="code"
                    type="text"
                    required
                    value={values.code ?? ""}
                    maxLength={20}
                    onChange={handleChange}
                    errorText={formatError(t, touched.code && errors.code)}
                  />
                </div>

                <div className="sm:col-span-4 sm:col-start-1">
                  <TextField
                    label={t("customer.customer_name")}
                    name="name"
                    value={values.name}
                    required
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.name && errors.name)}
                    helperText={t("customer.name_helper_text")}
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextField
                    label={t("customer.tax_code")}
                    name="taxCode"
                    value={values.taxCode ?? ""}
                    maxLength={20}
                    onChange={handleChange}
                    errorText={formatError(t, touched.taxCode && errors.taxCode)}
                  />
                </div>

                <div className="sm:col-span-3 sm:col-start-1">
                  <TextField
                    label={t("customer.email")}
                    name="email"
                    value={values.email ?? ""}
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.email && errors.email)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <TextField
                    label={t("customer.phone_number")}
                    name="phoneNumber"
                    value={values.phoneNumber ?? ""}
                    maxLength={20}
                    onChange={handleChange}
                    errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
                  />
                </div>

                <div className="col-span-full">
                  <TextField
                    label={t("customer.website")}
                    name="website"
                    value={values.website ?? ""}
                    maxLength={2048}
                    onChange={handleChange}
                    errorText={formatError(t, touched.website && errors.website)}
                  />
                </div>

                <div className="col-span-full">
                  <TextField
                    label={t("customer.address")}
                    name="businessAddress"
                    value={values.businessAddress ?? ""}
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.businessAddress && errors.businessAddress)}
                  />
                </div>

                <div className="col-span-full">
                  <RadioGroup
                    label={t("customer.status")}
                    name="status"
                    items={isActiveOptions}
                    value={values.isActive?.toString()}
                    onChange={(item) => setFieldValue("isActive", item.value === "true")}
                  />
                </div>
              </InputGroup>

              <InputGroup
                title={t("customer.representative_title")}
                description={t("customer.representative_description")}
              >
                <div className="sm:col-span-3">
                  <TextField
                    label={t("customer.representative_name")}
                    name="contactName"
                    value={values.contactName ?? ""}
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.contactName && errors.contactName)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <TextField
                    label={t("customer.representative_position")}
                    name="contactPosition"
                    value={values.contactPosition ?? ""}
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.contactPosition && errors.contactPosition)}
                  />
                </div>

                <div className="sm:col-span-3">
                  <TextField
                    label={t("customer.representative_email")}
                    name="contactEmail"
                    value={values.contactEmail ?? ""}
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.contactEmail && errors.contactEmail)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <TextField
                    label={t("customer.representative_phone")}
                    name="contactPhoneNumber"
                    value={values.contactPhoneNumber ?? ""}
                    maxLength={20}
                    onChange={handleChange}
                    errorText={formatError(t, touched.contactPhoneNumber && errors.contactPhoneNumber)}
                  />
                </div>
              </InputGroup>

              <InputGroup title={t("customer.payment_title")} description={t("customer.payment_description")}>
                <BankAccountForm
                  column="bankAccount"
                  values={values.bankAccount}
                  touched={touched}
                  errors={errors}
                  setFieldValue={setFieldValue}
                />
              </InputGroup>

              <InputGroup
                title="Chi phí khách hàng"
                description="Cấu hình chi phí rớt điểm theo khách hàng, bao gồm phí rớt điểm và số lượng rớt điểm miễn phí nếu có."
              >
                <div className="sm:col-span-3">
                  <NumberField label="Phí rớt điểm" name="dropoff-fee" />
                </div>
                <div className="sm:col-span-3">
                  <TextField label="Số lượng rớt điểm miễn phí" name="free-dropoff-amount" />
                </div>
              </InputGroup>

              <CustomField
                variant="input-group"
                title={t("custom_field.input_group_title")}
                type={CustomFieldType.CUSTOMER}
                onLoaded={handleCustomFieldLoaded}
              />

              <InputGroup title={t("customer.other_info_title")} description={t("customer.other_info_description")}>
                <div className="sm:col-span-3">
                  <Combobox
                    label={t("customer.default_unit")}
                    items={unitOfMeasureOptions}
                    value={ensureString(values.unitOfMeasureId)}
                    onChange={(value) => setFieldValue("unitOfMeasureId", value)}
                    loading={isLoading}
                    placeholder={t("customer.select_default_unit")}
                    newButtonText={canNewUnit() ? t("customer.new_default_unit") : undefined}
                    onNewButtonClick={canNewUnit() ? toggleUnitOfMeasureModal : undefined}
                    manageButtonText={canFindUnit() ? t("customer.manage_default_unit") : undefined}
                    onManageButtonClick={canFindUnit() ? handleManageUnitOfMeasure : undefined}
                    emptyLabel={t("customer.no_default_unit")}
                    placement="top"
                    helperText={t("customer.default_unit_helper_text")}
                  />
                </div>
              </InputGroup>
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

      {/* New Unit Of Measure Modal */}
      <NewUnitOfMeasureModal
        open={isUnitOfMeasureModalOpen}
        onClose={toggleUnitOfMeasureModal}
        onSubmit={handleNewUnitOfMeasureModalSubmit}
      />
    </Authorization>
  );
};

export default CustomerForm;
