"use client";

import { FormikHelpers, useFormik } from "formik";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createExpenseType, getExpenseType, updateExpenseType } from "@/actions/expenseType";
import { Checkbox } from "@/components/atoms";
import { Authorization, Button, InputGroup, PageHeader, RadioGroup, TextField } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { ExpenseTypeInputForm, expenseTypeInputFormSchema } from "@/forms/expenseType";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { expenseTypeAtom } from "@/states";
import { BreadcrumbItem } from "@/types";
import { ActionResult, HttpStatusCode } from "@/types/api";
import { ScreenMode } from "@/types/form";
import { ExpenseTypeInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { setItemString } from "@/utils/storage";
import { ensureString, slugifyString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: ExpenseTypeInputForm = {
  name: "",
  key: "",
  description: "",
  isActive: true,
  publicToCustomer: true,
  canDriverEdit: true,
  canDriverView: true,
};

export type ExpenseTypeFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const ExpenseTypeForm = ({ screenMode, id, orgLink, encryptedId }: ExpenseTypeFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [{ expenseTypeSearchQueryString }] = useAtom(expenseTypeAtom);
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const expenseTypeRef = useRef<ExpenseTypeInputForm>();
  const [isSelfInputKey, setIsSelfInputKey] = useState(false);

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const isActiveOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("expense_type.status_active") },
      { value: "false", label: t("expense_type.status_inactive") },
    ],
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
      { name: t("expense_type.title"), link: `${orgLink}/settings/expense-types${expenseTypeSearchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/settings/expense-types/new` });
    }
    if (editMode) {
      payload.push({
        name: expenseTypeRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/settings/expense-types/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseTypeRef.current?.name, orgLink]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a driver report form using Formik.
   *
   * @param {ExpenseTypeInputForm} values - The form values representing a driver report.
   * @param {FormikHelpers<ExpenseTypeInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles driver report creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: ExpenseTypeInputForm, formikHelpers: FormikHelpers<ExpenseTypeInputForm>) => {
      // Check if it's a new driver report or an update
      let result: ActionResult<ExpenseTypeInfo> | undefined;
      let existedField: string | undefined;
      if (newMode) {
        const { status, message, data } = await createExpenseType(values);
        result = { status, data };
        existedField = message;
      } else {
        const { status, message, data } = await updateExpenseType(values);
        result = { status, data };
        existedField = message;
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.status !== HttpStatusCode.Ok) {
        // Handle different error types
        let message = "";
        switch (result.status) {
          case HttpStatusCode.Existed:
            message = errorExists(`expense_type.${existedField}`);
            formikHelpers.setFieldError(`${existedField}`, message);
            return;
          case HttpStatusCode.Exclusive:
            message = t("common.message.save_error_exclusive", { name: values.name });
            break;
          default:
            message = t("common.message.save_error_unknown", { name: values.name });
            break;
        }

        // Show an error notification
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: message,
        });
      } else {
        // Show a success notification and navigate to the driver reports page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });

        setItemString(SESSION_FLASHING_ID, ensureString(result?.data?.id), {
          security: false,
        });
        router.push(`${orgLink}/settings/expense-types${expenseTypeSearchQueryString}`);
      }
    },
    [newMode, orgLink, showNotification, t, router, expenseTypeSearchQueryString]
  );

  const {
    values,
    touched,
    errors,
    dirty,
    isSubmitting,
    handleChange,
    handleSubmit,
    setValues,
    setFieldValue,
    resetForm,
  } = useFormik({
    initialValues: initialFormValues,
    validationSchema: expenseTypeInputFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * Fetching driver report data when in edit or copy mode.
   * If the data is found, it sets the driver report initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the driver reports settings page.
   */
  const fetchExpenseType = useCallback(async () => {
    if (!id) {
      return;
    }
    const result = await getExpenseType(id);
    const expenseTypeData = result?.data?.data;

    if (expenseTypeData) {
      resetForm({ values: expenseTypeData });
      expenseTypeRef.current = expenseTypeData;
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/settings/expense-types${expenseTypeSearchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching driver report data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchExpenseType();
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
   * Callback function for handling changes in the radio group.
   *
   * @param name - The name of the radio group.
   * @param item - The radio item that is selected.
   * @returns A callback function that handles the change event of the radio group.
   */
  const handleRadioChange = useCallback(
    (name: string) => (item: RadioItem) => setFieldValue(name, item.value === "true"),
    [setFieldValue]
  );

  /**
   * Handles the change event for the name input field.
   * Updates the `name` value in the state and optionally generates a `key`
   * based on the name if `isSelfInputKey` is false.
   */
  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const name = e.target.value;
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
   * @param {ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} e - The change event from the input field.
   */
  const handleKeyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setIsSelfInputKey(value ? true : false);
      setFieldValue("key", value);
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

  return (
    <Authorization showAccessDenied resource="expense-type" action={["new", "edit", "edit-own"]}>
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("expense_type.title")}
          description={t("expense_type.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />

        <div className="space-y-12">
          <InputGroup title={t("expense_type.general_title")} description={t("expense_type.general_description")}>
            <div className="sm:col-span-3">
              <TextField
                label={t("expense_type.name")}
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
                label={t("expense_type.key")}
                name="key"
                value={values.key}
                required
                maxLength={255}
                onChange={handleKeyChange}
                errorText={formatError(t, touched.key && errors.key)}
              />
            </div>
            <div className="col-span-full">
              <Checkbox
                label={t("expense_type.allow_customer_view")}
                checked={values.publicToCustomer ?? true}
                name="publicToCustomer"
                onChange={handleChange}
              />
            </div>
            <div className="col-span-full">
              <Checkbox
                label={t("expense_type.can_driver_view")}
                checked={values.canDriverView ?? true}
                name="canDriverView"
                onChange={handleChange}
              />
            </div>
            <div className="col-span-full">
              <Checkbox
                label={t("expense_type.can_driver_edit")}
                checked={values.canDriverEdit ?? true}
                name="canDriverEdit"
                onChange={handleChange}
              />
            </div>

            <div className="col-span-full">
              <TextField
                label={t("expense_type.description")}
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
                label={t("expense_type.status")}
                name="isActive"
                items={isActiveOptions}
                value={ensureString(values.isActive)}
                onChange={handleRadioChange("isActive")}
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

export default ExpenseTypeForm;
