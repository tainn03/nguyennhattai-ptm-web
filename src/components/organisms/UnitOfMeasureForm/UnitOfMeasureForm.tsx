"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Authorization, Button, InputGroup, PageHeader, RadioGroup, TextField } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { UnitOfMeasureInputForm, unitOfMeasureInputFormSchema } from "@/forms/unitOfMeasure";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useUnitOfMeasureState } from "@/redux/states";
import { createUnitOfMeasure, getUnitOfMeasure, updateUnitOfMeasure } from "@/services/client/unitOfMeasure";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ScreenMode } from "@/types/form";
import { MutationResult } from "@/types/graphql";
import { UnitOfMeasureInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: UnitOfMeasureInputForm = {
  code: "",
  name: "",
  description: "",
  isActive: true,
};

type UnitOfMeasureFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const UnitOfMeasureForm = ({ orgId, orgLink, userId, screenMode, id, encryptedId }: UnitOfMeasureFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useUnitOfMeasureState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const { canEdit, canEditOwn } = usePermission("unit-of-measure");
  const [awaitFetchData, setAwaitFetchData] = useState(true);
  const unitOfMeasureRef = useRef<UnitOfMeasureInfo>();

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const statusOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("unit_of_measure.status_active") },
      { value: "false", label: t("unit_of_measure.status_inactive") },
    ],
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
      { name: t("unit_of_measure.title"), link: `${orgLink}/settings/unit-of-measures${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/settings/unit-of-measures/new` });
    }
    if (editMode) {
      payload.push({
        name: unitOfMeasureRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/settings/unit-of-measures/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgLink, unitOfMeasureRef.current, searchQueryString]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a unit of measure form using Formik.
   *
   * @param {UnitOfMeasureInputForm} values - The form values representing a unit of measure.
   * @param {FormikHelpers<UnitOfMeasureInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles unit of measure creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: UnitOfMeasureInputForm, formikHelpers: FormikHelpers<UnitOfMeasureInputForm>) => {
      // Check if it's a new unit of measure or an update
      let result: MutationResult<UnitOfMeasureInfo> | undefined;
      if (newMode) {
        result = await createUnitOfMeasure({
          ...(values as UnitOfMeasureInfo),
          organizationId: orgId,
          createdById: userId,
        });
      } else {
        if (unitOfMeasureRef.current?.id) {
          result = await updateUnitOfMeasure(
            {
              ...(values as UnitOfMeasureInfo),
              organizationId: orgId,
              id: Number(unitOfMeasureRef.current.id),
              updatedById: userId,
            },
            unitOfMeasureRef.current.updatedAt
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
            message = errorExists("unit_of_measure.name");
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
        // Show a success notification and navigate to the unit of measures page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });
        setItemString(SESSION_FLASHING_ID, ensureString(result.data?.id), {
          security: false,
        });
        router.push(`${orgLink}/settings/unit-of-measures${searchQueryString}`);
      }
    },
    [newMode, orgId, orgLink, router, searchQueryString, showNotification, t, userId]
  );

  const { values, touched, errors, dirty, isSubmitting, handleChange, handleSubmit, setFieldValue, resetForm } =
    useFormik({
      initialValues: initialFormValues,
      validationSchema: unitOfMeasureInputFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

  /**
   * Fetching unit of measure data when in edit or copy mode.
   * If the data is found, it sets the unit of measure initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the unit of measures settings page.
   */
  const fetchUnitOfMeasure = useCallback(async () => {
    if (!id) {
      setAwaitFetchData(false);
      return;
    }
    const result = await getUnitOfMeasure(orgId, id);
    setAwaitFetchData(false);

    if (result) {
      unitOfMeasureRef.current = result;
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
        router.push(`${orgLink}/settings/unit-of-measures${searchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching unit of measure data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchUnitOfMeasure();
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
      resource="unit-of-measure"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(unitOfMeasureRef.current?.createdByUser?.id, userId)
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("unit_of_measure.title")}
          description={t("unit_of_measure.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />

        <div className="space-y-12">
          <InputGroup title={t("unit_of_measure.general_title")} description={t("unit_of_measure.general_description")}>
            <div className="sm:col-span-4">
              <TextField
                label={t("unit_of_measure.name")}
                name="name"
                value={values.name}
                required
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                label={t("unit_of_measure.code")}
                name="code"
                value={values.code}
                required
                maxLength={20}
                onChange={handleChange}
                errorText={formatError(t, touched.code && errors.code)}
              />
            </div>

            <div className="col-span-full">
              <TextField
                label={t("unit_of_measure.description")}
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
                label={t("unit_of_measure.status")}
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

export default UnitOfMeasureForm;
