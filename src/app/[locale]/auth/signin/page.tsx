"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { FormikHelpers, useFormik } from "formik";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { Checkbox, Link, Logo } from "@/components/atoms";
import { Alert, Button, PasswordField, TextField } from "@/components/molecules";
import { AppInfoBox } from "@/components/organisms";
import { SESSION_JWT_AUTH_DATA, SESSION_RETURN_URL } from "@/constants/storage";
import { SignInForm, signInFormSchema, UserType } from "@/forms/auth";
import { JwtAuthData } from "@/types/auth";
import { getItemObject, getItemString } from "@/utils/storage";
import { formatError } from "@/utils/yup";

import { OrganizationInput, UserTypeRadioGroup } from "./components";

const initialFormValues: SignInForm = {
  userType: "MEMBER",
  account: "",
  password: "",
};

export default function Page() {
  const t = useTranslations();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [returnUrl, setReturnUrl] = useState<string>();
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("isAdmin");

  useEffect(() => {
    // Stored return URL to session
    const storedReturnUrl = getItemString(SESSION_RETURN_URL, { remove: true });
    storedReturnUrl && setReturnUrl(storedReturnUrl);

    // Show error email
    const data = getItemObject<JwtAuthData>(SESSION_JWT_AUTH_DATA, { remove: true });
    if (data?.email) {
      setErrorMessage(t("sign_in.error_email_message", { email: data?.email || "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitFormik = useCallback(
    async (values: SignInForm, formikHelpers: FormikHelpers<SignInForm>) => {
      setErrorMessage("");
      const result = await signIn("credentials", {
        redirect: false,
        userType: values.userType,
        identifier: values.account,
        password: values.password,
        alias: values.alias,
        organizationId: values.organizationId,
      });

      // Credential error
      if (result?.error) {
        formikHelpers.setSubmitting(false);
        const errorKey = result.error.startsWith("sign_in.") ? result.error : "sign_in.error_invalid_message";
        setErrorMessage(t(errorKey));
        return;
      }

      // Navigation to home page
      if (values.code) {
        router.replace(returnUrl || `/orgs/${values.code}/dashboard`);
      } else {
        router.replace(returnUrl || "/orgs");
      }
    },
    [returnUrl, router, t]
  );

  /* Social login */
  /* const handleButtonGoogleClick = useCallback(() => {
    signIn("google", {
      callbackUrl: returnUrl || "/orgs",
    });
  }, [returnUrl]);

  const handleButtonFBClick = useCallback(() => {
    signIn("facebook", {
      callbackUrl: returnUrl || "/orgs",
    });
  }, [returnUrl]); */

  const { values, errors, touched, isSubmitting, handleChange, handleSubmit, setFieldValue } = useFormik({
    initialValues: initialFormValues,
    validationSchema: signInFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  useEffect(() => {
    if (touched.alias && Boolean(errors.alias)) {
      setErrorMessage(formatError(t, errors.alias));
    } else if ((touched.account && Boolean(errors.account)) || (touched.password && Boolean(errors.password))) {
      setErrorMessage(t("sign_in.error_required_message"));
    } else {
      setErrorMessage("");
    }
  }, [touched, errors, t]);

  const handleUserTypeChange = useCallback(
    (value: UserType) => {
      setFieldValue("userType", value);
    },
    [setFieldValue]
  );

  return (
    <div className="flex min-h-full flex-1 justify-center">
      <div className="flex h-screen flex-col justify-between px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div />
        <div className="flex flex-col justify-center self-center">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div>
              <div className="grid grid-cols-2 justify-items-end">
                <Logo size="xlarge" className="justify-self-start" useAppLogoV2 />
                <div className="content-end">{/* <LocaleSwitcher /> */}</div>
              </div>
              <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-gray-900">{t("sign_in.title")}</h2>
              {/*
            // TODO: Temporarily not allowing users to register directly on the website.
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {t("sign_in.no_account")}{" "}
              <Link href="/auth/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
                {t("sign_in.register")}
              </Link>
            </p> */}
            </div>

            <div
              className={clsx({
                "mt-6": errorMessage,
                "mt-10": !errorMessage,
              })}
            >
              {errorMessage && <Alert color="error" title={errorMessage} className="mb-6" />}

              <form className="space-y-6" autoCapitalize="off" autoComplete="off" method="POST" onSubmit={handleSubmit}>
                {isAdmin && <UserTypeRadioGroup value={values.userType} onChange={handleUserTypeChange} />}

                <OrganizationInput values={values} setFieldValue={setFieldValue} onChange={handleChange} />

                <TextField
                  id="account"
                  name="account"
                  label={t("sign_in.account")}
                  onChange={handleChange}
                  value={values.account}
                />

                <PasswordField
                  id="password"
                  name="password"
                  label={t("sign_in.password")}
                  onChange={handleChange}
                  value={values.password}
                />

                <div className="flex items-center justify-end">
                  <div className="hidden">
                    <Checkbox label={t("sign_in.save_status")} />
                  </div>

                  <div className="hidden text-sm leading-6">
                    <Link useDefaultStyle href="/auth/forgot-password">
                      {t("sign_in.forgot_password")}
                    </Link>
                  </div>
                </div>

                <Button type="submit" variant="contained" className="w-full" loading={isSubmitting}>
                  {t("sign_in.sign_in_btn")}
                </Button>
                <div className="flex py-2">
                  <Link
                    useDefaultStyle
                    href={t("sign_in.discovery_url")}
                    target="_blank"
                    className="color-blue-600 space-x-1 pr-2 pt-1 text-base font-semibold"
                  >
                    <span>{t("sign_in.discovery")}</span>
                    <ArrowTopRightOnSquareIcon className="inline-block h-5 w-5 text-blue-600" />
                  </Link>
                </div>
              </form>

              {/* Social login */}
              {/* <div className="mt-10">
              <SocialLoginSection
                title={t("sign_in.log_in_with")}
                onGoogleClick={handleButtonGoogleClick}
                onFacebookClick={handleButtonFBClick}
              />
            </div> */}
            </div>
          </div>
        </div>
        <AppInfoBox />
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <img className="absolute inset-0 h-full w-full object-cover" src="/assets/images/auth-ai.jpg" alt="" />
      </div>
    </div>
  );
}
