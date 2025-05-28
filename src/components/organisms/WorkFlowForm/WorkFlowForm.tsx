"use client";

import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createWorkFlow, getWorkflow, updateWorkFlow } from "@/actions/workflow";
import {
  Authorization,
  Button,
  DriverReportList,
  InputGroup,
  PageHeader,
  RadioGroup,
  TextField,
} from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { DriverReportInputForm } from "@/forms/driverReport";
import { WorkflowInputForm, workflowInputFormSchema } from "@/forms/workflow";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverReportState } from "@/redux/states";
import { organizationInitialValueFetcher } from "@/services/client/organizationInitialValue";
import { BreadcrumbItem } from "@/types";
import { ActionResult, HttpStatusCode } from "@/types/api";
import { ScreenMode } from "@/types/form";
import { DriverReportInfo, WorkflowInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { getClientTimezone } from "@/utils/date";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: WorkflowInputForm = {
  name: "",
  description: "",
  isActive: true,
  driverReports: [],
  clientTimeZone: "",
};

export type WorkFlowFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const WorkFlowForm = ({ screenMode, id, orgLink, encryptedId }: WorkFlowFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { searchQueryString } = useDriverReportState();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [driverReports, setDriverReports] = useState<DriverReportInfo[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDriverReports, setIsLoadingDriverReports] = useState(false);

  const driverReportRef = useRef<DriverReportInputForm>();
  const formikRef = useRef<FormikProps<WorkflowInputForm>>(null);

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const isActiveOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("driver_report.status_active") },
      { value: "false", label: t("driver_report.status_inactive") },
    ],
    [t]
  );

  /**
   * Fetching the initial driver reports data from the organizationInitialValueFetcher.
   * This function is called when the component mounts and when the screen mode is "NEW".
   */
  const fetchInitialDriverReports = useCallback(async () => {
    setIsLoadingDriverReports(true);
    const initialDriverReportData = await organizationInitialValueFetcher("DRIVER_REPORT");
    if (initialDriverReportData && Array.isArray(initialDriverReportData)) {
      const extractedData = initialDriverReportData.map((item) => JSON.parse(JSON.stringify(item.data)));
      setDriverReports(extractedData);
    }
    setIsLoadingDriverReports(false);
  }, []);

  const initialWorkflowValues: WorkflowInputForm = useMemo(() => {
    return {
      ...initialFormValues,
      driverReports: driverReports,
    };
  }, [driverReports]);

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
      { name: t("workflow.title"), link: `${orgLink}/settings/workflows${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/settings/workflows/new` });
    }
    if (editMode) {
      payload.push({
        name: t("workflow.export_goods_title"),
        link: `${orgLink}/settings/workflows/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverReportRef.current?.name, orgLink]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a driver report form using Formik.
   *
   * @param {DriverReportInputForm} values - The form values representing a driver report.
   * @param {FormikHelpers<DriverReportInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles driver report creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: WorkflowInputForm, formikHelpers: FormikHelpers<WorkflowInputForm>) => {
      setIsSubmitting(true);
      const clientTimeZone = getClientTimezone();
      // Check if it's a new driver report or an update
      let result: ActionResult<WorkflowInfo> | undefined;
      if (newMode) {
        const { status, data } = await createWorkFlow({ ...values, clientTimeZone, createdAt: new Date() });
        result = { status, data };
      } else {
        const { status, data } = await updateWorkFlow({ ...values, clientTimeZone, createdAt: new Date() });
        result = { status, data };
      }

      formikHelpers.setSubmitting(false);
      setIsSubmitting(false);
      if (!result) {
        return;
      }

      if (result.status !== HttpStatusCode.Ok) {
        // Handle different error types
        let message = "";
        switch (result.status) {
          case HttpStatusCode.Existed:
            message = errorExists("driver_report.name");
            formikHelpers.setFieldError("name", message);
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

        setItemString(SESSION_FLASHING_ID, ensureString(result.data?.id), {
          security: false,
        });
        router.push(`${orgLink}/settings/workflows${searchQueryString}`);
      }
    },
    [newMode, orgLink, showNotification, t, router, searchQueryString]
  );

  /**
   * Fetching driver report data when in edit or copy mode.
   * If the data is found, it sets the driver report initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the driver reports settings page.
   */
  const fetchWorkflow = useCallback(async () => {
    if (!id) {
      return;
    }
    const result = await getWorkflow(id);
    const workflowData = result?.data?.data;

    if (workflowData) {
      formikRef.current?.resetForm({
        values: { ...workflowData, clientTimeZone: getClientTimezone() },
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/settings/workflows${searchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching driver report data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchWorkflow();
    } else {
      fetchInitialDriverReports();
    }
  }, [copyMode, editMode, fetchInitialDriverReports, fetchWorkflow]);

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
   * Callback function for handling changes in the radio group.
   *
   * @param name - The name of the radio group.
   * @param item - The radio item that is selected.
   * @returns A callback function that handles the change event of the radio group.
   */
  const handleRadioChange = (name: string) => (item: RadioItem) => {
    if (formikRef.current) {
      formikRef.current.setFieldValue(name, item.value === "true");
    }
  };

  const actionComponent = (
    <div className="flex flex-row justify-end gap-x-4">
      <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
        {t("common.cancel")}
      </Button>
      <Button type="submit" loading={isSubmitting}>
        {t("common.save")}
      </Button>
    </div>
  );

  return (
    <>
      <Formik
        innerRef={formikRef}
        initialValues={initialWorkflowValues}
        validationSchema={workflowInputFormSchema}
        enableReinitialize
        onSubmit={handleSubmitFormik}
      >
        {({ values, touched, errors, handleChange, handleSubmit }) => (
          <Authorization showAccessDenied resource="driver-report" action={["new", "edit", "edit-own"]}>
            <form method="POST" onSubmit={handleSubmit}>
              <PageHeader
                title={t("workflow.title")}
                description={t("workflow.title_description")}
                actionHorizontal
                actionComponent={actionComponent}
              />

              <div className="space-y-12">
                <InputGroup title={t("workflow.general_title")} description={t("workflow.general_description")}>
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
                </InputGroup>

                <InputGroup
                  title={t("workflow.driver_report_title")}
                  description={t("workflow.driver_report_description")}
                >
                  <div className="col-span-full">
                    <DriverReportList isLoadingDriverReports={isLoadingDriverReports} />
                  </div>
                </InputGroup>
              </div>

              <div className="mt-4 max-sm:px-4">{actionComponent}</div>
            </form>
          </Authorization>
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
    </>
  );
};

export default WorkFlowForm;
