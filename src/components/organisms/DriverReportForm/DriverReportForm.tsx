"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Authorization,
  Button,
  DriverReportDetailList,
  InputGroup,
  PageHeader,
  RadioGroup,
  TextField,
} from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { DriverReportDetailInputForm, DriverReportInputForm, driverReportInputFormSchema } from "@/forms/driverReport";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverReportState } from "@/redux/states";
import { getDriverReport } from "@/services/client/driverReport";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { ScreenMode } from "@/types/form";
import { DriverReportInfo } from "@/types/strapi";
import { post, put } from "@/utils/api";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { deleteProperties } from "@/utils/object";
import { setItemString } from "@/utils/storage";
import { ensureString, trim } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: DriverReportInputForm = {
  type: null,
  name: "",
  isRequired: false,
  photoRequired: false,
  billOfLadingRequired: false,
  isSystem: false,
  description: "",
  isActive: true,
  displayOrder: null,
};

export type DriverReportFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
  inModal?: boolean;
  onChange?: (newReports: DriverReportInputForm) => void;
  onClose?: () => void;
  driverReportSelected?: Partial<DriverReportInfo>;
  driverReportList?: Partial<DriverReportInfo>[];
};

const DriverReportForm = ({
  screenMode,
  id,
  orgId,
  orgLink,
  userId,
  encryptedId,
  inModal,
  onChange,
  onClose,
  driverReportSelected,
  driverReportList,
}: DriverReportFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { searchQueryString } = useDriverReportState();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const { canEdit, canEditOwn } = usePermission("driver-report");
  const [reportDetailList, setReportDetailList] = useState<DriverReportDetailInputForm[]>([]);
  const [awaitFetchData, setAwaitFetchData] = useState(true);
  const driverReportRef = useRef<DriverReportInputForm>();

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const isRequiredOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("driver_report.required") },
      { value: "false", label: t("driver_report.not_required") },
    ],
    [t]
  );

  const photoRequiredOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("driver_report.photo_required") },
      { value: "false", label: t("driver_report.photo_not_required") },
    ],
    [t]
  );

  const billOfLadingRequiredOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("driver_report.required") },
      { value: "false", label: t("driver_report.not_required") },
    ],
    [t]
  );

  const isActiveOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("driver_report.status_active") },
      { value: "false", label: t("driver_report.status_inactive") },
    ],
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    if (inModal) return;
    const payload: BreadcrumbItem[] = [
      { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
      { name: t("driver_report.title"), link: `${orgLink}/settings/driver-reports${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/settings/driver-reports/new` });
    }
    if (editMode) {
      payload.push({
        name: driverReportRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/settings/driver-reports/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverReportRef.current?.name, orgLink]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    if (inModal) {
      onClose?.();
    } else {
      router.back();
    }
  }, [inModal, onClose, router]);

  /**
   * Handles the submission of a driver report form using Formik.
   *
   * @param {DriverReportInputForm} values - The form values representing a driver report.
   * @param {FormikHelpers<DriverReportInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles driver report creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: DriverReportInputForm, formikHelpers: FormikHelpers<DriverReportInputForm>) => {
      // Check if it's a new driver report or an update
      if (inModal) {
        const isNameExist = driverReportList?.some(
          (report) => report.name?.trim() === values.name?.trim() && report.id !== values.id
        );
        if (!isNameExist) {
          const driverReportValues = { ...values, reportDetails: reportDetailList };
          onChange?.(driverReportValues);
          onClose?.();
        } else {
          formikHelpers.setFieldError("name", errorExists("driver_report.name"));
          return;
        }
      } else {
        let result: ApiResult<DriverReportInfo> | undefined;
        if (newMode) {
          const { status, code, data } = await post<ApiResult>(`/api${orgLink}/settings/driver-reports/new`, {
            ...trim(deleteProperties(values, ["id", "createdByUser", "updatedAt", "createdAt"])),
            reportDetails: reportDetailList,
          });
          result = { status, code, data };
        } else {
          if (driverReportRef.current?.id) {
            const { status, code, data } = await put<ApiResult>(
              `/api${orgLink}/settings/driver-reports/${encryptedId}/edit`,
              {
                ...trim(values),
                id: Number(values.id),
                reportDetails: reportDetailList,
              }
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
          switch (result.status) {
            case HttpStatusCode.Conflict:
              if (result.code === ErrorType.EXISTED) {
                message = errorExists("driver_report.name");
                formikHelpers.setFieldError("name", message);
                return;
              }
              if (result.code === ErrorType.EXCLUSIVE) {
                message = t("common.message.save_error_exclusive", { name: values.name });
              }
              break;
            case HttpStatusCode.InternalServerError:
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

          setItemString(SESSION_FLASHING_ID, ensureString(result.data), {
            security: false,
          });
          router.push(`${orgLink}/settings/driver-reports${searchQueryString}`);
        }
      }
    },
    [
      inModal,
      driverReportList,
      reportDetailList,
      onChange,
      onClose,
      newMode,
      orgLink,
      encryptedId,
      showNotification,
      t,
      router,
      searchQueryString,
    ]
  );

  const { values, touched, errors, dirty, isSubmitting, handleChange, handleSubmit, setFieldValue, resetForm } =
    useFormik({
      initialValues: initialFormValues,
      validationSchema: driverReportInputFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

  /**
   * Fetching driver report data when in edit or copy mode.
   * If the data is found, it sets the driver report initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the driver reports settings page.
   */
  const fetchDriverReport = useCallback(async () => {
    if (inModal && driverReportSelected) {
      const { reportDetails } = driverReportSelected;
      setReportDetailList(reportDetails as DriverReportDetailInputForm[]);
      resetForm({
        values: driverReportSelected,
      });
    } else {
      if (!id) {
        setAwaitFetchData(false);
        return;
      }
      const result = await getDriverReport(orgId, id);
      setAwaitFetchData(false);

      if (result) {
        const { reportDetails, ...report } = result;
        driverReportRef.current = report;
        setReportDetailList(reportDetails as DriverReportDetailInputForm[]);
        resetForm({
          values: {
            ...report,
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
          router.push(`${orgLink}/settings/driver-reports${searchQueryString}`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching driver report data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchDriverReport();
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
      if (inModal) {
        onClose?.();
      } else {
        router.back();
      }
    }
  }, [dirty, inModal, onClose, router]);

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
   * Callback function for handling changes in the driver report detail list.
   *
   * @param data - The new driver report detail list to set.
   */
  const handleDetailListChange = useCallback((data: DriverReportDetailInputForm[]) => {
    setReportDetailList(data);
  }, []);

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
      resource="driver-report"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(driverReportRef.current?.createdByUser?.id, userId)
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        {!inModal && (
          <PageHeader
            title={t("driver_report.title")}
            description={t("driver_report.title_description")}
            actionHorizontal
            actionComponent={actionComponent}
          />
        )}

        <div className="space-y-12">
          <InputGroup title={t("driver_report.general_title")} description={values.isSystem && values.description}>
            <div className="col-span-full">
              <TextField
                label={t("driver_report.name")}
                name="name"
                value={values.name}
                required
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
              />
            </div>
            {!values.isSystem && (
              <div className="col-span-full">
                <RadioGroup
                  label={t("driver_report.is_required")}
                  name="isRequired"
                  items={isRequiredOptions}
                  value={ensureString(values.isRequired)}
                  onChange={handleRadioChange("isRequired")}
                  helperText={t("driver_report.is_required_helper_text")}
                />
              </div>
            )}
            <div className="col-span-full">
              <RadioGroup
                label={t("driver_report.is_photo_required")}
                name="photoRequired"
                items={photoRequiredOptions}
                value={ensureString(values.photoRequired)}
                onChange={handleRadioChange("photoRequired")}
                helperText={t("driver_report.is_photo_required_helper_text")}
              />
            </div>
            <div className="col-span-full">
              <RadioGroup
                label={t("driver_report.is_bill_of_lading_required")}
                name="billOfLadingRequired"
                items={billOfLadingRequiredOptions}
                value={values.billOfLadingRequired ? ensureString(values.billOfLadingRequired) : "false"}
                onChange={handleRadioChange("billOfLadingRequired")}
                helperText={t("driver_report.is_bill_of_lading_required_helper_text")}
              />
            </div>
            {!values.isSystem && (
              <>
                <div className="col-span-full">
                  <TextField
                    label={t("driver_report.description")}
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
                    label={t("driver_report.status")}
                    name="isActive"
                    items={isActiveOptions}
                    value={ensureString(values.isActive)}
                    onChange={handleRadioChange("isActive")}
                  />
                </div>
              </>
            )}
          </InputGroup>

          <InputGroup
            title={t("driver_report.checklist_title")}
            description={t("driver_report.checklist_title_description")}
            showBorderBottom={!inModal}
          >
            <div className="col-span-full">
              <DriverReportDetailList data={reportDetailList} onChange={handleDetailListChange} />
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

export default DriverReportForm;
