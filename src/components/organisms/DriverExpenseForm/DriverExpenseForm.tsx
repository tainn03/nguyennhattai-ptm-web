"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, Authorization, Button, InputGroup, PageHeader, RadioGroup, TextField } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { DriverExpenseInputForm, driverExpenseInputFormSchema } from "@/forms/driverExpense";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverExpenseState } from "@/redux/states";
import { createDriverExpense, getDriverExpense, updateDriverExpense } from "@/services/client/driverExpense";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ScreenMode } from "@/types/form";
import { MutationResult } from "@/types/graphql";
import { DriverExpenseInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { setItemString } from "@/utils/storage";
import { ensureString, slugifyString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: DriverExpenseInputForm = {
  type: null,
  name: "",
  key: "",
  description: "",
  isSystem: false,
  isActive: true,
};

export type DriverExpenseFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const DriverExpenseForm = ({ screenMode, id, orgId, orgLink, userId, encryptedId }: DriverExpenseFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { searchQueryString } = useDriverExpenseState();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isSelfInputKey, setIsSelfInputKey] = useState(false);
  const { canEdit, canEditOwn } = usePermission("driver-expense");
  const [awaitFetchData, setAwaitFetchData] = useState(true);
  const driverExpenseRef = useRef<DriverExpenseInputForm>();

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const isActiveOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("driver_expense.status_active") },
      { value: "false", label: t("driver_expense.status_inactive") },
    ],
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
      { name: t("driver_expense.title"), link: `${orgLink}/settings/driver-expenses${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/settings/driver-expenses/new` });
    }
    if (editMode) {
      payload.push({
        name: driverExpenseRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/settings/driver-expenses/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverExpenseRef.current?.name, orgLink]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a driver report form using Formik.
   *
   * @param {DriverExpenseInputForm} values - The form values representing a driver report.
   * @param {FormikHelpers<DriverExpenseInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles driver report creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: DriverExpenseInputForm, formikHelpers: FormikHelpers<DriverExpenseInputForm>) => {
      // Check if it's a new driver report or an update
      let result: MutationResult<Partial<DriverExpenseInfo>> | undefined;
      if (newMode) {
        result = await createDriverExpense({ ...values, organizationId: orgId, createdById: userId });
      } else if (driverExpenseRef.current?.id) {
        result = await updateDriverExpense(
          { ...values, organizationId: orgId, id: driverExpenseRef.current.id, updatedById: userId },
          driverExpenseRef.current.updatedAt
        );
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.error) {
        // Handle different error types
        switch (result.error) {
          case ErrorType.EXISTED:
            if (result.data?.name) {
              formikHelpers.setFieldError("name", errorExists("driver_expense.name"));
              return;
            } else if (result.data?.key) {
              formikHelpers.setFieldError("key", errorExists("driver_expense.key"));
              return;
            }
            break;
          case ErrorType.UNKNOWN:
            // Show an error notification
            showNotification({
              color: "error",
              title: t("common.message.save_error_title"),
              message: t("common.message.save_error_unknown", { name: values.name }),
            });
            break;
        }
      } else {
        // Show a success notification and navigate to the driver reports page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });

        setItemString(SESSION_FLASHING_ID, ensureString(result.data), {
          security: false,
        });
        router.push(`${orgLink}/settings/driver-expenses${searchQueryString}`);
      }
    },
    [newMode, orgId, userId, showNotification, t, router, orgLink, searchQueryString]
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
    validationSchema: driverExpenseInputFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * Fetching driver report data when in edit or copy mode.
   * If the data is found, it sets the driver report initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the driver reports settings page.
   */
  const fetchDriverExpense = useCallback(async () => {
    if (!id) {
      setAwaitFetchData(false);
      return;
    }
    const result = await getDriverExpense(orgId, id);
    setAwaitFetchData(false);

    if (result) {
      driverExpenseRef.current = result;
      resetForm({
        values: {
          ...result,
          ...(copyMode && { isSystem: false, type: null }),
        },
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/settings/driver-expenses${searchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching driver report data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchDriverExpense();
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
   * This function handles the change event for the name input field.
   * The function gets the name from the event target value. If the form is in newMode, it slugifies the name and uses it as the key.
   * @param {ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} e - The change event from the name input field.
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
    <Authorization
      showAccessDenied
      resource="driver-expense"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(driverExpenseRef.current?.createdByUser?.id, userId)
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("driver_expense.title")}
          description={t("driver_expense.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />
        <div className="space-y-12">
          <InputGroup title={t("driver_expense.general_title")} description={values.isSystem && values.description}>
            {editMode && driverExpenseRef.current && driverExpenseRef.current.key !== values.key && (
              <div className="col-span-full">
                <Alert color="warning" title={t("driver_expense.warning_key_change")} />
              </div>
            )}
            <div className="sm:col-span-3">
              <TextField
                label={t("driver_expense.name")}
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
                label={t("driver_expense.key")}
                name="key"
                value={values.key}
                required
                maxLength={255}
                onChange={handleKeyChange}
                errorText={formatError(t, touched.key && errors.key)}
              />
            </div>
            <div className="col-span-full">
              <TextField
                label={t("driver_expense.description")}
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
                label={t("driver_expense.status")}
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

export default DriverExpenseForm;
