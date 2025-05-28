"use client";

import { HttpStatusCode } from "axios";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useMemo } from "react";

import { Button, InputGroup, Loading, NewOrganizationNotification, TextField } from "@/components/molecules";
import { SESSION_ORGANIZATION_NAME } from "@/constants/storage";
import { OrganizationNewForm, organizationNewForm } from "@/forms/organization";
import { useOrganizationsByOwner } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { hasOrganizations } from "@/services/client/organization";
import { ErrorType } from "@/types";
import { ApiResult } from "@/types/api";
import { OrganizationInfo } from "@/types/strapi";
import { post } from "@/utils/api";
import { withAuth } from "@/utils/client";
import { setItemString } from "@/utils/storage";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: OrganizationNewForm = {
  name: "",
  internationalName: "",
  abbreviationName: "",
  taxCode: "",
  email: "",
  phoneNumber: "",
  website: "",
  businessAddress: "",
  contactName: "",
  contactPosition: "",
  contactEmail: "",
  contactPhoneNumber: "",
};

export default withAuth(
  ({ userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { showNotification } = useNotification();

    const { isLoading, organizations } = useOrganizationsByOwner({ createdById: userId });

    const isActiveOrg = useMemo(() => {
      if (organizations.length > 0) {
        return organizations[0].isActive;
      }
    }, [organizations]);

    /**
     * Handles the submission of a organization form using Formik.
     *
     * @param {OrganizationNewForm} values - The form values representing a organization.
     * @param {FormikHelpers<OrganizationNewForm>} formikHelpers - Formik form helpers.
     * @returns {Promise<void>} A promise that handles organization creation or update.
     */
    const handleSubmitFormik = useCallback(
      async (values: OrganizationNewForm, formikHelpers: FormikHelpers<OrganizationNewForm>) => {
        const {
          data,
          status,
          message: messageApi,
        } = await post<ApiResult<OrganizationInfo & { autoActivateOrganization: boolean }>>("/api/orgs/new", {
          ...values,
        });

        formikHelpers.setSubmitting(false);
        if (status === HttpStatusCode.Ok && data) {
          if (data.autoActivateOrganization) {
            // Show a success notification and navigate to the orgs page
            showNotification({
              color: "success",
              title: t("common.message.save_success_title"),
              message: t("common.message.save_success_message", { name: values.name }),
            });
            router.push(`/orgs/${data?.code}/dashboard`);
          } else {
            setItemString(SESSION_ORGANIZATION_NAME, values.name || "");
            router.push("/orgs/new/waiting");
          }
        } else {
          let message = "";
          switch (messageApi) {
            case `${ErrorType.EXISTED}-${values.name}`:
              message = errorExists("new_org.name");
              formikHelpers.setFieldError("name", message);
              return;
            case `${ErrorType.EXISTED}-${userId}`:
              message = t("new_org.save_error_existed_user");
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
      [router, showNotification, t, userId]
    );

    const { values, touched, errors, isSubmitting, handleChange, handleSubmit } = useFormik({
      initialValues: initialFormValues,
      validationSchema: organizationNewForm,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

    const goBack = useCallback(() => {
      router.back();
    }, [router]);

    // Loading
    if (isLoading) {
      return <Loading size="medium" />;
    }

    // Notification
    if (organizations.length > 0) {
      return (
        <NewOrganizationNotification
          titleKey={isActiveOrg ? "new_org.notify_active_title" : "new_org.notify_inactive_title"}
          descriptionKey={isActiveOrg ? "new_org.notify_active_description" : "new_org.notify_inactive_description"}
          organizationName={organizations[0].name}
        />
      );
    }

    return (
      <form method="POST" onSubmit={handleSubmit}>
        <div className="space-y-12">
          <InputGroup title={t("new_org.new_org_title")} description={t("new_org.new_org_title_description")}>
            <div className="sm:col-span-4">
              <TextField
                name="name"
                label={t("new_org.name")}
                maxLength={255}
                value={values.name}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                maxLength={20}
                type="text"
                label={t("new_org.tax_code")}
                name="taxCode"
                value={values.taxCode || ""}
                errorText={formatError(t, touched.taxCode && errors.taxCode)}
                onChange={handleChange}
                required
              />
            </div>

            <div className="sm:col-span-4">
              <TextField
                name="internationalName"
                label={t("new_org.international_name")}
                maxLength={255}
                value={values.internationalName || ""}
                onChange={handleChange}
                errorText={formatError(t, touched.internationalName && errors.internationalName)}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                name="abbreviationName"
                value={values.abbreviationName || ""}
                label={t("new_org.abbreviation_name")}
                maxLength={50}
                onChange={handleChange}
                errorText={formatError(t, touched.abbreviationName && errors.abbreviationName)}
              />
            </div>

            <div className="sm:col-span-3">
              <TextField
                name="email"
                value={values.email || ""}
                label={t("new_org.email")}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.email && errors.email)}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                maxLength={20}
                type="text"
                label={t("new_org.phone_number")}
                name="phoneNumber"
                value={values.phoneNumber || ""}
                errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
                onChange={handleChange}
              />
            </div>

            <div className="col-span-full">
              <TextField
                maxLength={2048}
                type="text"
                label={t("new_org.website")}
                id="website"
                name="website"
                value={values.website ?? ""}
                errorText={formatError(t, touched.website && errors.website)}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-full">
              <TextField
                name="businessAddress"
                label={t("new_org.business_address")}
                maxLength={255}
                value={values.businessAddress || ""}
                onChange={handleChange}
                errorText={formatError(t, touched.businessAddress && errors.businessAddress)}
                required
              />
            </div>
          </InputGroup>

          <InputGroup title={t("new_org.contact")} description={t("new_org.contact_description")}>
            <div className="sm:col-span-3">
              <TextField
                maxLength={255}
                type="text"
                label={t("new_org.contact_name")}
                id="contactName"
                name="contactName"
                value={values.contactName ?? ""}
                errorText={formatError(t, touched.contactName && errors.contactName)}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                maxLength={255}
                type="text"
                label={t("new_org.contact_position")}
                id="contactPosition"
                name="contactPosition"
                value={values.contactPosition ?? ""}
                errorText={formatError(t, touched.contactPosition && errors.contactPosition)}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-3">
              <TextField
                maxLength={255}
                type="text"
                label={t("new_org.contact_email")}
                id="contactEmail"
                name="contactEmail"
                value={values.contactEmail ?? ""}
                errorText={formatError(t, touched.contactEmail && errors.contactEmail)}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                maxLength={20}
                type="text"
                label={t("new_org.contact_phone_number")}
                id="contactPhoneNumber"
                name="contactPhoneNumber"
                value={values.contactPhoneNumber ?? ""}
                errorText={formatError(t, touched.contactPhoneNumber && errors.contactPhoneNumber)}
                onChange={handleChange}
              />
            </div>
          </InputGroup>
        </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
          <Button variant="text" onClick={goBack} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>

          <Button type="submit" loading={isSubmitting}>
            {t("common.new")}
          </Button>
        </div>
      </form>
    );
  },
  {
    resource: "organization",
    action: "new",
    checkAuthorized: async (userId: number) => !(await hasOrganizations(userId)),
  }
);
