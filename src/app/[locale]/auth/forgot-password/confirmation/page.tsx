"use client";

import clsx from "clsx";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { Link } from "@/components/atoms";
import { Alert, Button, ForgotPasswordLayout, VerificationField } from "@/components/molecules";
import { SESSION_FORGOT_PASSWORD } from "@/constants/storage";
import { RESEND_TOKEN_SECONDS } from "@/constants/token";
import { ConfirmationForm } from "@/forms/forgotPassword";
import { useNotification } from "@/redux/actions";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { post } from "@/utils/api";
import { countdown } from "@/utils/date";
import { getItemObject, setItemObject } from "@/utils/storage";

const initialForm: ConfirmationForm = {
  code: "",
  email: "",
};

let intervalId: NodeJS.Timeout | undefined = undefined;

export default function Page() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [seconds, setSeconds] = useState(RESEND_TOKEN_SECONDS);
  const { showNotification } = useNotification();

  useEffect(() => {
    const obj = getItemObject(SESSION_FORGOT_PASSWORD);
    if (!obj) {
      return router.replace("/auth/signin");
    }
    setEmail(obj.email);
  }, [router]);

  const countdownTimer = useCallback(() => {
    intervalId = setInterval(() => {
      setSeconds((prevValue) => {
        const newValue = prevValue - 1;
        if (newValue === 0) {
          clearInterval(intervalId);
        }
        return newValue;
      });
    }, 1000);
  }, []);

  const handleResendClick = useCallback(async () => {
    const { status } = await post<ApiResult>("/api/auth/forgot-password", { email });
    if (status === HttpStatusCode.Ok) {
      showNotification({
        color: "info",
        message: t("forgot_password.confirmation_resend_success_message", { email }),
      });
      setSeconds(RESEND_TOKEN_SECONDS);
      countdownTimer();
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [countdownTimer, email, showNotification, t]);

  useEffect(() => {
    setSeconds(RESEND_TOKEN_SECONDS);
    countdownTimer();
    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handle input token
  const handleSubmitFormik = async (values: ConfirmationForm, formikHelpers: FormikHelpers<ConfirmationForm>) => {
    setErrorMessage("");
    const result = await post<ApiResult>("/api/auth/forgot-password/confirmation", {
      code: values.code.toUpperCase(),
      email,
    });

    if (result.status === HttpStatusCode.BadRequest) {
      formikHelpers.setSubmitting(false);
      setErrorMessage(t("forgot_password.confirmation_invalid_password_message"));
      return;
    }
    setItemObject(SESSION_FORGOT_PASSWORD, {
      email,
      tokenKey: result.data.tokenKey,
    });
    router.replace("/auth/forgot-password/edit");
  };

  const { values, isSubmitting, handleSubmit, setFieldValue } = useFormik({
    initialValues: initialForm,
    onSubmit: handleSubmitFormik,
  });

  const handleCodeChangeAndPaste = useCallback(
    (code: string) => {
      setFieldValue("code", code);
    },
    [setFieldValue]
  );

  return (
    <ForgotPasswordLayout
      title={t("forgot_password.confirmation_title")}
      description={
        <>
          {t.rich("forgot_password.confirmation_description", {
            strong: (chunks) => <span className="font-bold">{chunks}</span>,
            email,
          })}
        </>
      }
      actionComponent={
        <>
          {t("forgot_password.confirmation_no_receive")}
          {seconds > 0 ? (
            <>
              {" "}
              {t("forgot_password.confirmation_resend_after")}
              <span className="ml-1">{countdown(seconds)}</span>
            </>
          ) : (
            <Link useDefaultStyle className="ml-1" href="#" onClick={handleResendClick}>
              {t("forgot_password.confirmation_resend")}
            </Link>
          )}
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

      <form className="space-y-6" method="POST" autoCapitalize="off" autoComplete="off" onSubmit={handleSubmit}>
        <VerificationField onChange={handleCodeChangeAndPaste} />

        <Button type="submit" className="w-full" loading={isSubmitting} disabled={values.code.length < 6}>
          {t("forgot_password.confirmation_btn")}
        </Button>
      </form>
    </ForgotPasswordLayout>
  );
}
