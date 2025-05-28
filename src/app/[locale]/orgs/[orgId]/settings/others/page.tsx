"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Button, Combobox, InputGroup, PageHeader } from "@/components/molecules";
import { SelectItem } from "@/components/molecules/Select/Select";
import {
  OrganizationSettingSalaryNoticeStepInputForm as InputForm,
  organizationSettingSalaryNoticeStepInputFormSchema as inputFormSchema,
} from "@/forms/organizationSetting";
import { useDriverReportsTripStatus, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import {
  getOrganizationSalaryNoticeStepSetting,
  updateOrganizationSalaryNoticeStepSetting,
} from "@/services/client/organizationSetting";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { OrganizationSettingInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: InputForm = {
  salaryNoticeStepId: null,
};

export default withOrg(
  ({ orgLink, orgId }) => {
    const t = useTranslations();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { driverReports, isLoading } = useDriverReportsTripStatus({ organizationId: orgId });
    const { canEdit } = usePermission("setting-others");

    const currentSettingRef = useRef<OrganizationSettingInfo>();

    const driverReportOptions: SelectItem[] = useMemo(
      () => driverReports.map((item) => ({ label: item.name, value: ensureString(item.id) })),
      [driverReports]
    );

    /**
     * Sets breadcrumb links for general organization settings and the order code section.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("org_setting_others.title"), link: `${orgLink}/settings/others` },
      ]);

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Fetches and sets the organization's driver salary notification step setting.
     */
    const fetchOrganizationSalaryNoticeStepSetting = useCallback(async () => {
      // Fetch the organization organization's driver salary notification step setting
      const result = await getOrganizationSalaryNoticeStepSetting({ organizationId: orgId });

      if (result) {
        currentSettingRef.current = result;
        if (result.salaryNoticeStep?.id) {
          // Reset the form with fetched values
          resetForm({
            values: {
              salaryNoticeStepId: Number(result.salaryNoticeStep.id),
            },
          });
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Handles the form submission for organization's driver salary notification step settings.
     *
     * @param {InputForm} values - Form values.
     * @param {FormikHelpers<InputForm>} formikHelpers - Formik helpers.
     */
    const handleSubmitFormik = useCallback(
      async (values: InputForm, formikHelpers: FormikHelpers<InputForm>) => {
        let result: MutationResult<OrganizationSettingInfo> | undefined;

        if (currentSettingRef.current?.id) {
          const { salaryNoticeStepId } = values;
          // Update organization's driver salary notification step setting
          result = await updateOrganizationSalaryNoticeStepSetting(
            {
              organizationId: Number(orgId),
              id: currentSettingRef.current.id,
              salaryNoticeStepId,
            },
            currentSettingRef.current.updatedAt
          );
        }

        await fetchOrganizationSalaryNoticeStepSetting();
        formikHelpers.setSubmitting(false);
        if (!result) {
          return;
        }

        if (result.error) {
          let message = "";
          // Handle different result scenarios
          switch (result.error) {
            case ErrorType.EXCLUSIVE:
              message = t("common.message.save_error_exclusive", { name: t("org_setting_others.feature") });
              break;
            case ErrorType.UNKNOWN:
              message = t("common.message.save_error_unknown", { name: t("org_setting_others.feature") });
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
          // Show a success notification
          showNotification({
            color: "success",
            title: t("common.message.save_success_title"),
            message: t("common.message.save_success_message", { name: t("org_setting_others.feature") }),
          });
        }
      },
      [fetchOrganizationSalaryNoticeStepSetting, orgId, showNotification, t]
    );

    const { values, touched, errors, isSubmitting, handleSubmit, setFieldValue, resetForm } = useFormik({
      initialValues: initialFormValues,
      validationSchema: inputFormSchema,
      onSubmit: handleSubmitFormik,
    });

    /**
     * Handle change salary notice step id
     * @param value Value of salary notice step id to change
     */
    const handleChange = useCallback(
      (value: string) => {
        setFieldValue("salaryNoticeStepId", value ? Number(value) : null);
      },
      [setFieldValue]
    );

    useEffect(() => {
      // Fetch the organization organization's driver salary notification step setting on component mount
      fetchOrganizationSalaryNoticeStepSetting();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Memoized action component for a form.
     * Displays a submit button with loading state.
     *
     * @type {JSX.Element} The memoized JSX element.
     */
    const actionComponent = useMemo(
      () => (
        <Button type="submit" loading={isSubmitting}>
          {t("common.save")}
        </Button>
      ),
      [isSubmitting, t]
    );

    return (
      <>
        <form method="POST" onSubmit={handleSubmit}>
          <PageHeader
            title={t("org_setting_others.title")}
            description={t("org_setting_others.description")}
            actionHorizontal
            actionComponent={canEdit() ? actionComponent : undefined}
          />
          <div className="space-y-12">
            <InputGroup
              title={t("org_setting_others.inform_status.title")}
              description={t("org_setting_others.inform_status.description")}
            >
              <div className="sm:col-span-3">
                <Combobox
                  emptyLabel={t("org_setting_others.inform_status.not_inform")}
                  label={t("org_setting_others.inform_status.title")}
                  placeholder={isLoading ? t("common.loading") : t("org_setting_others.inform_status.choose_status")}
                  items={driverReportOptions}
                  value={ensureString(values.salaryNoticeStepId)}
                  onChange={handleChange}
                  errorText={formatError(t, touched.id && errors.id)}
                  disabled={isLoading || !canEdit()}
                />
              </div>
            </InputGroup>
          </div>
        </form>
      </>
    );
  },
  {
    resource: "setting-others",
    action: ["find"],
  }
);
