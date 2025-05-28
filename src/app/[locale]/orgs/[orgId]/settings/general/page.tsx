"use client";

import { HttpStatusCode } from "axios";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { mutate } from "swr";

import { Button, InputGroup, OrganizationLogo, TextField } from "@/components/molecules";
import { organizationLogoOptions } from "@/configs/media";
import { OrganizationEditForm, organizationFormSchema } from "@/forms/organization";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { getOrganization } from "@/services/client/organization";
import { ApiResult } from "@/types/api";
import { OrganizationInfo } from "@/types/strapi";
import { post, postForm } from "@/utils/api";
import { withOrg } from "@/utils/client";
import { bytesToSize, getFileExtension } from "@/utils/file";
import { trim } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: OrganizationEditForm = {
  code: "",
  name: "",
  abbreviationName: "",
  internationalName: "",
  logo: {
    url: "",
  },
  logoName: "",
  taxCode: "",
  businessAddress: "",
  slug: "",
  email: "",
  phoneNumber: "",
  website: "",
  contactName: "",
  contactPosition: "",
  contactEmail: "",
  contactPhoneNumber: "",
};

const ORGANIZATION_LOGO_ALLOWED_FILE_TYPES = organizationLogoOptions.fileTypes
  .map((item) => `*${item}`.toLowerCase())
  .join(", ");

export default withOrg(
  ({ orgId, org, orgLink, userId }) => {
    const t = useTranslations();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();
    const [isLogoProcessing, setIsLogoProcessing] = useState(false);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("org_setting_general.title"), link: `${orgLink}/settings/general` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * This function handles the form submission when the user updates their organization information.
     * It performs the following steps:
     * 1. If an logo file is selected, it uploads the file and retrieves its file ID.
     * 3. It updates the organization information, including the logo file ID if applicable.
     * 5. It displays a success notification.
     *
     * @param values - The form values containing organization information.
     */
    const handleSubmitFormik = useCallback(
      async (values: OrganizationEditForm, formikHelpers: FormikHelpers<OrganizationEditForm>) => {
        const { status, data } = await post<ApiResult<OrganizationInfo>>(`/api${orgLink}/settings/general`, {
          ...trim(values),
        });
        formikHelpers.setSubmitting(false);
        if (status === HttpStatusCode.Ok) {
          showNotification({
            color: "success",
            title: t("common.message.save_success_title"),
            message: t("org_setting_general.save_success_message"),
          });
          formikHelpers.setFieldValue("logoName", "");
          formikHelpers.setFieldValue("logo", data?.logo);
          mutate([`users/${userId}/organization-members`, { id: userId }]);
          return;
        }

        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("org_setting_general.save_error_message"),
        });
      },
      [orgLink, userId, showNotification, t]
    );

    const {
      values,
      errors,
      isSubmitting,
      touched,
      handleChange,
      handleSubmit,
      setFieldValue,
      setFieldError,
      resetForm,
    } = useFormik({
      initialValues: initialFormValues,
      validationSchema: organizationFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

    /**
     * This function fetches organization data based on the provided orgId and updates the organization information state.
     * It checks if a orgId is available before making the request to get organization data.
     */
    const fetchOrganization = async () => {
      if (orgId) {
        const organizationData = await getOrganization(orgId);
        if (organizationData) {
          resetForm({
            values: {
              ...organizationData,
            },
          });
        }
      }
    };

    // Init value
    useEffect(() => {
      resetForm({
        values: {
          ...org,
        },
      });

      fetchOrganization();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * This function is a callback that handles logo file selection and upload.
     * It performs checks for file extension and size, updates the form's logo URL,
     * and uploads the selected file to the server.
     *
     * @param event - The change event triggered by the file input element.
     */
    const handleLogoChange = useCallback(
      async (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.target instanceof HTMLInputElement && event.target.files) {
          const file = event.target.files[0];
          if (!file) {
            return false;
          }

          // Check file extension
          const ext = getFileExtension(file.name);
          if (!organizationLogoOptions.fileTypes.includes(ext)) {
            setFieldError("logoName", t("error.file_types", { types: ORGANIZATION_LOGO_ALLOWED_FILE_TYPES }));
            return false;
          }

          // Check file size
          if (file.size > organizationLogoOptions.maxFileSize) {
            setFieldError("logoName", t("error.file_size", { size: bytesToSize(organizationLogoOptions.maxFileSize) }));
            return false;
          }

          setFieldValue("logo.url", URL.createObjectURL(file));
          setIsLogoProcessing(true);
          const { data, status } = await postForm<ApiResult>("/api/upload", {
            file,
            type: "ORGANIZATION_LOGO",
          });
          setIsLogoProcessing(false);
          if (status === HttpStatusCode.Ok) {
            setFieldValue("logoName", data.fileName);
          }
        }
      },
      [setFieldError, setFieldValue, t]
    );

    return (
      <form method="POST" onSubmit={handleSubmit}>
        <div className="space-y-12">
          <InputGroup title={t("org_setting_general.logo")} description={t("org_setting_general.logo_description")}>
            <div className="col-span-full">
              <label htmlFor="logo" className="sr-only">
                Logo
              </label>
              <div className="mt-2 flex items-center gap-x-3 md:gap-x-6">
                <OrganizationLogo
                  size="xlarge"
                  logoURL={values.logo?.previewUrl || values.logo?.url}
                  displayName={values.name ?? ""}
                />

                <div>
                  <label
                    htmlFor="logo"
                    className="cursor-pointer rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <span>{t("org_setting_general.change_logo")}</span>
                    <TextField
                      id="logo"
                      name="logo"
                      type="file"
                      accept={organizationLogoOptions.fileTypes.join(",")}
                      onChange={handleLogoChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    {t("org_setting_general.change_logo_description", {
                      fileTypes: ORGANIZATION_LOGO_ALLOWED_FILE_TYPES,
                      maxFileSize: bytesToSize(organizationLogoOptions.maxFileSize),
                    })}
                    <br />
                    {t("org_setting_general.change_logo_recommended")}
                  </p>
                </div>
              </div>
              {errors.logoName && <p className="mt-2 text-xs text-red-600 ">{errors.logoName}</p>}
            </div>
          </InputGroup>

          <InputGroup
            title={t("org_setting_general.general_title")}
            description={t("org_setting_general.general_title_description")}
          >
            <div className="sm:col-span-2">
              <TextField type="text" label={t("org_setting_general.alias")} value={values.alias ?? ""} disabled />
            </div>

            <div className="sm:col-span-4 sm:col-start-1">
              <TextField
                maxLength={255}
                required
                type="text"
                label={t("org_setting_general.name")}
                id="name"
                name="name"
                value={values.name ?? ""}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                maxLength={20}
                required
                type="text"
                label={t("org_setting_general.tax_code")}
                id="taxCode"
                name="taxCode"
                value={values.taxCode ?? ""}
                errorText={formatError(t, touched.taxCode && errors.taxCode)}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-4">
              <TextField
                maxLength={255}
                type="text"
                label={t("org_setting_general.international_name")}
                id="internationalName"
                name="internationalName"
                value={values.internationalName ?? ""}
                onChange={handleChange}
                errorText={formatError(t, touched.internationalName && errors.internationalName)}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                maxLength={50}
                type="text"
                label={t("org_setting_general.abbreviation_name")}
                id="abbreviationName"
                name="abbreviationName"
                value={values.abbreviationName ?? ""}
                onChange={handleChange}
                errorText={formatError(t, touched.abbreviationName && errors.abbreviationName)}
              />
            </div>

            <div className="sm:col-span-3">
              <TextField
                maxLength={255}
                type="text"
                label={t("org_setting_general.email")}
                id="email"
                name="email"
                value={values.email ?? ""}
                errorText={formatError(t, touched.email && errors.email)}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                maxLength={20}
                type="text"
                label={t("org_setting_general.phone_number")}
                id="phoneNumber"
                name="phoneNumber"
                value={values.phoneNumber ?? ""}
                errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
                onChange={handleChange}
              />
            </div>

            <div className="col-span-full">
              <TextField
                maxLength={2048}
                type="text"
                label={t("org_setting_general.website")}
                id="website"
                name="website"
                value={values.website ?? ""}
                errorText={formatError(t, touched.website && errors.website)}
                onChange={handleChange}
              />
            </div>

            <div className="col-span-full">
              <TextField
                maxLength={255}
                type="text"
                label={t("org_setting_general.business_address")}
                id="businessAddress"
                name="businessAddress"
                value={values.businessAddress ?? ""}
                errorText={formatError(t, touched.businessAddress && errors.businessAddress)}
                onChange={handleChange}
                required
              />
            </div>
          </InputGroup>

          <InputGroup
            title={t("org_setting_general.contact_title")}
            description={t("org_setting_general.contact_description")}
          >
            <div className="sm:col-span-3">
              <TextField
                maxLength={255}
                type="text"
                label={t("org_setting_general.contact_name")}
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
                label={t("org_setting_general.contact_position")}
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
                label={t("org_setting_general.contact_email")}
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
                label={t("org_setting_general.contact_phone_number")}
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
          <Button type="submit" disabled={isLogoProcessing} loading={isSubmitting}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    );
  },
  {
    resource: "organization",
    action: "edit",
  }
);
