"use client";

import { UserLinkedAccount } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { Checkbox, Link, Logo } from "@/components/atoms";
import { Alert, Button, PasswordField, TextField } from "@/components/molecules";
import { AppInfoBox } from "@/components/organisms";
import { AlertModal, LocaleSwitcher } from "@/components/organisms";
import { SESSION_JWT_AUTH_DATA } from "@/constants/storage";
import { SignUpForm, signUpFormSchema } from "@/forms/auth";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { JwtAuthData } from "@/types/auth";
import { post } from "@/utils/api";
import { getItemObject } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: SignUpForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  provider: "",
  avatar: "",
};

export default function Page() {
  const router = useRouter();
  const t = useTranslations();
  const [isAgreement, setIsAgreement] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmitFormik = useCallback(
    async (values: SignUpForm, formikHelpers: FormikHelpers<SignUpForm>) => {
      setErrorMessage("");

      const { status } = await post<ApiResult>("/api/auth/signup", {
        ...values,
      });

      if (status === HttpStatusCode.BadRequest) {
        formikHelpers.setSubmitting(false);
        setErrorMessage(t("error.exists", { name: `${t("sign_up.email")} ${values.email}` }));
        return;
      }

      if (status === HttpStatusCode.Conflict) {
        formikHelpers.setSubmitting(false);
        setErrorMessage(t("error.exists", { name: `${t("sign_up.phone_number")} ${values.phoneNumber}` }));
        return;
      }
      setLoading(true);
      const result = await signIn("credentials", {
        redirect: false,
        identifier: values.email,
        provider: values.provider,
      });

      if (result?.ok) {
        router.replace("/orgs");
        return;
      }

      setLoading(false);
      setIsModalOpen(true);
    },
    [router, t]
  );

  const { values, errors, touched, isSubmitting, handleChange, handleSubmit, resetForm } = useFormik({
    initialValues: initialFormValues,
    validationSchema: signUpFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  useEffect(
    () => {
      const data = getItemObject<JwtAuthData & UserLinkedAccount>(SESSION_JWT_AUTH_DATA, {
        provider: "session",
        security: true,
        remove: true,
      });
      if (data) {
        const { email, image, provider, firstName, lastName } = data;
        resetForm({
          values: {
            ...values,
            firstName: ensureString(firstName),
            lastName: ensureString(lastName),
            email: ensureString(email),
            provider: ensureString(provider),
            avatar: ensureString(image),
          },
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleConfirmDialog = useCallback(() => {
    router.replace("/auth/signin");
  }, [router]);

  const handleAgreementChange = useCallback(() => {
    setIsAgreement((prevValue) => !prevValue);
  }, []);

  /* Social login */
  /* const handleButtonGoogleClick = () => {
    signIn("google", {
      callbackUrl: "/orgs",
    });
  };

  const handleButtonFBClick = () => {
    signIn("facebook", {
      callbackUrl: "/orgs",
    });
  }; */

  return (
    <>
      <div className="flex min-h-full flex-1">
        <div className="flex h-screen flex-col justify-between px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div />
          <div className="flex flex-col justify-center self-center">
            <div className="mx-auto w-full max-w-sm lg:w-96">
              <div>
                <div className="grid grid-cols-2 justify-items-end">
                  <Logo size="xlarge" className="justify-self-start" useAppLogoV2 />
                  <div className="content-end">
                    <LocaleSwitcher />
                  </div>
                </div>
                <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-gray-900">
                  {t("sign_up.new_account")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {t("sign_up.have_an_account")}{" "}
                  <Link useDefaultStyle href="/auth/signin">
                    {t("sign_up.sign_in")}
                  </Link>
                </p>
              </div>

              <div className="mt-10">
                {errorMessage && <Alert color="error" title={errorMessage} className="mb-6" />}

                <form
                  onSubmit={handleSubmit}
                  method="POST"
                  className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-5"
                >
                  <div className="sm:col-span-3">
                    <TextField
                      name="lastName"
                      id="lastName"
                      label={t("sign_up.last_name")}
                      onChange={handleChange}
                      maxLength={255}
                      value={values.lastName}
                      errorText={formatError(t, touched.lastName && errors.lastName)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <TextField
                      name="firstName"
                      id="firstName"
                      label={t("sign_up.first_name")}
                      onChange={handleChange}
                      maxLength={255}
                      value={values.firstName}
                      errorText={formatError(t, touched.firstName && errors.firstName)}
                    />
                  </div>

                  <div className="col-span-full">
                    <TextField
                      id="email"
                      name="email"
                      label={t("sign_up.email")}
                      disabled={!!values.provider}
                      onChange={handleChange}
                      maxLength={255}
                      value={values.email}
                      errorText={formatError(t, touched.email && errors.email)}
                    />
                  </div>

                  <div className="col-span-full">
                    <TextField
                      id="phoneNumber"
                      name="phoneNumber"
                      label={t("sign_up.phone_number")}
                      maxLength={20}
                      onChange={handleChange}
                      value={values.phoneNumber}
                      errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
                    />
                  </div>

                  <div className="col-span-full">
                    <PasswordField
                      id="password"
                      name="password"
                      label={t("sign_up.password")}
                      onChange={handleChange}
                      value={values.password}
                      helperText={t("sign_up.confirm_password_helper_text")}
                      errorText={formatError(t, touched.password && errors.password)}
                    />
                  </div>

                  <div className="col-span-full">
                    <PasswordField
                      id="confirmPassword"
                      name="confirmPassword"
                      label={t("sign_up.confirm_password")}
                      onChange={handleChange}
                      value={values.confirmPassword}
                      errorText={formatError(t, touched.confirmPassword && errors.confirmPassword)}
                    />
                  </div>

                  <div className="col-span-full">
                    <Checkbox
                      className="[&_label]:!font-normal"
                      label={t.rich("sign_up.terms_and_conditions", {
                        link: (chunks) => (
                          <Link
                            useDefaultStyle
                            target="_blank"
                            href="https://help.autotms.vn/dieu-khoan-su-dung-dich-vu"
                          >
                            {chunks}
                          </Link>
                        ),
                        appName: t("common.app.name"),
                      })}
                      checked={isAgreement}
                      onChange={handleAgreementChange}
                    />
                  </div>

                  <div className="col-span-full">
                    <Button type="submit" className="w-full" disabled={!isAgreement} loading={isSubmitting || loading}>
                      {t("sign_up.sign_up_btn")}
                    </Button>
                  </div>
                </form>

                {/* Social login */}
                {/* <div className="mt-10">
                <SocialLoginSection
                  title={t("sign_up.log_in_with")}
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

      {/* Register successfully modal */}
      <AlertModal
        icon="success"
        title={t("sign_up.registration_successful")}
        message={
          values.provider
            ? t("sign_up.registration_successful_message", { email: values.email })
            : t("sign_up.registration_successful_message_confirm", { email: values.email })
        }
        open={isModalOpen}
        onConfirm={handleConfirmDialog}
      />
    </>
  );
}
