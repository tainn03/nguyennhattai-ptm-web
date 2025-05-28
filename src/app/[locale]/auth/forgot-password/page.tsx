"use client";

import { User } from "@prisma/client";
import clsx from "clsx";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useState } from "react";

import Link from "@/components/atoms/Link/Link";
import { Alert, Button, ForgotPasswordLayout, TextField } from "@/components/molecules";
import { SESSION_FORGOT_PASSWORD } from "@/constants/storage";
import { forgotPasswordFormSchema } from "@/forms/forgotPassword";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { post } from "@/utils/api";
import { setItemObject } from "@/utils/storage";
import { formatError } from "@/utils/yup";

const initialFormValues: Partial<User> = {
  email: "",
};

export default function Page() {
  const t = useTranslations();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");

  // handle input send email
  const handleSubmitFormik = async (values: Partial<User>, formikHelpers: FormikHelpers<Partial<User>>) => {
    setErrorMessage("");

    const { status } = await post<ApiResult>("/api/auth/forgot-password", {
      ...values,
    });

    if (status === HttpStatusCode.BadRequest) {
      formikHelpers.setSubmitting(false);
      setErrorMessage(t("forgot_password.error_not_exists_message"));
      return;
    }

    setItemObject(SESSION_FORGOT_PASSWORD, { email: values.email });
    router.replace("/auth/forgot-password/confirmation");
  };

  const { errors, values, touched, isSubmitting, handleChange, handleSubmit } = useFormik({
    initialValues: initialFormValues,
    validationSchema: forgotPasswordFormSchema,
    onSubmit: handleSubmitFormik,
  });

  return (
    <ForgotPasswordLayout
      title={t("forgot_password.title")}
      description={t("forgot_password.title_description")}
      actionComponent={
        <Link useDefaultStyle href="/auth/signin">
          <span aria-hidden="true">&larr;</span> {t("forgot_password.back_to_sign_in")}
        </Link>
      }
      showCancel={false}
    >
      <div
        className={clsx({
          "-mt-4": errorMessage,
        })}
      >
        {errorMessage && <Alert color="error" title={errorMessage} className="mb-6" />}
      </div>

      <form className="space-y-6" method="POST" onSubmit={handleSubmit}>
        <TextField
          id="email"
          name="email"
          label={t("forgot_password.email")}
          value={values.email || ""}
          onChange={handleChange}
          errorText={formatError(t, touched.email && errors.email)}
        />

        <Button type="submit" className="w-full" loading={isSubmitting} disabled={!values.email?.length}>
          {t("forgot_password.continue")}
        </Button>
      </form>
    </ForgotPasswordLayout>
  );
}
