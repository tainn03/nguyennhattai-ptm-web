"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Authorization, Button, InputGroup, NumberField, PageHeader } from "@/components/molecules";
import { OrganizationReminderInputForm, organizationReminderInputFormSchema } from "@/forms/organizationSetting";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import {
  getOrganizationMinBOLSubmitSetting,
  updateOrganizationMinBOLSubmitDaysSetting,
} from "@/services/client/organizationSetting";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { OrganizationSettingInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { formatError } from "@/utils/yup";

const initialFormValues: OrganizationReminderInputForm = {
  minBOLSubmitDays: null,
  minVehicleDocumentReminderDays: null,
};

export default withOrg(
  ({ orgLink, orgId }) => {
    const t = useTranslations();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { canEdit } = usePermission("reminder");

    const currentSettingRef = useRef<OrganizationSettingInfo>();

    /**
     * Sets breadcrumb links for general organization settings and the min bill of ladings submit days section.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("org_setting_reminder.title"), link: `${orgLink}/settings/reminders` },
      ]);

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Handles the form submission for organization min bill of ladings submit days settings.
     *
     * @param {OrganizationReminderInputForm} values - Form values.
     * @param {FormikHelpers<OrganizationReminderInputForm>} formikHelpers - Formik helpers.
     */
    const handleSubmitFormik = useCallback(
      async (values: OrganizationReminderInputForm, formikHelpers: FormikHelpers<OrganizationReminderInputForm>) => {
        let result: MutationResult<OrganizationSettingInfo> | undefined;

        if (currentSettingRef.current?.id) {
          const { minBOLSubmitDays, minVehicleDocumentReminderDays } = values;
          // Update organization min bill of ladings submit days setting
          result = await updateOrganizationMinBOLSubmitDaysSetting(
            {
              id: currentSettingRef.current.id,
              minBOLSubmitDays,
              minVehicleDocumentReminderDays,
            },
            currentSettingRef.current.updatedAt
          );
        }

        formikHelpers.setSubmitting(false);
        if (!result) {
          return;
        }

        if (result.error) {
          let message = "";
          // Handle different result scenarios
          switch (result.error) {
            case ErrorType.EXCLUSIVE:
              message = t("common.message.save_error_exclusive", { name: t("org_setting_reminder.feature") });
              break;
            case ErrorType.UNKNOWN:
              message = t("common.message.save_error_unknown", { name: t("org_setting_reminder.feature") });
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
            message: t("common.message.save_success_message", { name: t("org_setting_reminder.feature") }),
          });
        }
      },
      [showNotification, t]
    );

    const { values, touched, errors, isSubmitting, handleSubmit, handleChange, resetForm } = useFormik({
      initialValues: initialFormValues,
      validationSchema: organizationReminderInputFormSchema,
      onSubmit: handleSubmitFormik,
    });

    /**
     * Fetches and sets the organization min bill of ladings submit days setting.
     */
    const fetchOrganizationOrderCodeSetting = useCallback(async () => {
      // Fetch the organization min bill of ladings submit days setting
      const result = await getOrganizationMinBOLSubmitSetting({
        organizationId: orgId,
      });

      if (result) {
        currentSettingRef.current = result;
        const { minBOLSubmitDays, minVehicleDocumentReminderDays } = result;
        // Reset the form with fetched values
        resetForm({
          values: {
            minBOLSubmitDays,
            minVehicleDocumentReminderDays,
          },
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      // Fetch the organization min bill of ladings submit days setting on component mount
      fetchOrganizationOrderCodeSetting();
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
        <Authorization resource="reminder" action="edit">
          <Button type="submit" loading={isSubmitting}>
            {t("common.save")}
          </Button>
        </Authorization>
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isSubmitting, t]
    );

    return (
      <>
        <form method="POST" onSubmit={handleSubmit}>
          <PageHeader
            title={t("org_setting_reminder.title")}
            description={t("org_setting_reminder.description")}
            actionHorizontal
            actionComponent={actionComponent}
          />
          <div className="space-y-12">
            <InputGroup
              title={t("org_setting_reminder.min_bol_submit_days")}
              description={t("org_setting_reminder.min_bol_submit_days_description")}
            >
              <div className="sm:col-span-3">
                <NumberField
                  label={t("org_setting_reminder.min_bol_submit_days")}
                  name="minBOLSubmitDays"
                  suffixText={t("org_setting_reminder.days")}
                  value={values?.minBOLSubmitDays}
                  onChange={handleChange}
                  errorText={formatError(t, touched.minBOLSubmitDays && errors.minBOLSubmitDays)}
                  disabled={!canEdit()}
                />
              </div>
            </InputGroup>
            <InputGroup
              title={t("org_setting_reminder.min_vehicle_document_submit_days")}
              description={t("org_setting_reminder.min_vehicle_document_submit_days_description")}
            >
              <div className="sm:col-span-3">
                <NumberField
                  label={t("org_setting_reminder.min_vehicle_document_submit_days")}
                  name="minVehicleDocumentReminderDays"
                  suffixText={t("org_setting_reminder.days")}
                  value={values?.minVehicleDocumentReminderDays}
                  onChange={handleChange}
                  errorText={formatError(
                    t,
                    touched.minVehicleDocumentReminderDays && errors.minVehicleDocumentReminderDays
                  )}
                  disabled={!canEdit()}
                />
              </div>
            </InputGroup>
          </div>
        </form>
      </>
    );
  },
  {
    resource: "reminder",
    action: ["find"],
  }
);
