"use client";

import { useFormik } from "formik";
import { signIn } from "next-auth/react";
import { useCallback, useState } from "react";

import { Button, PasswordField, TextField } from "@/components/molecules";
import { AlertModal } from "@/components/organisms";
import { NewAdminAccountForm, newAdminAccountFormSchema } from "@/forms/adminInit";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { post } from "@/utils/api";

const initialFormValues: NewAdminAccountForm = {
  lastName: "",
  firstName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

type NewAccountFormProps = {
  onSuccess?: (userId: number) => void;
};

const NewAccountForm = ({ onSuccess }: NewAccountFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  const handleErrorClose = useCallback(() => {
    setIsErrorModalOpen(false);
  }, []);

  const handleSubmitFormik = useCallback(() => {
    setIsWarningModalOpen(true);
  }, []);

  const { errors, values, touched, handleChange, handleSubmit, setSubmitting } = useFormik({
    initialValues: initialFormValues,
    validationSchema: newAdminAccountFormSchema,
    onSubmit: handleSubmitFormik,
  });

  const handleConfirm = useCallback(async () => {
    setIsWarningModalOpen(false);
    setIsLoading(true);
    const { status, data } = await post<ApiResult<string>>("/api/admin/init/user", {
      ...values,
    });
    setSubmitting(false);

    if (status === HttpStatusCode.Ok) {
      const result = await signIn("credentials", {
        redirect: false,
        userType: "ADMIN",
        identifier: values.email,
        password: values.password,
      });
      if (result?.ok && data) {
        onSuccess && onSuccess(Number(data));
        return;
      }
    }

    setIsErrorModalOpen(true);
    setIsLoading(false);
  }, [values, setSubmitting, onSuccess]);

  return (
    <>
      <form className="grid grid-cols-5 gap-x-4 gap-y-8" onSubmit={handleSubmit} method="POST">
        <div className="col-span-3">
          <TextField
            required
            name="lastName"
            id="lastName"
            label="Last name"
            onChange={handleChange}
            maxLength={255}
            value={values.lastName}
            errorText={touched.lastName && errors.lastName}
          />
        </div>
        <div className="col-span-2">
          <TextField
            required
            name="firstName"
            id="firstName"
            label="First name"
            onChange={handleChange}
            maxLength={255}
            value={values.firstName}
            errorText={touched.firstName && errors.firstName}
          />
        </div>

        <div className="col-span-full">
          <TextField
            required
            id="email"
            name="email"
            label="Email"
            onChange={handleChange}
            maxLength={255}
            value={values.email}
            errorText={touched.email && errors.email}
          />
        </div>

        <div className="col-span-full">
          <PasswordField
            required
            id="password"
            name="password"
            label="Password"
            onChange={handleChange}
            value={values.password}
            helperText="Must be at least 8 characters, 1 lowercase, 1 uppercase, 1 number, and 1 special character (e.g: !@#$%^&*)"
            errorText={touched.password && errors.password}
          />
        </div>

        <div className="col-span-full">
          <PasswordField
            required
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            onChange={handleChange}
            value={values.confirmPassword}
            errorText={touched.confirmPassword && errors.confirmPassword}
          />
        </div>

        <div className="col-span-full">
          <Button type="submit" className="w-full" loading={isLoading}>
            Let&#39;s start
          </Button>
        </div>
      </form>

      {/* Warning before create new account */}
      <AlertModal
        open={isWarningModalOpen}
        icon="warning"
        title="Warning"
        message="Please perform all setup steps and do not close the browser to ensure data integrity and prevent errors during the installation process."
        confirmButtonText="OK"
        onConfirm={handleConfirm}
      />

      {/* Error when has error occurred */}
      <AlertModal
        open={isErrorModalOpen}
        icon="error"
        title="An error occurred"
        message="An unexpected error occurred. Please try again. If the problem continues, please double-check your environment settings such as the API URL, token, and database configuration."
        onClose={handleErrorClose}
        confirmButtonText="Retry"
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default NewAccountForm;
