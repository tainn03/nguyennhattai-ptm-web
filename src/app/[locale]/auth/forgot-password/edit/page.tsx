"use client";

import clsx from "clsx";
import { useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useEffect, useState } from "react";

import { Alert, Button, ForgotPasswordLayout, PasswordField } from "@/components/molecules";
import { SESSION_FORGOT_PASSWORD } from "@/constants/storage";
import { ChangePasswordForm, changePasswordFormSchema } from "@/forms/forgotPassword";
import { useNotification } from "@/redux/actions";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { post } from "@/utils/api";
import { getItemObject } from "@/utils/storage";
import { formatError } from "@/utils/yup";

const initialFormValues: ChangePasswordForm = {
  email: "",
  tokenKey: "",
  password: "",
  passwordConfirm: "",
};

export default function Page() {
  const t = useTranslations();
  const router = useRouter();
  const [storedData, setStoredData] = useState<Pick<ChangePasswordForm, "email" | "tokenKey">>();
  const [errorMessage, setErrorMessage] = useState("");
  const { showNotification } = useNotification();

  useEffect(() => {
    const obj = getItemObject(SESSION_FORGOT_PASSWORD, {
      remove: true,
    });
    if (!obj) {
      return router.replace("/auth/signin");
    }
    setStoredData({
      email: obj.email,
      tokenKey: obj.tokenKey,
    });
  }, [router]);

  // handle input password
  const handleSubmitFormik = async (values: ChangePasswordForm) => {
    setErrorMessage("");

    const result = await post<ApiResult>("/api/auth/forgot-password/edit", {
      password: values.password,
      ...storedData,
    });

    if (result.status === HttpStatusCode.Ok) {
      showNotification({
        color: "success",
        message: t("forgot_password.edit_password_success_password"),
      });
      router.replace("/auth/signin");
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleSubmit } = useFormik({
    initialValues: initialFormValues,
    validationSchema: changePasswordFormSchema,
    onSubmit: handleSubmitFormik,
  });

  return (
    <ForgotPasswordLayout
      title={t("forgot_password.edit_password_title")}
      description={
        <>
          {t.rich("forgot_password.edit_password_title_description", {
            strong: (chunks) => <span className="font-bold">{chunks}</span>,
            email: storedData?.email,
          })}
        </>
      }
    >
      <div
        className={clsx({
          "-mt-4": errorMessage,
        })}
      >
        {errorMessage && <Alert color="error" title={errorMessage} className="mb-6" />}
      </div>

      <form className="space-y-6" method="POST" onSubmit={handleSubmit}>
        <PasswordField
          label={t("forgot_password.edit_password")}
          name="password"
          value={values.password}
          onChange={handleChange}
          helperText={t("forgot_password.edit_password_helper_text")}
          errorText={formatError(t, touched.password && errors.password)}
        />

        <PasswordField
          label={t("forgot_password.edit_password_confirm")}
          name="passwordConfirm"
          value={values.passwordConfirm}
          onChange={handleChange}
          errorText={formatError(t, touched.passwordConfirm && errors.passwordConfirm)}
        />

        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          disabled={!values.password || !values.passwordConfirm}
        >
          {t("common.save")}
        </Button>
      </form>
    </ForgotPasswordLayout>
  );
}
