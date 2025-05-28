"use client";

import { CustomFieldDataType, CustomFieldType } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Checkbox } from "@/components/atoms";
import {
  Authorization,
  Button,
  InputGroup,
  NumberField,
  PageHeader,
  RadioGroup,
  Select,
  TextField,
} from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { SelectItem } from "@/components/molecules/Select/Select";
import { ConfirmModal } from "@/components/organisms";
import { CUSTOM_FIELD_DATA_TYPE, CUSTOM_FIELD_TYPE } from "@/constants/custom-fields";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { CustomFieldInputForm, customFieldInputFormSchema } from "@/forms/customField";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useCustomFieldState } from "@/redux/states";
import { createCustomField, getCustomField, updateCustomField } from "@/services/client/customField";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ScreenMode } from "@/types/form";
import { MutationResult } from "@/types/graphql";
import { CustomFieldInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { setItemString } from "@/utils/storage";
import { ensureString, slugifyString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: CustomFieldInputForm = {
  type: CustomFieldType.CUSTOMER,
  dataType: CustomFieldDataType.TEXT,
  name: "",
  key: "",
  value: "",
  description: "",
  validationRegex: "",
  displayOrder: 1,
  isActive: true,
  isRequired: false,
  canViewByDriver: false,
  canEditByDriver: false,
};

export type CustomFieldInputFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const CustomFieldForm = ({ orgId, orgLink, userId, screenMode, id, encryptedId }: CustomFieldInputFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useCustomFieldState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const { canNew, canEdit, canEditOwn } = usePermission("custom-field");
  const customFieldRef = useRef<CustomFieldInfo>();
  const [isSelfInputKey, setIsSelfInputKey] = useState(false);

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const statusOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("custom_field.status_active") },
      { value: "false", label: t("custom_field.status_inactive") },
    ],
    [t]
  );

  const requiredOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("custom_field.required") },
      { value: "false", label: t("custom_field.not_required") },
    ],
    [t]
  );

  const customFieldTypeOptions: SelectItem[] = useMemo(
    () => CUSTOM_FIELD_TYPE.map((item) => ({ ...item, label: t(item.label) })),
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
      { name: t("custom_field.title"), link: `${orgLink}/settings/custom-fields${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/settings/custom-fields/new` });
    }
    if (editMode) {
      payload.push({
        name: customFieldRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/settings/custom-fields/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFieldRef.current, orgLink, searchQueryString]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const formatCustomFieldValues = useCallback((values: string) => {
    if (!values) return;
    const lines = values.split("\n");
    const trimmedLines = lines.map((line) => line.trim()); // Trim each line
    return trimmedLines.join("\n"); // Join the trimmed lines back into a string
  }, []);

  /**
   * Handles the submission of a custom field form using Formik.
   *
   * @param {CustomFieldInputForm} values - The form values representing a custom fields.
   * @param {FormikHelpers<CustomFieldInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles custom fields creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: CustomFieldInputForm, formikHelpers: FormikHelpers<CustomFieldInputForm>) => {
      // Check if it's a new custom field or an update
      let result: MutationResult<CustomFieldInfo> | undefined;

      // Check value min
      if (!values.min && values.min !== 0) {
        values.min = null;
      }
      // Check value max
      if (!values.max && values.min !== 0) {
        values.max = null;
      }

      // Format value custom field before save to database
      if (values.dataType === CustomFieldDataType.CHOICE && values.value) {
        values.value = formatCustomFieldValues(values.value);
      }

      if (newMode) {
        result = await createCustomField({
          ...(values as CustomFieldInfo),
          organizationId: orgId,
          createdById: userId,
        });
      } else {
        if (customFieldRef.current?.id) {
          result = await updateCustomField(
            {
              ...(values as CustomFieldInfo),
              organizationId: orgId,
              id: Number(customFieldRef.current.id),
              updatedById: userId,
            },
            customFieldRef.current?.updatedAt
          );
        }
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.error) {
        // Handle different error types
        let message = "";
        switch (result.error) {
          case ErrorType.EXISTED:
            if (result.errorField === values.type) {
              message = errorExists("custom_field.field_name");
              formikHelpers.setFieldError("name", message);
            } else {
              if (result.errorField === values.key) {
                message = errorExists("custom_field.key");
                formikHelpers.setFieldError("key", message);
              }
            }
            return;
          case ErrorType.EXCLUSIVE:
            t("common.message.save_error_exclusive", { name: values.name });
            break;
          case ErrorType.UNKNOWN:
            t("common.message.save_error_unknown", { name: values.name });
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
        // Show a success notification and navigate to the custom fields page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });
        setItemString(SESSION_FLASHING_ID, ensureString(result.data?.id), {
          security: false,
        });
        router.push(`${orgLink}/settings/custom-fields${searchQueryString}`);
      }
    },
    [formatCustomFieldValues, newMode, orgId, orgLink, router, searchQueryString, showNotification, t, userId]
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
    setValues,
  } = useFormik({
    initialValues: initialFormValues,
    validationSchema: customFieldInputFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * Fetching custom fields data when in edit or copy mode.
   * If the data is found, it sets the custom fields initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the custom fieldss settings page.
   */
  const fetchCustomField = useCallback(async () => {
    if (!id) {
      return;
    }
    const result = await getCustomField(orgId, Number(id));
    if (result) {
      customFieldRef.current = result;
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
        router.push(`${orgLink}/settings/custom-fields${searchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching custom fields data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchCustomField();
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
  }, [dirty, t]);

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
  const handleRadioChange = useCallback(
    (name: string) => (item: RadioItem) => {
      setFieldValue(name, item.value === "true");
    },
    [setFieldValue]
  );

  /**
   * Handles changes to the "type" field in the form by setting the selected radio item's value as the new "type" field value.
   *
   * @param {string} value - The value of the selected radio item.
   */
  const handleFieldTypeChange = useCallback(
    (value: string) => {
      setFieldValue("type", value);
    },
    [setFieldValue]
  );

  /**
   * Handles changes to the "dataType" field in the form by setting the selected radio item's value as the new "dataType" field value.
   *
   * @param {string} value - The value of the selected radio item.
   */
  const handleDataFieldTypeChange = useCallback(
    (value: string) => {
      setFieldValue("dataType", value);
    },
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

  const inputValidationComponent = useMemo(
    () => (
      <InputGroup title={t("custom_field.validation_title")} description={t("custom_field.validation_description")}>
        {(values.dataType === CustomFieldDataType.TEXT || values.dataType === CustomFieldDataType.NUMBER) && (
          <>
            <div className="sm:col-span-2">
              <NumberField
                label={
                  values.dataType === CustomFieldDataType.NUMBER
                    ? t("custom_field.min_value")
                    : t("custom_field.min_length")
                }
                name="min"
                value={values.min}
                onChange={handleChange}
                errorText={formatError(t, touched.min && errors.min)}
              />
            </div>

            <div className="sm:col-span-2">
              <NumberField
                label={
                  values.dataType === CustomFieldDataType.NUMBER
                    ? t("custom_field.max_value")
                    : t("custom_field.max_length")
                }
                name="max"
                value={values.max}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.max && errors.max)}
              />
            </div>
          </>
        )}

        <div className="col-span-full">
          <RadioGroup
            label={t("custom_field.is_required")}
            name="isRequired"
            items={requiredOptions}
            value={ensureString(values.isRequired)}
            onChange={handleRadioChange("isRequired")}
          />
        </div>

        {(values.dataType === CustomFieldDataType.TEXT || values.dataType === CustomFieldDataType.EMAIL) && (
          <div className="col-span-full">
            <TextField
              label={t("custom_field.regex")}
              name="validationRegex"
              value={values.validationRegex as string}
              maxLength={255}
              onChange={handleChange}
              helperText={t("custom_field.regex_helper_text")}
              errorText={formatError(t, touched.validationRegex && errors.validationRegex)}
            />
          </div>
        )}
      </InputGroup>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, touched, errors]
  );

  /**
   * This function handles the change event for the name input field.
   * The function gets the name from the event target value. If the form is in newMode, it slugifies the name and uses it as the key.
   * @param {ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} event - The change event from the name input field.
   */
  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const name = event.target.value;
      let key = "";
      if (!isSelfInputKey) {
        // Generate key by name
        key = slugifyString(name, { separator: "_" });
      }

      setValues({
        ...values,
        name,
        ...(key && { key }),
      });
    },
    [isSelfInputKey, setValues, values]
  );

  /**
   * This function handles the change event for the input field.
   * @param {ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} event - The change event from the input field.
   */
  const handleKeyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setIsSelfInputKey(value ? true : false);
      setFieldValue("key", value);
    },
    [setFieldValue]
  );

  return (
    <Authorization
      alwaysAuthorized={
        (newMode && canNew()) ||
        (editMode && canEdit()) ||
        (editMode && canEditOwn() && equalId(customFieldRef.current?.createdByUser.id, userId))
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("custom_field.title")}
          description={t("custom_field.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />
        <div className="space-y-12">
          <InputGroup title={t("custom_field.general_title")} description={t("custom_field.general_description")}>
            <div className="sm:col-span-2">
              <Select
                label={t("custom_field.feature")}
                items={customFieldTypeOptions}
                value={values.type}
                onChange={(value: string) => {
                  handleFieldTypeChange(value);
                }}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Select
                label={t("custom_field.data_type")}
                items={CUSTOM_FIELD_DATA_TYPE}
                value={values.dataType}
                onChange={handleDataFieldTypeChange}
                required
              />
            </div>

            <div className="sm:col-span-3 sm:col-start-1">
              <TextField
                label={t("custom_field.field_name")}
                name="name"
                value={values.name}
                required
                maxLength={255}
                onChange={handleNameChange}
                errorText={formatError(t, touched.name && errors.name)}
              />
            </div>

            <div className="sm:col-span-3">
              <TextField
                label={t("custom_field.key")}
                name="key"
                value={values.key}
                required
                maxLength={255}
                onChange={handleKeyChange}
                errorText={formatError(t, touched.key && errors.key)}
              />
            </div>

            {values.type === CustomFieldType.ORDER_TRIP && (
              <>
                <div className="sm:col-span-3">
                  <Checkbox
                    label={t("custom_field.can_view_by_driver")}
                    name="canViewByDriver"
                    checked={values.canViewByDriver ?? false}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-span-3 sm:col-start-1">
                  <Checkbox
                    label={t("custom_field.can_edit_by_driver")}
                    name="canEditByDriver"
                    checked={values.canEditByDriver ?? false}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {values.dataType === CustomFieldDataType.CHOICE && (
              <div className="col-span-full whitespace-break-spaces">
                <TextField
                  label={t("custom_field.value")}
                  name="value"
                  value={values.value as string}
                  multiline
                  required
                  rows={4}
                  maxLength={500}
                  showCount
                  onChange={handleChange}
                  helperText={t("custom_field.choice_helper_text")}
                  errorText={formatError(t, touched.value && errors.value)}
                />
              </div>
            )}

            <div className="col-span-full">
              <TextField
                label={t("custom_field.description")}
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

            <div className="col-span-2">
              <NumberField
                label={t("custom_field.display_order")}
                name="displayOrder"
                value={values.displayOrder}
                onChange={handleChange}
                errorText={formatError(t, touched.displayOrder && errors.displayOrder)}
              />
            </div>

            <div className="col-span-full">
              <RadioGroup
                label={t("custom_field.status")}
                name="status"
                items={statusOptions}
                value={ensureString(values.isActive)}
                onChange={handleRadioChange("isActive")}
              />
            </div>
          </InputGroup>

          {values.dataType !== CustomFieldDataType.BOOLEAN && inputValidationComponent}
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

export default CustomFieldForm;
