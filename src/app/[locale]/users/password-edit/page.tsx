"use client";

import { FormikHelpers, useFormik } from "formik";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Alert, Button, InputGroup, PasswordField } from "@/components/molecules";
import { PasswordEditForm, passwordEditFormSchema } from "@/forms/passwordEdit";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { post } from "@/utils/api";
import { withAuth } from "@/utils/client";
import { formatError } from "@/utils/yup";

const initialFormValues: PasswordEditForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default withAuth(() => {
  const t = useTranslations();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: t("user_profile.account"), link: "/users/profile" },
      { name: t("user_password_edit.title"), link: "/users/password-edit" },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitFormik = useCallback(
    async (values: PasswordEditForm, formikHelpers: FormikHelpers<PasswordEditForm>) => {
      setErrorMessage("");

      const { status } = await post<ApiResult>("/api/users/password-edit", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      formikHelpers.setSubmitting(false);
      if (status === HttpStatusCode.BadRequest) {
        setErrorMessage(t("user_password_edit.error_current_password_message"));
        return;
      }

      showNotification({
        color: "success",
        message: t("user_password_edit.save_success_message"),
      });
      await signOut({
        redirect: true,
        callbackUrl: "/auth/signin",
      });
    },
    [showNotification, t]
  );

  const { values, errors, touched, isSubmitting, handleChange, handleSubmit } = useFormik({
    initialValues: initialFormValues,
    validationSchema: passwordEditFormSchema,
    onSubmit: handleSubmitFormik,
  });

  return (
    <form className="space-y-4" autoCapitalize="off" autoComplete="off" method="POST" onSubmit={handleSubmit}>
      <div className="space-y-12">
        <InputGroup
          title={t("user_password_edit.title")}
          description={
            <>
              {t("user_password_edit.title_description")}
              <p className="mt-2 flex flex-col">
                <span className="font-medium">{t("user_password_edit.password_rule_title")}</span>
                <span className="whitespace-pre-wrap">{t("user_password_edit.password_rule_description")}</span>
              </p>
            </>
          }
        >
          {errorMessage && (
            <div className="col-span-full">
              <Alert color="error" title={errorMessage} />
            </div>
          )}

          <div className="col-span-full">
            <PasswordField
              id="currentPassword"
              name="currentPassword"
              label={t("user_password_edit.current_password")}
              value={values.currentPassword}
              onChange={handleChange}
              helperText={t("user_password_edit.current_password_helper_text")}
              errorText={formatError(t, touched.currentPassword && errors.currentPassword)}
            />
          </div>

          <div className="col-span-full">
            <PasswordField
              id="newPassword"
              name="newPassword"
              label={t("user_password_edit.new_password")}
              value={values.newPassword}
              onChange={handleChange}
              errorText={formatError(t, touched.newPassword && errors.newPassword)}
            />
          </div>

          <div className="col-span-full">
            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label={t("user_password_edit.new_password_confirm")}
              value={values.confirmPassword}
              onChange={handleChange}
              errorText={formatError(t, touched.confirmPassword && errors.confirmPassword)}
            />
          </div>
        </InputGroup>
      </div>

      <div className="flex flex-row items-center justify-end gap-x-4 max-sm:px-4">
        <Button type="submit" loading={isSubmitting}>
          {t("user_password_edit.save")}
        </Button>
      </div>
    </form>
  );
});
